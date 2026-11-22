/**
 * ============================================================================
 * KOMPONEN: LaporanAudit (Rekapitulasi Audit & Berita Acara Pekerjaan Lapangan)
 * ============================================================================
 * Penjelasan Fungsi Operasional Manajemen STO Telkom Akses:
 * Komponen ini digunakan oleh Pimpinan STO untuk mengawasi seluruh riwayat penugasan:
 * 1. Melihat status pekerjaan apakah masih Open, Progress, atau Done.
 * 2. Mengetahui teknisi yang menangani dan waktu penyelesaian.
 * 3. Memverifikasi parameter teknis Telkom Akses: ODP ID, Redaman dBm (sinyal optik), dan SN Modem ONT.
 * 4. Melihat rekonsiliasi material real yang berstatus TERPASANG DI PELANGGAN.
 * 5. Membuka dan mencetak Dokumen BASTP (Berita Acara Serah Terima Pekerjaan).
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileText,
  Search,
  CheckCircle2,
  Radio,
  Package,
  Eye,
  MapPin,
  Phone,
  Camera,
  Clock,
  User,
  Wrench,
  AlertCircle
} from 'lucide-react';
import ModalBASTP from './ModalBASTP';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { parseTaskDetails, formatWaktuBuat } from '../utils/taskFormatter';

function LaporanAudit({ hideHeader = false }) {
  const { isDark } = useTheme();
  const { tugas, permohonan, detailPermohonan, barang, users, odp = [] } = useApp();

  const [search, setSearch] = useState('');
  const [selectedBastpTask, setSelectedBastpTask] = useState(null);

  // Menggabungkan data tugas dengan relasi teknisi, pimpinan, dan material gudang
  const laporanList = useMemo(() => {
    return tugas.map((task) => {
      const tech = users.find((u) => Number(u.id) === Number(task.teknisi_id));
      const pimpinan = users.find((u) => Number(u.id) === Number(task.pimpinan_id));

      // Cari material yang dirilis dari permohonan untuk tugas ini (mendukung single & batch tiket)
      const taskReqs = permohonan.filter(p =>
        (Number(p.tugas_id) === Number(task.id) || (Array.isArray(p.tugas_ids) && p.tugas_ids.map(Number).includes(Number(task.id)))) &&
        p.status === 'Released'
      );
      const materialList = [];

      taskReqs.forEach(req => {
        const details = detailPermohonan.filter(d => Number(d.permohonan_id) === Number(req.id));
        details.forEach(d => {
          const item = barang.find(b => Number(b.id) === Number(d.barang_id));
          if (item) {
            materialList.push({
              nama_barang: item.nama_barang,
              jumlah: d.jumlah_minta,
              satuan: item.satuan
            });
          }
        });
      });

      return {
        ...task,
        teknisi: tech,
        pimpinan: pimpinan,
        materials: materialList
      };
    });
  }, [tugas, permohonan, detailPermohonan, barang, users]);

  // Filter pencarian berdasarkan ID tiket, nama pelanggan, atau lokasi
  const filtered = laporanList.filter((item) => {
    return (
      item.pelanggan_nama?.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasi?.toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).includes(search)
    );
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <div className="w-full min-w-0 space-y-4 animate-in fade-in duration-300">
      {/* Header Halaman (Hanya tampil jika bukan di dalam tab terintegrasi) */}
      {!hideHeader && (
        <div className="pb-4 border-b border-slate-200 dark:border-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-500/30 shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Laporan Kerja Lapangan
            </h1>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-950/50 hover:shadow-rose-900/40 transition cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Seluruh Rekap (Print)</span>
          </button>
        </div>
      )}

      {/* Input Pencarian */}
      <div className="no-print relative max-w-sm w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari ID tiket, pelanggan, atau lokasi..."
          className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl text-xs border outline-none transition bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-rose-950/40 text-slate-900 dark:text-white placeholder-slate-400 focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30"
        />
      </div>

      {/* Daftar Kartu Laporan Audit */}
      <div className="space-y-4 w-full min-w-0">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-rose-950/40 text-center text-slate-500 dark:text-slate-400 text-xs italic">
            Tidak ada riwayat pekerjaan lapangan yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filtered.map((item) => {
            const isDone = item.status === 'Done';
            const isProgress = item.status === 'Progress';
            const cust = parseTaskDetails(item);

            // Parameter Teknis dengan fallback aman (crash-proof untuk integer/null/string)
            const matchedOdp = (odp || []).find((o) => Number(o.id) === Number(item.odp_id));
            const rawOdpCode =
              matchedOdp?.kode_odp ||
              matchedOdp?.nama_odp ||
              item.odp_kode ||
              (item.odp_id ? (isNaN(item.odp_id) ? item.odp_id : `ODP #${item.odp_id}`) : '') ||
              item.bastp?.odp_id ||
              '';
            const rawOdp = String(rawOdpCode || '').trim();

            const rawPortStr = String(item.port_odp ?? item.bastp?.port_odp ?? '').trim();
            let odpDisplay = '-';
            if (rawOdp) {
              odpDisplay = rawPortStr ? `${rawOdp} (P.${rawPortStr})` : rawOdp;
            }

            const rawDbm = item.redaman_dbm ?? item.bastp?.redaman_dbm ?? item.redaman ?? null;
            let dbmDisplay = '-';
            if (rawDbm !== null && rawDbm !== undefined) {
              const strDbm = String(rawDbm).trim();
              if (strDbm !== '' && strDbm !== '-') {
                const cleanDbm = strDbm.replace(/dbm/i, '').trim();
                dbmDisplay = `${cleanDbm} dBm`;
              }
            }

            const rawSn = String(item.sn_ont || item.bastp?.sn_ont || item.sn_modem || '').trim();
            const snDisplay = rawSn || '-';

            const jenisKerjaLower = String(item.jenis_kerja || '').toLowerCase();
            const isModemRelevant =
              jenisKerjaLower.includes('pasang') ||
              jenisKerjaLower.includes('psb') ||
              jenisKerjaLower.includes('modem') ||
              jenisKerjaLower.includes('ont');

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-950/70 backdrop-blur-xl border border-slate-200 dark:border-rose-950/40 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-rose-300 dark:hover:border-rose-800/40 transition-all duration-300 space-y-4 w-full min-w-0 overflow-hidden"
              >
                {/* Header Kartu: Judul, Badges & Aksi */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-3.5 border-b border-slate-200 dark:border-white/5 gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Baris Badges: ID, Jenis Kerja, BASTP Terbit, Status (Wrap Rapi Bebas Cut-Off) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-mono font-black text-rose-500 text-xs sm:text-sm tracking-wider whitespace-nowrap">
                        TGS-{String(item.id).padStart(3, '0')}
                      </span>
                      <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl whitespace-nowrap inline-flex items-center border tracking-wide ${
                        item.jenis_kerja === 'Pasang Baru'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                          : item.jenis_kerja === 'Gangguan'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
                      }`}>
                        {item.jenis_kerja || 'Pekerjaan STO'}
                      </span>
                      {isDone && (
                        <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-600/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                          ✓ BASTP Terbit
                        </span>
                      )}
                      <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${
                        isDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : isProgress
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      }`}>
                        ● {item.status || 'Open'}
                      </span>
                    </div>

                    {/* Baris Nama Pelanggan */}
                    <div className="text-slate-900 dark:text-white font-extrabold text-base tracking-wide truncate">
                      {cust.name}
                    </div>

                    {/* Baris Alamat & No Telp (Bebas Duplikasi & Tanpa Teks Kuning Redundan) */}
                    <div className="flex items-center gap-3 flex-wrap text-xs pt-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate max-w-xs sm:max-w-md" title={cust.address}>
                          {cust.address}
                        </span>
                      </div>
                      {cust.telp && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          <span>{cust.telp}</span>
                        </div>
                      )}
                    </div>

                    {/* Baris Meta Teknisi & Waktu Buat */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Teknisi: <strong className="text-slate-700 dark:text-slate-200">{item.teknisi?.nama_lengkap || 'Belum Diambil (Pool)'}</strong></span>
                      </span>
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Waktu Buat: <strong className="text-slate-600 dark:text-slate-300 font-mono">{formatWaktuBuat(item)}</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* Tombol Lihat BASTP */}
                  {isDone && (
                    <div className="pt-1 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedBastpTask(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer whitespace-nowrap"
                        title="Buka Dokumen Resmi BASTP"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat BASTP</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bagian Bawah: Rincian Teknis & Rekonsiliasi Material */}
                {!isDone ? (
                  /* Compact Layout untuk Tiket In-Progress / Open */
                  item.materials?.length > 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 backdrop-blur-sm text-[11px] flex items-center gap-2 w-full min-w-0 overflow-hidden">
                      <Package className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Material Alokasi Gudang:</span>
                      <span className="text-amber-700 dark:text-amber-300 font-medium truncate min-w-0 flex-1">
                        {item.materials.map(m => `${m.nama_barang} (${m.jumlah} ${m.satuan})`).join(', ')}
                      </span>
                    </div>
                  ) : null
                ) : (
                  /* Grid 3-Kolom Rincian Teknis, Material, & Dokumentasi (Hanya saat Done) */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-xs">
                    {/* Kolom 1: Parameter Teknis (Cyan Accent) */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-200 rounded-xl p-3.5 backdrop-blur-sm space-y-2 w-full min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        <Radio className="w-3.5 h-3.5 shrink-0" />
                        <span>Parameter Teknis:</span>
                      </div>
                      <div className="text-[11px] space-y-1.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">ODP / Port:</span>
                          <strong className="font-mono text-slate-800 dark:text-slate-200 text-right truncate">{odpDisplay}</strong>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">Redaman Optik:</span>
                          <strong className={`font-mono text-right ${dbmDisplay !== '-' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {dbmDisplay}
                          </strong>
                        </div>
                        {(isModemRelevant || rawSn) && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400">SN ONT Modem:</span>
                            <strong className={`font-mono text-right truncate ${snDisplay !== '-' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                              {snDisplay}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Kolom 2: Rekonsiliasi Material (Amber Accent) */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-200 rounded-xl p-3.5 backdrop-blur-sm space-y-2 w-full min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <Package className="w-3.5 h-3.5 shrink-0" />
                        <span>Rekonsiliasi Material:</span>
                      </div>
                      {item.materials?.length > 0 ? (
                        <ul className="space-y-1 text-[11px]">
                          {item.materials.map((m, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-1 min-w-0">
                              <span className="truncate text-slate-700 dark:text-slate-300 min-w-0 flex-1">• {m.nama_barang}</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap ml-1 shrink-0">
                                {m.jumlah} {m.satuan}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">
                          Tidak ada pengeluaran material khusus
                        </p>
                      )}
                      <div className="pt-1.5 border-t border-slate-200 dark:border-white/5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 min-w-0">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">Status: TERPASANG DI PELANGGAN</span>
                      </div>
                    </div>

                    {/* Kolom 3: Foto Dokumentasi Lapangan (Emerald Accent) */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-200 rounded-xl p-3.5 backdrop-blur-sm flex flex-col justify-between w-full min-w-0">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                          <Camera className="w-3.5 h-3.5 shrink-0" />
                          <span>Dokumentasi Lapangan:</span>
                        </div>
                        {item.foto_bukti ? (
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.foto_bukti}
                              alt="Foto Bukti"
                              className="w-14 h-14 object-cover rounded-xl border border-rose-200 dark:border-rose-950/60 shadow-md cursor-pointer hover:scale-105 transition-transform shrink-0"
                              onClick={() => setSelectedBastpTask(item)}
                            />
                            <div className="text-[11px] space-y-0.5 min-w-0 flex-1">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 truncate">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Terverifikasi BASTP</span>
                              </span>
                              {item.waktu_selesai && (
                                <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] block truncate">{item.waktu_selesai}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 italic text-[11px]">Pekerjaan belum selesai diunggah.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal BASTP Digital */}
      {selectedBastpTask && (
        <ModalBASTP
          task={selectedBastpTask}
          onClose={() => setSelectedBastpTask(null)}
        />
      )}
    </div>
  );
}

export default LaporanAudit;
