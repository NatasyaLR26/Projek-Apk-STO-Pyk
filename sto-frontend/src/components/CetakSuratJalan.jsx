import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Printer, FileCheck, Clock } from 'lucide-react';
import { parseTaskDetails, formatDateId } from '../utils/taskFormatter';

export default function CetakSuratJalan({ initialRequestId = null }) {
  const { isDark } = useTheme();
  const { permohonan, detailPermohonan, barang, tugas, users } = useApp();

  // Permohonan yang valid untuk dicetak: Released (sudah keluar) atau Approved (siap disiapkan/dirilis)
  const validRequests = useMemo(() => {
    return permohonan.filter(p => p.status === 'Released' || p.status === 'Approved');
  }, [permohonan]);

  const [selectedReqId, setSelectedReqId] = useState(() => initialRequestId ?? validRequests[0]?.id ?? null);

  useEffect(() => {
    if (initialRequestId !== null && initialRequestId !== undefined) {
      setSelectedReqId(initialRequestId);
    }
  }, [initialRequestId]);

  const activeRequest = useMemo(() => {
    if (selectedReqId === null || selectedReqId === undefined || selectedReqId === '') {
      return validRequests[0] || null;
    }
    const numId = Number(selectedReqId);
    // 1. Cocokkan berdasarkan ID Permohonan
    const byPerm = permohonan.find(p => Number(p.id) === numId);
    if (byPerm) return byPerm;

    // 2. Cocokkan berdasarkan ID Tugas / Tiket (jika caller meneruskan ticket ID)
    const byTask = permohonan.find(p =>
      Number(p.tugas_id) === numId ||
      (Array.isArray(p.tugas_ids) && p.tugas_ids.map(Number).includes(numId))
    );
    if (byTask) return byTask;

    return validRequests[0] || null;
  }, [selectedReqId, permohonan, validRequests]);

  const taskIds = Array.isArray(activeRequest?.tugas_ids) && activeRequest.tugas_ids.length > 0
    ? activeRequest.tugas_ids.map(Number)
    : (activeRequest?.tugas_id ? [Number(activeRequest.tugas_id)] : []);
  const parentTasks = tugas.filter(t => taskIds.includes(Number(t.id)));
  const activeTask = parentTasks[0] || tugas.find(t => Number(t.id) === Number(activeRequest?.tugas_id));
  const activeTech = users.find(u => Number(u.id) === Number(activeTask?.teknisi_id || activeRequest?.teknisi_id)) || {
    nama_lengkap: activeRequest?.teknisi_nama || 'Teknisi Lapangan',
    id: activeRequest?.teknisi_id || 2
  };
  const isBatch = Array.isArray(activeRequest?.tugas_ids) && activeRequest.tugas_ids.length > 1;

  const requestDetails = detailPermohonan
    .filter(d => Number(d.permohonan_id) === Number(activeRequest?.id))
    .map(d => {
      const item = barang.find(b => Number(b.id) === Number(d.barang_id));
      return { ...d, item };
    });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    if (typeof document !== 'undefined') {
      document.body.classList.add('sj-print-mode');
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      if (typeof document !== 'undefined') {
        document.body.classList.remove('sj-print-mode');
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className={`no-print p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-500/30">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cetak Surat Jalan &amp; Bukti Serah Terima Material</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2.5">
          <select
            value={activeRequest?.id ? String(activeRequest.id) : ''}
            onChange={(e) => setSelectedReqId(e.target.value)}
            className={`w-full sm:w-auto text-xs px-3 py-2.5 rounded-xl border font-semibold ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none`}
          >
            {validRequests.map(req => {
              const isReqBatch = Array.isArray(req.tugas_ids) && req.tugas_ids.length > 1;
              const reqTasks = isReqBatch
                ? tugas.filter(t => req.tugas_ids.map(Number).includes(Number(t.id)))
                : [tugas.find(t => Number(t.id) === Number(req.tugas_id))].filter(Boolean);
              const primaryTask = reqTasks[0];
              const custInfo = parseTaskDetails(primaryTask);
              const formattedDate = formatDateId(req.waktu_rilis || req.waktu_request);
              const statusLabel = req.status === 'Approved' ? 'Siap Rilis' : 'Diserahkan';
              return (
                <option key={req.id} value={String(req.id)}>
                  {isReqBatch
                    ? `SJ #${req.id} • Batch ${req.tugas_ids.length} Tiket – ${custInfo.name} dkk (${formattedDate}) [${statusLabel}]`
                    : `SJ #${req.id} • Tiket #${req.tugas_id || primaryTask?.id || '-'} – ${custInfo.name} (${formattedDate}) [${statusLabel}]`}
                </option>
              );
            })}
          </select>

          <button
            onClick={handlePrint}
            disabled={!activeRequest}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy-600 hover:bg-burgundy-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-burgundy-600/30 transition cursor-pointer active:scale-95 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Surat Jalan (PDF)</span>
          </button>
        </div>
      </div>

      {/* Official Printable Sheet */}
      {activeRequest ? (
        <div className={`printable-sj-sheet p-4 sm:p-8 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl print-card`}>
          
          {/* Header */}
          <div className="border-b-2 border-burgundy-600 pb-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-burgundy-600 flex items-center justify-center text-white font-black text-xl shadow-lg border border-burgundy-400 shrink-0">
                TA
              </div>
              <div>
                <h1 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} print-text-dark tracking-wide`}>
                  PT TELKOM AKSES - LOGISTIK &amp; WAREHOUSE
                </h1>
                <div className="text-[11px] font-bold text-burgundy-600 dark:text-burgundy-500">GUDANG MATERIAL STO PAYAKUMBUH - KOTO NAN IV</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 print-text-dark">Jl. Soekarno Hatta No. 12, Koto Nan IV, Payakumbuh Barat | Gudang Lt. 1</p>
              </div>
            </div>

            <div className="text-left md:text-right text-xs text-slate-500 dark:text-slate-400 print-text-dark font-mono flex flex-col gap-0.5 mt-2 md:mt-0">
              <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'} print-text-dark`}>
                SJ: SJ-GDG/{new Date().getFullYear()}/{String(activeRequest.id).padStart(5, '0')}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 print-text-dark">
                Tanggal Pengeluaran: {formatDateId(activeRequest.waktu_rilis || activeRequest.waktu_request)}
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} print-text-dark uppercase tracking-wide`}>
              SURAT BUKTI PENGELUARAN &amp; SERAH TERIMA BARANG (SURAT JALAN)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 print-text-dark">
              Verifikasi Pengeluaran Material Resmi Gudang Logistik
            </p>
          </div>

          {/* Details */}
          {(() => {
            return (
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-800'} print-table mb-6 text-xs print-text-dark`}>
                <div className="space-y-1.5">
                  <div>
                    <strong className="text-slate-400">Nomor Tiket:</strong>{' '}
                    {isBatch ? `Batch (${activeRequest.tugas_ids.map(id => `#${id}`).join(', ')})` : `#${activeTask?.id || activeRequest.tugas_id}`}
                  </div>
                  <div>
                    <strong className="text-slate-400">Jenis Pekerjaan:</strong>{' '}
                    {activeTask?.jenis_kerja || 'Pemasangan Baru (PSB)'} {isBatch ? '(Borongan Multi-Pelanggan)' : ''}
                  </div>
                  <div>
                    <strong className="text-slate-400">Status Dokumen:</strong>{' '}
                    <span className={activeRequest.status === 'Approved' ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                      {activeRequest.status === 'Approved' ? 'Disetujui Pimpinan (Persiapan Rilis Gudang)' : 'Telah Diserahkan (Released)'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-400">Nama Pelanggan:</strong>{' '}
                    {isBatch
                      ? parentTasks.map(t => parseTaskDetails(t).name).filter(Boolean).join(', ')
                      : `${parseTaskDetails(activeTask).name} ${parseTaskDetails(activeTask).telp ? `(${parseTaskDetails(activeTask).telp})` : ''}`}
                  </div>
                  <div>
                    <strong className="text-slate-400">Alamat Instalasi:</strong>{' '}
                    {isBatch
                      ? parentTasks.map(t => `#${t.id}: ${parseTaskDetails(t).address}`).join(' | ')
                      : parseTaskDetails(activeTask).address}
                  </div>
                </div>
                <div className="space-y-1.5 text-left sm:text-right">
                  <div><strong className="text-slate-400">Teknisi Pengambil:</strong> {activeTech?.nama_lengkap || 'Teknisi Lapangan'}</div>
                  <div><strong className="text-slate-400">Petugas Logistik:</strong> Siti Rahmawati</div>
                </div>
              </div>
            );
          })()}

          {/* Items Table */}
          <div className="overflow-x-auto w-full mb-8 custom-scrollbar">
            <table className={`w-full min-w-[560px] text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'} print-table`}>
              <thead className={`${isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'} uppercase text-[10px] tracking-wider border-b`}>
                <tr>
                  <th className="px-3 py-2.5 text-center w-12">No</th>
                  <th className="px-3 py-2.5 w-28">Kode Barang</th>
                  <th className="px-3 py-2.5 min-w-[220px]">Nama Material &amp; Kategori</th>
                  <th className="px-3 py-2.5 text-center w-20">Satuan</th>
                  <th className="px-3 py-2.5 text-right w-32 whitespace-nowrap">Jumlah Diserahkan</th>
                  <th className="px-3 py-2.5 text-center w-28 whitespace-nowrap">Kondisi Fisik</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {requestDetails.map((detail, idx) => {
                  const itemName = (detail.item?.nama_barang || '').toLowerCase();
                  const itemKat = (detail.item?.kategori || '').toLowerCase();
                  const isOntOrModem = itemName.includes('ont') || itemName.includes('modem') || itemKat.includes('ont');
                  const isStb = itemName.includes('stb') || itemName.includes('set top box');

                  let ontSn = null;
                  if (isOntOrModem) {
                    if (isBatch && parentTasks.length > 0) {
                      const snList = parentTasks.map(t => {
                        const s = (activeRequest?.sn_allocations && (typeof activeRequest.sn_allocations[t.id] === 'object' ? activeRequest.sn_allocations[t.id]?.sn : activeRequest.sn_allocations[t.id])) ||
                          t.assigned_sn_ont || t.sn_ont || t.bastp?.sn_ont;
                        return s ? `#${t.id}: ${s}` : null;
                      }).filter(Boolean);
                      ontSn = snList.length > 0 ? snList.join(', ') : (activeRequest?.status === 'Approved' ? 'Alokasi saat serah terima fisik di gudang' : 'Belum tercatat');
                    } else {
                      ontSn = activeTask?.assigned_sn_ont || activeTask?.sn_ont || activeTask?.bastp?.sn_ont ||
                        (activeRequest?.sn_allocations && (typeof activeRequest.sn_allocations[activeTask?.id] === 'object' ? activeRequest.sn_allocations[activeTask?.id]?.sn : activeRequest.sn_allocations[activeTask?.id])) ||
                        activeRequest?.sn_ont ||
                        (activeRequest?.status === 'Approved' ? 'Alokasi saat serah terima fisik di gudang' : 'Belum tercatat');
                    }
                  }

                  return (
                    <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2.5 text-center font-mono">{idx + 1}</td>
                      <td className={`px-3 py-2.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {detail.item?.kode || `MAT-0${detail.barang_id}`}
                      </td>
                      <td className={`px-3 py-2.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'} print-text-dark`}>
                        <div>{detail.item?.nama_barang}</div>
                        {isOntOrModem && (
                          <div className="font-mono text-xs text-rose-400 dark:text-rose-300 font-semibold print-text-dark mt-0.5">
                            SN: {ontSn}
                          </div>
                        )}
                        {isStb && (
                          <div className="font-mono text-xs text-rose-400 dark:text-rose-300 font-semibold print-text-dark mt-0.5">
                            SN: {activeTask?.sn_stb || 'STB4K-PYK-8801'}
                          </div>
                        )}
                        <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-normal mt-0.5`}>
                          {detail.item?.kategori}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{detail.item?.satuan}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 print-text-dark text-sm">{detail.jumlah_minta}</td>
                      <td className="px-3 py-2.5 text-center text-emerald-600 dark:text-emerald-500 font-semibold text-[10px] whitespace-nowrap">
                        BAIK / BARU
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className={`pt-6 border-t ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} grid grid-cols-2 gap-8 text-center text-xs print-text-dark`}>
            <div>
              <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'} print-text-dark`}>Diserahkan Oleh (Petugas Gudang),</p>
              <div className="h-20 flex items-center justify-center">
                <span className="text-slate-500 italic text-[11px] print-text-dark">( Tanda Tangan &amp; Cap Gudang )</span>
              </div>
              <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} print-text-dark underline`}>Siti Rahmawati</p>
              <p className="text-[10px]">Staff Gudang &amp; Logistik STO</p>
            </div>

            <div>
              <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'} print-text-dark`}>Diterima Lengkap Oleh (Teknisi Lapangan),</p>
              <div className="h-20 flex items-center justify-center">
                <span className="text-slate-500 italic text-[11px] print-text-dark">( Tanda Tangan Penerima )</span>
              </div>
              <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} print-text-dark underline`}>{activeTech?.nama_lengkap || 'Ahmad Fadli'}</p>
              <p className="text-[10px]">NIK: TA-{activeTech?.id || 2}9821</p>
            </div>
          </div>

        </div>
      ) : (
        <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <Clock className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Belum Ada Pengeluaran Barang (Surat Jalan)</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Surat jalan akan otomatis terbuat saat petugas gudang menekan tombol "Rilis Barang &amp; Potong Stok" pada antrean Output Barang.</p>
        </div>
      )}
    </div>
  );
}
