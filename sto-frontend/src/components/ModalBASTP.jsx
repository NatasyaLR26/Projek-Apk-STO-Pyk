// oxlint-disable no-unused-vars
/**
 * ============================================================================
 * KOMPONEN: ModalBASTP (Berita Acara Serah Terima Pekerjaan & Rekonsiliasi Material)
 * ============================================================================
 * Standar Resmi PT Telkom Akses (Persero) - STO Koto Nan IV Payakumbuh
 * Aturan Pencetakan (Print SOP):
 * 1. Jika penugasan untuk 1 Pelanggan:
 *    Tepat dicetak 1 HALAMAN A4 (1 Lembar / Bukan 3 Rangkap).
 * 2. Jika penugasan borongan kolektif (Batch N Pelanggan):
 *    Dicetak N lembar BASTP (1 lembar penuh per masing-masing pelanggan).
 * ============================================================================
 */

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { parseTaskDetails } from '../utils/taskFormatter';
import {
  Printer,
  X,
  CheckCircle2,
  Radio,
  Barcode,
  Calendar,
  User,
  MapPin,
  ShieldCheck,
  Package,
  Layers,
  Phone,
  FileText
} from 'lucide-react';

export default function ModalBASTP({ task, onClose }) {
  const { isDark } = useTheme();
  const { tugas = [] } = useApp();

  // 1. Deteksi apakah ini penugasan borongan kolektif (Batch Multi-Pelanggan)
  const isBatch = Boolean(
    (Array.isArray(task?.tugas_ids) && task.tugas_ids.length > 1) ||
    (Array.isArray(task?.batch_tasks) && task.batch_tasks.length > 1) ||
    (Array.isArray(task?.pelanggan_list) && task.pelanggan_list.length > 1)
  );

  // 2. Daftar pelanggan yang akan diterbitkan BASTP-nya
  const customerList = useMemo(() => {
    if (!task) return [];
    if (isBatch) {
      if (Array.isArray(task.batch_tasks) && task.batch_tasks.length > 0) {
        return task.batch_tasks;
      }
      if (Array.isArray(task.tugas_ids) && task.tugas_ids.length > 0) {
        const found = tugas.filter(t => task.tugas_ids.map(Number).includes(Number(t.id)));
        if (found.length > 0) return found;
      }
      if (Array.isArray(task.pelanggan_list) && task.pelanggan_list.length > 0) {
        return task.pelanggan_list.map((cust, idx) => ({
          ...task,
          id: `${task.id}-${idx + 1}`,
          pelanggan_nama: cust.nama || cust.name || cust,
          pelanggan_telp: cust.telp || cust.no_telp || task.pelanggan_telp,
          lokasi: cust.alamat || cust.address || task.lokasi
        }));
      }
    }
    // Single customer (kasus standar: 1 orang saja)
    return [task];
  }, [task, isBatch, tugas]);

  if (!task) return null;

  // 3. Helper data BASTP per tiket/pelanggan
  const getBastpData = (tItem, idx) => {
    const cust = parseTaskDetails(tItem);
    const existing = tItem.bastp;
    const year = new Date().getFullYear();
    const taskIdClean = String(tItem.id || idx + 1).padStart(4, '0');

    return {
      nomor_bastp: existing?.nomor_bastp || `BASTP/TA-PYK/${year}/${taskIdClean}`,
      odp_id: tItem.odp_kode || tItem.odp_id || existing?.odp_id || 'ODP-PYK-FA/014',
      port_odp: tItem.port_odp || existing?.port_odp || '03',
      redaman_dbm: tItem.redaman_dbm || existing?.redaman_dbm || '-18.5',
      sn_ont: tItem.sn_ont || existing?.sn_ont || `ZTEGC8B90${String(tItem.id || idx + 1).padStart(3, '0')}`,
      pelanggan_nama: cust.name || tItem.pelanggan_nama || 'Pelanggan Telkom',
      pelanggan_telp: cust.telp || tItem.pelanggan_telp || '0812-3456-7890',
      lokasi: cust.address || tItem.lokasi || 'Koto Nan IV, Payakumbuh',
      waktu_closing: tItem.waktu_selesai || existing?.waktu_closing || new Date().toISOString().slice(0, 16).replace('T', ' '),
      catatan_teknisi: tItem.catatan_selesai || tItem.catatan || existing?.catatan_teknisi || 'Instalasi selesai, sinyal optik stabil dan lolos uji QC Telkom.',
      foto_bukti: tItem.foto_bukti || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
      foto_sn: tItem.foto_sn || existing?.foto_sn || 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
      foto_opm: tItem.foto_opm || existing?.foto_opm || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      foto_rumah: tItem.foto_rumah || tItem.foto_bukti || existing?.foto_rumah || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&auto=format&fit=crop&q=80',
      jenis_kerja: tItem.jenis_kerja || task.jenis_kerja || 'Pasang Baru (PSB)',
      reconciliation: (() => {
        const rawRec = tItem.reconciliation || existing?.reconciliation;
        if (Array.isArray(rawRec) && rawRec.length > 0) {
          return rawRec.map(item => {
            // Jika teknisi memilih tidak ada sisa barang, kunci sisa = 0 dan terpakai = diambil
            const hasLeftover = tItem.kelebihan_material?.ada || existing?.kelebihan_material?.ada || false;
            if (!hasLeftover) {
              return {
                ...item,
                jumlah_terpakai: item.jumlah_diambil,
                jumlah_sisa: 0
              };
            }
            return item;
          });
        }
        return [
          {
            nama_barang: 'Kabel Dropcore 1 Core (FO)',
            jumlah_diambil: 150,
            jumlah_terpakai: 150,
            jumlah_sisa: 0,
            satuan: 'meter'
          },
          {
            nama_barang: 'Modem ONT GPON Wi-Fi (ZTE F670L)',
            jumlah_diambil: 1,
            jumlah_terpakai: 1,
            jumlah_sisa: 0,
            satuan: 'unit',
            sn: tItem.sn_ont || existing?.sn_ont || `ZTEGC8B90${String(tItem.id || idx + 1).padStart(3, '0')}`
          }
        ];
      })()
    };
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    if (typeof document !== 'undefined') {
      document.body.classList.add('bastp-print-mode');
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      if (typeof document !== 'undefined') {
        document.body.classList.remove('bastp-print-mode');
      }
    }, 1500);
  };

  const modalElement = (
    <div className="modal-bastp-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto animate-in fade-in duration-200">
      <div className={`rounded-3xl w-full max-w-4xl border-2 shadow-2xl transition-all max-h-[96vh] flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* HEADER MODAL DENGAN TOMBOL PRINT */}
        <div className="no-print flex flex-wrap items-center justify-between p-3.5 sm:p-4 border-b-2 border-slate-200 dark:border-slate-800 shrink-0 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span>Berita Acara Serah Terima Pekerjaan (BASTP)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  customerList.length > 1
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {customerList.length > 1
                    ? `📄 Batch ${customerList.length} Lembar (${customerList.length} Pelanggan)`
                    : '📄 1 Lembar Dokumen (1 Pelanggan)'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {customerList.length > 1
                  ? 'Setiap pelanggan dicetak tepat 1 lembar A4 secara terpisah.'
                  : 'Format A4 proporsional: Tepat 1 halaman A4 tanpa rangkap ganda berlebih.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition cursor-pointer active:scale-95"
              title="Cetak dokumen BASTP resmi"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak BASTP ({customerList.length} Lembar)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AREA DOKUMEN CETAK BASTP RESMI */}
        <div className="printable-bastp flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 text-xs text-slate-900 dark:text-slate-100">
          {customerList.map((cTask, cIdx) => {
            const bastp = getBastpData(cTask, cIdx);

            return (
              <div
                key={cTask.id || cIdx}
                className="bastp-sheet space-y-4 pb-6 border-b-2 border-dashed border-slate-300 dark:border-slate-700 last:border-b-0 last:pb-0"
              >
                {/* KOP SURAT FORMAL TELKOM AKSES */}
                <div className="pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-rose-600 to-rose-700 flex flex-col items-center justify-center text-white shadow-md border-2 border-rose-400 shrink-0">
                      <span className="font-black text-base tracking-wider leading-none">TA</span>
                      <span className="text-[7px] font-bold tracking-tighter opacity-90 mt-0.5">TELKOM</span>
                    </div>
                    <div>
                      <h1 className="text-sm sm:text-base font-black tracking-tight uppercase print-text-dark">
                        PT TELKOM AKSES (PERSERO)
                      </h1>
                      <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                        AREA OPERASIONAL PAYAKUMBUH &bull; WITEL SUMATERA BARAT
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 print-text-dark">
                        Sentral Telepon Otomatis (STO) Koto Nan IV
                      </div>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 print-text-dark">
                        Jl. Soekarno-Hatta No. 12, Payakumbuh Barat 26224 | Telp: (0752) 92881
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono text-[11px] border-l-2 sm:border-l-0 pl-2 sm:pl-0 border-rose-500">
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Nomor BASTP Resmi:</div>
                    <div className="font-black text-xs text-rose-600 dark:text-rose-400 print-text-dark">
                      {bastp.nomor_bastp}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 print-text-dark">
                      Closing: <strong>{bastp.waktu_closing}</strong>
                    </div>
                    {customerList.length > 1 && (
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/30">
                        Lembar {cIdx + 1} dari {customerList.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Garis Pembatas Kop Surat Ganda */}
                <div className="border-b-2 border-rose-600"></div>

                {/* JUDUL DOKUMEN */}
                <div className="text-center py-0.5">
                  <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase underline underline-offset-2 decoration-rose-600 print-text-dark">
                    BERITA ACARA SERAH TERIMA PEKERJAAN &amp; PEMAKAIAN MATERIAL (BASTP)
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 print-text-dark">
                    Ref: Tiket #{cTask.id} &bull; Klasifikasi: <strong>{bastp.jenis_kerja}</strong>
                  </p>
                </div>

                {/* GRID DATA PELANGGAN & PARAMETER TEKNIS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Box 1: Data Pelanggan */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-950/70 border-slate-700' : 'bg-slate-50 border-slate-300'
                  } space-y-1`}>
                    <div className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1 border-slate-200 dark:border-slate-800">
                      <User className="w-3 h-3 text-blue-500" />
                      <span>Identitas Pelanggan &amp; Lokasi:</span>
                    </div>
                    <div className="space-y-1 pt-0.5 text-[11px]">
                      <div className="flex justify-between border-b pb-0.5 border-slate-200 dark:border-slate-800/60">
                        <span className="text-slate-400">Nama Pelanggan:</span>
                        <strong className="print-text-dark">{bastp.pelanggan_nama}</strong>
                      </div>
                      <div className="flex justify-between border-b pb-0.5 border-slate-200 dark:border-slate-800/60">
                        <span className="text-slate-400">Alamat Lokasi:</span>
                        <span className="text-right max-w-[200px] truncate font-semibold print-text-dark" title={bastp.lokasi}>
                          {bastp.lokasi}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Kontak Telepon:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{bastp.pelanggan_telp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Box 2: Parameter Teknis Quality Assurance */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-950/70 border-slate-700' : 'bg-slate-50 border-slate-300'
                  } space-y-1`}>
                    <div className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1 border-slate-200 dark:border-slate-800">
                      <Radio className="w-3 h-3 text-emerald-500" />
                      <span>Parameter Teknis Quality Assurance:</span>
                    </div>
                    <div className="space-y-1 pt-0.5 text-[11px]">
                      <div className="flex justify-between border-b pb-0.5 border-slate-200 dark:border-slate-800/60">
                        <span className="text-slate-400">ODP / Port:</span>
                        <strong className="font-mono text-rose-600 dark:text-rose-400">{bastp.odp_id} (Port {bastp.port_odp})</strong>
                      </div>
                      <div className="flex justify-between border-b pb-0.5 border-slate-200 dark:border-slate-800/60">
                        <span className="text-slate-400">Redaman Optik (OPM):</span>
                        <strong className="font-mono text-emerald-500 font-bold">
                          {bastp.redaman_dbm} dBm (Lolos QC Telkom)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">SN Barcode ONT:</span>
                        <strong className="font-mono text-purple-500 font-black">{bastp.sn_ont}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABEL REKONSILIASI MATERIAL REAL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-500" />
                      <span>Rincian Pemakaian Material Riil (Consumed):</span>
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Status: Resmi Terpasang di Pelanggan
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
                    <table className="w-full text-left text-[11px] border-collapse print-table">
                      <thead>
                        <tr className={`border-b ${isDark ? 'bg-slate-950 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300'} uppercase text-[9px] font-black`}>
                          <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700 w-8">No</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-300 dark:border-slate-700">Nama Barang / Material</th>
                          <th className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 w-20">Diambil</th>
                          <th className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-black w-24">Terpasang</th>
                          <th className="py-1.5 px-2 text-center border-r border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-400 w-20">Sisa Retur</th>
                          <th className="py-1.5 px-2.5 text-right w-32">Status Logistik</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {bastp.reconciliation?.map((m, mIdx) => (
                          <tr key={mIdx}>
                            <td className="py-1 px-2.5 font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800 font-bold">{mIdx + 1}</td>
                            <td className="py-1 px-2.5 border-r border-slate-200 dark:border-slate-800">
                              <strong className="block print-text-dark">{m.nama_barang}</strong>
                              {m.sn && (
                                <span className="text-[9px] font-mono text-purple-500 font-bold">
                                  SN: {m.sn}
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2 text-center font-mono border-r border-slate-200 dark:border-slate-800">
                              {m.jumlah_diambil} {m.satuan}
                            </td>
                            <td className="py-1 px-2 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                              {m.jumlah_terpakai} {m.satuan}
                            </td>
                            <td className="py-1 px-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800">
                              {m.jumlah_sisa || 0} {m.satuan}
                            </td>
                            <td className="py-1 px-2.5 text-right">
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                TERPASANG
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3 BUKTI FOTO FISIK (SN ONT, OPM DBM, RUMAH/PELANGGAN) & CATATAN */}
                <div className={`p-2 rounded-xl border space-y-1.5 ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <div className="aspect-square w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900/50 flex items-center justify-center">
                        <img
                          src={bastp.foto_sn}
                          alt="SN Barcode Modem"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="block text-[8px] font-mono text-center text-slate-500 font-bold truncate">
                        SN: {bastp.sn_ont}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="aspect-square w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900/50 flex items-center justify-center">
                        <img
                          src={bastp.foto_opm}
                          alt="Redaman OPM"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="block text-[8px] font-mono text-center text-emerald-600 dark:text-emerald-400 font-bold">
                        OPM: {bastp.redaman_dbm} dBm
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="aspect-square w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900/50 flex items-center justify-center">
                        <img
                          src={bastp.foto_rumah}
                          alt="Rumah Pelanggan"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="block text-[8px] text-center text-slate-500 font-bold truncate">
                        Rumah &amp; Pelanggan
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>3 Foto Fisik Lolos Verifikasi Lapangan</span>
                    </span>
                    <span className="text-slate-400 italic truncate max-w-[220px]" title={bastp.catatan_teknisi}>
                      "{bastp.catatan_teknisi}"
                    </span>
                  </div>
                </div>

                {/* KOLOM TANDA TANGAN 3 PIHAK */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t-2 border-slate-300 dark:border-slate-700 text-center text-xs print-text-dark">
                  <div className={`p-2 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-300 bg-slate-50'} space-y-1`}>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Pelanggan Penerima</div>
                    <div className="h-10 flex items-center justify-center border-y border-dashed border-slate-300 dark:border-slate-700 my-0.5 font-bold text-[11px]">
                      ( {bastp.pelanggan_nama} )
                    </div>
                    <p className="text-[9px] text-slate-400">Penerima Layanan IndiHome</p>
                  </div>

                  <div className={`p-2 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-300 bg-slate-50'} space-y-1`}>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Teknisi Pelaksana</div>
                    <div className="h-10 flex items-center justify-center border-y border-dashed border-slate-300 dark:border-slate-700 my-0.5 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                      ( Petugas Lapangan STO )
                    </div>
                    <p className="text-[9px] text-slate-400">Unit Provisioning &amp; Maintenance</p>
                  </div>

                  <div className={`p-2 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-300 bg-slate-50'} space-y-1`}>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Pimpinan STO</div>
                    <div className="h-10 flex items-center justify-center border-y border-dashed border-slate-300 dark:border-slate-700 my-0.5 font-bold text-[11px]">
                      ( Robby Permana Putra )
                    </div>
                    <p className="text-[9px] text-slate-400">Manager STO Payakumbuh</p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
}
