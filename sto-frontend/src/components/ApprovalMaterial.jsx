import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  MapPin,
  Package
} from 'lucide-react';
import { parseTaskDetails } from '../utils/taskFormatter';

function ApprovalMaterial({ hideHeader = false }) {
  const { isDark } = useTheme();
  const {
    permohonan,
    tugas,
    barang,
    detailPermohonan,
    users,
    approveMaterial,
    rejectMaterial
  } = useApp();

  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // 1. Build enriched pending list reactively with useMemo
  const permohonanList = useMemo(() => {
    return permohonan.filter(p => String(p.status || '').toLowerCase() === 'pending').map(p => {
      const parentTask = tugas.find(t => Number(t.id) === Number(p.tugas_id));
      const tech = users.find(u => Number(u.id) === Number(parentTask?.teknisi_id));
      const details = detailPermohonan.filter(d => Number(d.permohonan_id) === Number(p.id)).map(d => {
        const item = barang.find(b => Number(b.id) === Number(d.barang_id));
        return {
          ...d,
          nama_barang: item?.nama_barang || `Barang #${d.barang_id}`,
          satuan: item?.satuan || 'pcs'
        };
      });

      return {
        ...p,
        parentTask,
        tech,
        details
      };
    });
  }, [permohonan, tugas, detailPermohonan, barang, users]);

  const handleApprove = async (id) => {
    if (processingId) return;
    setProcessingId(id);
    setPesan('');
    setError('');

    try {
      await approveMaterial(id);
      setPesan(`Permohonan #${id} berhasil disetujui server & diteruskan ke Gudang.`);
    } catch (err) {
      setError(err?.message || 'Gagal menyetujui permohonan material');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (processingId) return;
    setProcessingId(id);
    setPesan('');
    setError('');

    try {
      await rejectMaterial(id);
      setPesan(`Permohonan #${id} berhasil ditolak.`);
    } catch (err) {
      setError(err?.message || 'Gagal menolak permohonan material');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 animate-in fade-in duration-300">
      {!hideHeader && (
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>Persetujuan Material Teknisi</span>
            </h1>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 self-start sm:self-auto">
            {permohonanList.length} Menunggu Otorisasi
          </span>
        </div>
      )}

      {pesan && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{pesan}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {permohonanList.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center flex flex-col items-center justify-center ${
          isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
          <span className="text-xs font-bold text-slate-400">
            Tidak ada permohonan material yang pending saat ini. Semua telah disetujui.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
          {permohonanList.map((p) => {
            const cust = parseTaskDetails(p.parentTask);

            return (
              <div
                key={p.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-md flex flex-col justify-between w-full min-w-0 overflow-hidden ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40'
                    : 'bg-white border-slate-200 hover:border-amber-500/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-amber-500 font-mono">Permohonan #{p.id}</span>
                      <h3 className="font-bold text-sm mt-0.5 truncate text-slate-100">
                        Tiket #{p.tugas_id} — {p.parentTask?.jenis_kerja || 'Pekerjaan STO'}
                      </h3>
                      <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Diajukan oleh: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{p.tech?.nama_lengkap || 'Teknisi Lapangan'}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                      {p.status}
                    </span>
                  </div>

                  {/* Info Pelanggan & Lokasi Pekerjaan (Terstruktur & Bebas Leaks) */}
                  <div className={`p-3 rounded-xl border text-xs mb-3 space-y-1.5 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pelanggan &amp; Lokasi Pekerjaan:
                    </div>
                    <div className="font-semibold text-slate-100 text-xs flex items-center gap-1.5 flex-wrap">
                      <span>{cust.name}</span>
                      {cust.telp && (
                        <span className="text-[11px] text-slate-400 font-mono font-normal">
                          • {cust.telp}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 flex items-start gap-1.5 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="break-words">{cust.address}</span>
                    </div>
                    {p.catatan_teknisi && (
                      <div className="text-[11px] text-slate-400 italic pt-1.5 border-t border-slate-200 dark:border-slate-800/80 break-words">
                        "{p.catatan_teknisi}"
                      </div>
                    )}
                  </div>

                  {/* Rincian Barang Diminta */}
                  <div className="mb-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-500/80" />
                      <span>Rincian Barang Diminta:</span>
                    </div>
                    <div className="space-y-1.5">
                      {p.details?.map((d) => (
                        <div
                          key={d.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
                          }`}
                        >
                          <span className="font-medium truncate">• {d.nama_barang}</span>
                          <span className="font-extrabold text-amber-500 whitespace-nowrap ml-2">
                            {d.jumlah_minta} {d.satuan}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: 2 Kolom Seimbang di Mobile & Desktop */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleApprove(p.id)}
                    disabled={processingId === p.id}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-950/30 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{processingId === p.id ? 'Memproses...' : 'Setujui'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(p.id)}
                    disabled={processingId === p.id}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                      isDark
                        ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-500/30 hover:border-rose-400'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Tolak</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApprovalMaterial;