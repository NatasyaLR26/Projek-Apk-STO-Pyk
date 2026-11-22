import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  FileText,
  Barcode,
  Send,
  Boxes,
  Eye,
  Check,
  MapPin,
  Clock,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { parseTaskDetails } from '../../utils/taskFormatter';

export default function TabelPermohonanGudang({ onNavigateToSuratJalan }) {
  const { isDark } = useTheme();
  const {
    barang = [],
    permohonan = [],
    detailPermohonan = [],
    tugas = [],
    users = [],
    releaseMaterial,
    showToast
  } = useApp();

  const [snOntInputs, setSnOntInputs] = useState({});
  const [batchSnInputs, setBatchSnInputs] = useState({});
  const [batchModelInputs, setBatchModelInputs] = useState({});
  const [releasingId, setReleasingId] = useState(null);

  // Daftar SN ONT yang ready/tersedia di gudang dari stok inventaris
  const availableOntSerials = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sto_ont_serials') || '[]');
      const ready = stored.filter(s => s.status === 'Tersedia' || s.status === 'Di Gudang');
      if (ready.length > 0) return ready;
    } catch {}
    return [
      { sn: 'ZTEGC8B90201', model: 'Modem ONT ZTE F670L Dual Band' },
      { sn: 'ZTEGC8B90202', model: 'Modem ONT ZTE F670L Dual Band' },
      { sn: 'ZTEGC8B90203', model: 'Modem ONT ZTE F670L Dual Band' },
      { sn: 'ZTEGC8B90204', model: 'Modem ONT ZTE F670L Dual Band' },
      { sn: 'HWTC8B90205', model: 'Modem ONT Huawei HG8245H5' }
    ];
  }, []);

  // Permohonan material masuk dari teknisi yang siap diserahkan oleh petugas gudang
  const approvedRequests = useMemo(() => {
    return permohonan
      .filter(p => p.status !== 'Released' && p.status !== 'Rejected' && p.status !== 'Batal')
      .map(p => {
        const parentTask = tugas.find(t => Number(t.id) === Number(p.tugas_id) || (Array.isArray(p.tugas_ids) && p.tugas_ids.map(Number).includes(Number(t.id))));
        const tech = users.find(u => Number(u.id) === Number(parentTask?.teknisi_id || p.teknisi_id)) || { nama_lengkap: p.teknisi_nama || 'Teknisi Lapangan' };
        const details = detailPermohonan
          .filter(d => Number(d.permohonan_id) === Number(p.id))
          .map(d => {
            const item = barang.find(b => Number(b.id) === Number(d.barang_id));
            return {
              ...d,
              item,
              isStockEnough: item ? Number(item.stok) >= Number(d.jumlah_minta) : false
            };
          });

        const isStockEnough = details.length > 0 ? details.every(d => d.isStockEnough) : true;
        const isApproved = p.status === 'Approved';
        const canRelease = isApproved && isStockEnough;

        return {
          ...p,
          parentTask,
          tech,
          details,
          isStockEnough,
          isApproved,
          canRelease
        };
      });
  }, [permohonan, tugas, users, detailPermohonan, barang]);

  // Otomatis salin/isi Serial Number ONT dari stok gudang yang ready
  useEffect(() => {
    let serialIdx = 0;
    const newSingleInputs = { ...snOntInputs };
    const newBatchInputs = { ...batchSnInputs };
    let hasChanges = false;

    approvedRequests.forEach((req) => {
      const isBatch = req.is_batch || (req.tugas_ids && req.tugas_ids.length > 1);
      const hasOnt = req.details.some(d => d.item?.nama_barang?.toLowerCase().includes('ont') || d.item?.nama_barang?.toLowerCase().includes('modem'));
      
      if (!hasOnt) return;

      if (isBatch && req.tugas_ids) {
        req.tugas_ids.forEach(tid => {
          const key = `${req.id}_${tid}`;
          if (!newBatchInputs[key]) {
            const pick = availableOntSerials[serialIdx % availableOntSerials.length];
            newBatchInputs[key] = pick?.sn || `ZTEGC8B902${String(serialIdx + 1).padStart(2, '0')}`;
            serialIdx++;
            hasChanges = true;
          }
        });
      } else {
        if (!newSingleInputs[req.id]) {
          const pick = availableOntSerials[serialIdx % availableOntSerials.length];
          newSingleInputs[req.id] = pick?.sn || `ZTEGC8B902${String(serialIdx + 1).padStart(2, '0')}`;
          serialIdx++;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setSnOntInputs(newSingleInputs);
      setBatchSnInputs(newBatchInputs);
    }
  }, [approvedRequests, availableOntSerials]);

  const handleRelease = async (reqId) => {
    if (releasingId) return;

    try {
      const target = permohonan.find(p => Number(p.id) === Number(reqId));
      if (!target || target.status === 'Released') return;

      if (target.status !== 'Approved') {
        showToast('Permohonan belum disetujui Pimpinan.', 'error');
        return;
      }

      setReleasingId(reqId);

      const isBatch = target?.is_batch || (target?.tugas_ids && target.tugas_ids.length > 1);

      if (isBatch && target.tugas_ids && target.tugas_ids.length > 0) {
        const allocations = {};
        target.tugas_ids.forEach(tid => {
          const key = `${reqId}_${tid}`;
          const sn = batchSnInputs[key] || '';
          const model = batchModelInputs[key] || 'Modem ONT ZTE F670L Dual Band';
          allocations[tid] = { sn, model };
        });
        await releaseMaterial(reqId, allocations);
      } else {
        const sn = snOntInputs[reqId] || null;
        await releaseMaterial(reqId, sn);
      }
      showToast('Barang berhasil diserahkan ke teknisi! Status: Dalam Perjalanan.', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal merilis barang.', 'error');
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-end">
        <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
          {approvedRequests.length} Permohonan Aktif
        </span>
      </div>

      {approvedRequests.length === 0 ? (
        <div className={`${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border rounded-3xl p-12 text-center flex flex-col items-center justify-center`}>
          <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mb-3" />
          <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tidak ada antrean serah terima</div>
          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Semua permohonan material yang disetujui sudah dirilis ke teknisi.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {approvedRequests.map(req => {
            const cust = parseTaskDetails(req.parentTask);
            return (
            <div
              key={req.id}
              className={`${isDark ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200 shadow-md hover:border-amber-500/70'} border rounded-3xl p-5 flex flex-col justify-between transition min-h-full`}
            >
              <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm text-amber-500">Permohonan #{req.id}</span>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5`}>
                    Tiket #{req.tugas_id || (req.tugas_ids && req.tugas_ids.join(', #'))} - {req.parentTask?.jenis_kerja || 'Instalasi & Perbaikan'}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  req.status === 'Approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {req.status === 'Approved' ? 'Disetujui Pimpinan' : 'Permohonan Masuk'}
                </span>
              </div>

              {/* Info Pelanggan, Alamat, & Teknisi Bersih */}
              <div className={`text-xs ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} p-3.5 rounded-2xl border space-y-2`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400">Teknisi Pengambil: </span>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>{req.tech?.nama_lengkap || req.teknisi_nama}</strong>
                  </div>
                </div>

                <div className={`pt-2 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'} space-y-1`}>
                  {/* Baris 1: Nama Pelanggan • No. Telepon */}
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {cust.name} {cust.telp ? `• ${cust.telp}` : ''}
                  </div>
                  {/* Baris 2: Alamat / Wilayah pekerjaan */}
                  <div className="flex items-start gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{cust.address || 'Payakumbuh'}</span>
                  </div>
                </div>

                {req.catatan_teknisi && (
                  <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} italic pt-1`}>
                    "{req.catatan_teknisi}"
                  </div>
                )}
              </div>

              {/* Items to Release */}
              <div className="space-y-2">
                <div className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
                  Daftar Barang yang Diminta:
                </div>
                <div className="space-y-1.5">
                  {req.details.length === 0 ? (
                    <div className="text-slate-400 italic text-xs">Tidak ada item material terdata.</div>
                  ) : (
                    req.details.map(d => (
                      <div
                        key={d.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} text-xs border`}
                      >
                        <div>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{d.item?.nama_barang || 'Barang'}</span>
                          <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Stok Gudang: <span className={!d.isStockEnough ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>{d.item?.stok ?? '-'} {d.item?.satuan || 'pcs'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-500 text-sm">
                            {d.jumlah_minta} {d.item?.satuan || 'pcs'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Input SN ONT (Mendukung Batch Multi-Pelanggan & Tunggal) */}
              {(req.is_batch || (req.tugas_ids && req.tugas_ids.length > 1)) ? (
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-400 flex items-center gap-1.5">
                      <Barcode className="w-4 h-4" />
                      <span>Alokasi SN ONT per Pelanggan (Gudang Menentukan):</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      ⚡ Terisi Otomatis Dari Stok Ready
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(req.tugas_ids || [req.tugas_id]).map((tid) => {
                      const tsk = tugas.find((t) => Number(t.id) === Number(tid));
                      const tskCust = parseTaskDetails(tsk);
                      const key = `${req.id}_${tid}`;
                      return (
                        <div key={tid} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                            <span className="font-bold text-slate-200">
                              Tiket #{tid}: {tskCust.name} {tskCust.telp ? `• ${tskCust.telp}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[200px]">{tskCust.address}</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Scan Barcode / SN ONT..."
                              value={batchSnInputs[key] || ''}
                              onChange={(e) =>
                                setBatchSnInputs((prev) => ({
                                  ...prev,
                                  [key]: e.target.value.toUpperCase(),
                                }))
                              }
                              className="w-full p-2 rounded-lg border border-purple-600/40 bg-slate-900 text-white font-mono text-[11px] uppercase"
                            />
                            <select
                              value={batchModelInputs[key] || 'Modem ONT ZTE F670L Dual Band'}
                              onChange={(e) =>
                                setBatchModelInputs((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              className="p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-[11px] cursor-pointer"
                            >
                              <option value="Modem ONT ZTE F670L Dual Band">Modem ONT ZTE F670L Dual Band</option>
                              <option value="Modem ONT Huawei HG8245H5">Modem ONT Huawei HG8245H5</option>
                              <option value="Modem ONT FiberHome AN5506-04">Modem ONT FiberHome AN5506-04</option>
                              <option value="STB Android TV IndiHome 4K">STB Android TV IndiHome 4K</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                req.details.some(d => d.item?.nama_barang?.toLowerCase().includes('ont') || d.item?.nama_barang?.toLowerCase().includes('modem')) && (
                  <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-bold text-purple-400">Alokasi SN Modem ONT:</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        ⚡ Terisi Otomatis Dari Stok Ready
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Scan barcode dus ONT atau ketik SN (misal: ZTEGC8B90112)"
                      value={snOntInputs[req.id] || ''}
                      onChange={e => setSnOntInputs(prev => ({ ...prev, [req.id]: e.target.value.toUpperCase() }))}
                      className="w-full p-2.5 rounded-xl border border-purple-600/50 bg-slate-950 text-white font-mono text-xs uppercase"
                    />
                  </div>
                )
              )}

              </div>

              {/* Release Button & Optional Cetak Surat Jalan */}
              <div className="pt-4 mt-auto space-y-2 shrink-0">
                <button
                  onClick={() => handleRelease(req.id)}
                  disabled={!req.canRelease || releasingId !== null}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                    req.canRelease && releasingId === null
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950 active:scale-98 cursor-pointer'
                      : !req.isApproved
                      ? isDark
                        ? 'bg-amber-950/20 text-amber-400/90 border border-amber-500/30 cursor-not-allowed'
                        : 'bg-amber-50 text-amber-600 border border-amber-200 cursor-not-allowed'
                      : isDark
                      ? 'bg-rose-950/30 text-rose-400 border border-rose-500/40 cursor-not-allowed'
                      : 'bg-rose-50 text-rose-600 border border-rose-200 cursor-not-allowed'
                  }`}
                >
                  {releasingId === req.id ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Penyerahan Material...</span>
                    </>
                  ) : !req.isApproved ? (
                    <>
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Menunggu Otorisasi Pimpinan</span>
                    </>
                  ) : req.canRelease ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Serahkan Material ke Teknisi</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Stok Gudang Tidak Cukup</span>
                    </>
                  )}
                </button>

                {onNavigateToSuratJalan && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!req.isApproved) return;
                      onNavigateToSuratJalan(req);
                    }}
                    disabled={!req.isApproved}
                    title={!req.isApproved ? 'Dokumen belum sah dicetak sebelum ada otorisasi Pimpinan' : 'Cetak Surat Jalan & BAST'}
                    className={`w-full py-2 px-3 rounded-xl font-semibold text-xs border flex items-center justify-center gap-1.5 transition ${
                      req.isApproved
                        ? isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 cursor-pointer active:scale-98'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer active:scale-98'
                        : 'opacity-50 cursor-not-allowed bg-slate-800/50 text-slate-500 border-slate-700/50'
                    }`}
                  >
                    {!req.isApproved ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>Cetak Surat Jalan (BAST)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
