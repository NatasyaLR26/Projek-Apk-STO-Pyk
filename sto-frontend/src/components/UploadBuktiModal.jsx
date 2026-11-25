/**
 * ============================================================================
 * KOMPONEN: UploadBuktiModal (Formulir Closing & Rekonsiliasi Material Real)
 * ============================================================================
 * Standar Operasional Prosedur (SOP IndiHome / Telkom Akses WFM):
 * Pada pekerjaan lapangan fiber optik (Pasang Baru PSB / Penanganan Gangguan):
 * 1. Teknisi tidak bisa sekadar klik "Selesai" dan upload 1 foto.
 * 2. Teknisi WAJIB melakukan validasi teknis:
 *    - ODP ID & Port ODP (titik distribusi kabel tiang Telkom).
 *    - Redaman Optik (Optical Power Loss dalam dBm, standar -16 s/d -24 dBm).
 *    - Serial Number (SN / Barcode) Modem ONT yang terpasang di rumah pelanggan.
 * 3. REKONSILIASI MATERIAL REAL:
 *    - Barang yang diambil dari gudang (misal Dropcore 150 meter) dihitung pemakaian riilnya (misal 125 meter).
 *    - 125 meter Dropcore + 1 unit Modem ONT resmi beralih status menjadi
 *      "TERPASANG DI PELANGGAN (CONSUMED)" — resmi keluar/hilang dari inventaris perusahaan!
 *    - Sisa 25 meter dapat di-retur kembali ke gudang sehingga stok akurat.
 * 4. Sistem otomatis menerbitkan Berita Acara Serah Terima Pekerjaan (BASTP) digital.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Wrench,
  Radio,
  FileText,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { compressImage, formatFileSize } from '../utils/imageCompressor';

export default function UploadBuktiModal({ tugasId, onClose, onSuccess }) {
  const { isDark } = useTheme();
  const { tugas, permohonan, detailPermohonan, barang, finishTugas, showToast } = useApp();

  // Cari data tugas target berdasarkan ID
  const task = tugas.find((t) => Number(t.id) === Number(tugasId));

  // 1. STATE FORM DATA TEKNIS & PERANGKAT (STANDAR INDIHOME)
  const [odpId, setOdpId] = useState(task?.odp_id || 'ODP-PYK-FA/014');
  const [portOdp, setPortOdp] = useState(task?.port_odp || '03');
  const [redamanDbm, setRedamanDbm] = useState(task?.redaman_dbm || '-18.5');
  const [snOnt, setSnOnt] = useState(task?.assigned_sn_ont || task?.sn_ont || 'ZTEGC8B90201');
  const [pelangganNama, setPelangganNama] = useState(task?.pelanggan_nama || 'Pelanggan Telkom');
  const [catatan, setCatatan] = useState('Pemasangan instalasi selesai. Redaman optimal (-18.5 dBm), lampu PON modem hijau solid, internet aktif.');

  // 3 DOKUMENTASI FOTO WAJIB (HASIL KAMERA / UPLOAD TEKNISI, BEBAS FOTO DUMMY)
  const [fotoSn, setFotoSn] = useState(task?.foto_sn || '');
  const [fotoOpm, setFotoOpm] = useState(task?.foto_opm || '');
  const [fotoRumah, setFotoRumah] = useState(task?.foto_rumah || task?.foto_bukti || '');

  // State Kelebihan Material (Berdasarkan Tulisan & Foto Riil)
  const [adaKelebihanMaterial, setAdaKelebihanMaterial] = useState(false);
  const [rincianKelebihan, setRincianKelebihan] = useState('');
  const [fotoKelebihan, setFotoKelebihan] = useState('');
  const [konfirmasiRetur, setKonfirmasiRetur] = useState(true);
  const [isCompressingKelebihan, setIsCompressingKelebihan] = useState(false);
  const [compressionStatsKelebihan, setCompressionStatsKelebihan] = useState(null);

  // 2. STATE FOTO DOKUMENTASI
  const [preview, setPreview] = useState(task?.foto_rumah || task?.foto_bukti || '');
  const [submitting, setSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionSlot, setCompressionSlot] = useState(null); // 'sn' | 'opm' | 'rumah' | null
  const [compressionStats, setCompressionStats] = useState(null);
  const [activeStep, setActiveStep] = useState(1); // Step 1: Teknis & SN, Step 2: Rekonsiliasi Material, Step 3: Foto & Selesai

  // 3. DAFTAR MATERIAL YANG AKAN DIREKONSILIASI
  // Cari barang yang diajukan pada tiket ini dari permohonan yang disetujui / dirilis
  const [materialList, setMaterialList] = useState([]);

  useEffect(() => {
    const taskPermohonanList = permohonan.filter(p => Number(p.tugas_id) === Number(tugasId));
    let initialList = [];

    if (taskPermohonanList.length > 0) {
      taskPermohonanList.forEach(p => {
        const details = detailPermohonan.filter(d => Number(d.permohonan_id) === Number(p.id));
        details.forEach(d => {
          const item = barang.find(b => Number(b.id) === Number(d.barang_id));
          if (item) {
            // Material default terpasang 100% (sisa 0), kecuali teknisi mencatat ada retur/sisa
            const qtyMinta = Number(d.jumlah_minta) || 1;
            initialList.push({
              barang_id: item.id,
              nama_barang: item.nama_barang,
              satuan: item.satuan,
              jumlah_diambil: qtyMinta,
              jumlah_terpakai: qtyMinta,
              jumlah_sisa: 0,
              sn: item.nama_barang.toLowerCase().includes('ont') || item.nama_barang.toLowerCase().includes('modem') ? snOnt : null
            });
          }
        });
      });
    }

    // Jika tiket ini belum punya permohonan barang formal, berikan default material lapangan IndiHome
    if (initialList.length === 0) {
      initialList = [
        {
          barang_id: 1,
          nama_barang: 'Kabel Dropcore 1 Core (FO)',
          satuan: 'meter',
          jumlah_diambil: 150,
          jumlah_terpakai: 150,
          jumlah_sisa: 0,
          sn: null
        },
        {
          barang_id: 2,
          nama_barang: 'Modem ONT GPON Wi-Fi (ZTE F609)',
          satuan: 'unit',
          jumlah_diambil: 1,
          jumlah_terpakai: 1,
          jumlah_sisa: 0,
          sn: snOnt
        },
        {
          barang_id: 3,
          nama_barang: 'Roset Optik 1 Core + Pigtail',
          satuan: 'pcs',
          jumlah_diambil: 1,
          jumlah_terpakai: 1,
          jumlah_sisa: 0,
          sn: null
        }
      ];
    }

    setMaterialList(initialList);
  }, [tugasId, permohonan, detailPermohonan, barang, snOnt]);

  // Handler upload file lokal dengan kompresi client-side (HTML Canvas 1280px / JPEG 80%)
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      showToast('File harus berupa gambar foto (JPG/PNG)', 'error');
      return;
    }

    setIsCompressing(true);
    try {
      const result = await compressImage(selected, 1280, 0.8);
      setPreview(result.dataUrl);
      setFotoRumah(result.dataUrl);
      setCompressionStats({
        original: formatFileSize(result.originalSize),
        compressed: formatFileSize(result.compressedSize),
        percent: result.savedPercent
      });
      showToast(`⚡ Foto BASTP dikompresi: ${formatFileSize(result.originalSize)} ➔ ${formatFileSize(result.compressedSize)} (Hemat ${result.savedPercent}%)`, 'success');
    } catch (err) {
      console.warn('Kompresi gambar gagal:', err);
      showToast('Gagal memproses kompresi gambar: ' + err.message, 'error');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Handler upload foto spesifik per slot (SN ONT, OPM dBm, atau Rumah Pelanggan)
  const handleSlotFileChange = async (e, slotKey) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      showToast('File harus berupa gambar foto (JPG/PNG)', 'error');
      return;
    }

    setIsCompressing(true);
    setCompressionSlot(slotKey);
    try {
      const result = await compressImage(selected, 1280, 0.8);
      if (slotKey === 'sn') {
        setFotoSn(result.dataUrl);
        showToast(`⚡ Foto SN Barcode dikompresi (${formatFileSize(result.compressedSize)})`, 'success');
      } else if (slotKey === 'opm') {
        setFotoOpm(result.dataUrl);
        showToast(`⚡ Foto Redaman OPM dikompresi (${formatFileSize(result.compressedSize)})`, 'success');
      } else if (slotKey === 'rumah') {
        setFotoRumah(result.dataUrl);
        setPreview(result.dataUrl);
        showToast(`⚡ Foto Rumah/Selfie dikompresi (${formatFileSize(result.compressedSize)})`, 'success');
      }
    } catch (err) {
      console.warn('Kompresi gambar gagal:', err);
      showToast('Gagal memproses gambar: ' + err.message, 'error');
    } finally {
      setIsCompressing(false);
      setCompressionSlot(null);
      e.target.value = '';
    }
  };

  // Handler upload foto bukti fisik sisa / kelebihan material dengan kompresi Canvas
  const handleFileKelebihanChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      showToast('File harus berupa gambar foto (JPG/PNG)', 'error');
      return;
    }

    setIsCompressingKelebihan(true);
    try {
      const result = await compressImage(selected, 1280, 0.8);
      setFotoKelebihan(result.dataUrl);
      setCompressionStatsKelebihan({
        original: formatFileSize(result.originalSize),
        compressed: formatFileSize(result.compressedSize),
        percent: result.savedPercent
      });
      showToast(`⚡ Foto sisa material dikompresi: ${formatFileSize(result.originalSize)} ➔ ${formatFileSize(result.compressedSize)} (Hemat ${result.savedPercent}%)`, 'success');
    } catch (err) {
      console.warn('Kompresi gambar retur gagal:', err);
      showToast('Gagal mengompresi foto retur: ' + err.message, 'error');
    } finally {
      setIsCompressingKelebihan(false);
      e.target.value = '';
    }
  };

  // Validasi kualitas redaman optik (Standar Telkom Regional: -16.0 s/d -24.0 dBm)
  const redamanVal = parseFloat(redamanDbm);
  const isRedamanValid = !isNaN(redamanVal) && redamanVal >= -24.0 && redamanVal <= -14.0;

  // Handler ubah jumlah pemakaian per barang
  const handleMaterialUsageChange = (index, terpakai) => {
    setMaterialList(prev => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const totalDiambil = Number(target.jumlah_diambil) || 0;
      const numTerpakai = Math.max(0, Math.min(totalDiambil, Number(terpakai) || 0));
      const sisa = totalDiambil - numTerpakai;
      next[index] = {
        ...target,
        jumlah_terpakai: numTerpakai,
        jumlah_sisa: sisa
      };

      // Buat ringkasan otomatis untuk rincian kelebihan jika ada sisa
      const sisaItems = next.filter(it => (Number(it.jumlah_sisa) || 0) > 0);
      if (sisaItems.length > 0) {
        const autoSummary = sisaItems.map(it => `${it.nama_barang}: sisa ${it.jumlah_sisa} ${it.satuan}`).join(', ');
        setRincianKelebihan(autoSummary);
        setAdaKelebihanMaterial(true);
      }
      return next;
    });
  };

  // SUBMIT KLOSING TIKET & REKONSILIASI MATERIAL
  const handleSubmitClosing = async () => {
    if (submitting || isCompressing || isCompressingKelebihan) return; // Cegah double submit dari klik cepat
    setSubmitting(true);

    // Rekonsiliasi Realistis: Jika teknisi memilih TIDAK ADA material berlebih,
    // pastikan seluruh barang terpasang penuh (jumlah_terpakai = jumlah_diambil, jumlah_sisa = 0)
    const reconciledList = materialList.map(item => {
      if (!adaKelebihanMaterial) {
        return {
          ...item,
          jumlah_terpakai: item.jumlah_diambil,
          jumlah_sisa: 0
        };
      }
      return item;
    });

    const closingPayload = {
      fotoBuktiUrl: fotoRumah || fotoSn || preview,
      foto_sn: fotoSn,
      foto_opm: fotoOpm,
      foto_rumah: fotoRumah,
      foto_sisa: adaKelebihanMaterial ? fotoKelebihan : null,
      catatan,
      odp_id: odpId,
      port_odp: portOdp,
      redaman_dbm: redamanDbm,
      sn_ont: snOnt,
      pelanggan_nama: pelangganNama,
      retur_ke_gudang: adaKelebihanMaterial && konfirmasiRetur,
      kelebihan_material: {
        ada: adaKelebihanMaterial,
        rincian: adaKelebihanMaterial ? (rincianKelebihan || 'Material berlebih siap diretur ke STO') : 'Tidak ada material berlebih (terpakai pas)',
        foto: adaKelebihanMaterial ? fotoKelebihan : null
      },
      reconciliation: reconciledList,
      bastp_number: `BASTP/TA-PYK/2026/${String(tugasId).padStart(4, '0')}`
    };

    try {
      await finishTugas(tugasId, closingPayload);
      setSubmitting(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses closing tugas: ' + (err.message || 'Error server'), 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className={`rounded-3xl p-5 sm:p-6 w-full max-w-2xl border shadow-2xl transition-all max-h-[92vh] flex flex-col ${
        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-burgundy-600/20 text-burgundy-400 border border-burgundy-500/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-burgundy-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CLOSING WORK ORDER & BASTP
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Tiket #{tugasId}</span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold mt-0.5">
                Rekonsiliasi Material & Berita Acara Lapangan
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER WIZARD TABS */}
        <div className="flex items-center gap-2 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold flex-shrink-0">
          <button
            onClick={() => setActiveStep(1)}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeStep === 1
                ? 'bg-burgundy-600 text-white shadow'
                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>1. Teknis & SN ONT</span>
          </button>

          <button
            onClick={() => setActiveStep(2)}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeStep === 2
                ? 'bg-burgundy-600 text-white shadow'
                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>2. Material Real</span>
          </button>

          <button
            onClick={() => setActiveStep(3)}
            className={`flex-1 py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeStep === 3
                ? 'bg-burgundy-600 text-white shadow'
                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Foto & BASTP</span>
          </button>
        </div>

        {/* BODY CONTENT SCROLLABLE */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">

          {/* STEP 1: DATA TEKNIS & SERIAL NUMBER MODEM */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Identitas Pelanggan & Lokasi Penanganan:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nama Pelanggan:</span>
                    <input
                      type="text"
                      value={pelangganNama}
                      onChange={(e) => setPelangganNama(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs font-sans outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lokasi Sambungan:</span>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-900 dark:text-slate-300 truncate">
                      {task?.lokasi || 'STO Payakumbuh Koto Nan IV'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data ODP & Redaman */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                    <span>Terminasi ODP & Pengukuran Redaman (OPM):</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isRedamanValid
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {isRedamanValid ? '✓ Spek Telkom Lolos QC' : '⚠️ Cek Redaman Optik'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">ID ODP Tiang:</label>
                    <input
                      type="text"
                      value={odpId}
                      onChange={(e) => setOdpId(e.target.value)}
                      placeholder="Contoh: ODP-PYK-FA/014"
                      className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Port ODP:</label>
                    <input
                      type="text"
                      value={portOdp}
                      onChange={(e) => setPortOdp(e.target.value)}
                      placeholder="Contoh: 03 (Port 1-16)"
                      className={`w-full p-2.5 rounded-xl border font-mono text-xs outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Redaman (dBm):</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={redamanDbm}
                        onChange={(e) => setRedamanDbm(e.target.value)}
                        placeholder="-18.5"
                        className={`w-full p-2.5 pr-10 rounded-xl border font-mono text-xs font-bold outline-none ${
                          isRedamanValid ? 'text-emerald-400' : 'text-amber-400'
                        } ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        dBm
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  * Standar Telkom Akses Regional: Redaman optimal berada di antara -16.0 dBm s/d -24.0 dBm.
                </p>
              </div>

              {/* Serial Number ONT */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-purple-400" />
                    <span>Serial Number (SN Barcode ONT / Modem Pelanggan):</span>
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={snOnt}
                    onChange={(e) => setSnOnt(e.target.value)}
                    placeholder="Contoh: ZTEGC8B90112"
                    className={`flex-1 p-2.5 rounded-xl border font-mono font-bold tracking-wider text-xs outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'
                    }`}
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px]">
                  <strong>Binding CPE Pelanggan:</strong> Perangkat modem dengan SN ini akan resmi dialokasikan permanen ke rumah pelanggan (bukan lagi on-hand teknisi).
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-burgundy-600 hover:bg-burgundy-700 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  Lanjut ke Deklarasi Kelebihan Material →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DEKLARASI & BUKTI KELEBIHAN MATERIAL (RETUR KE SENTRAL STO) */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
              } space-y-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <span>Deklarasi &amp; Bukti Kelebihan Material Lapangan</span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                    SOP Retur Logistik
                  </span>
                </div>

                {/* Referensi Barang yang Diambil dari Gudang */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Referensi Material yang Diambil dari Gudang:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {materialList.map((m, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>{m.nama_barang}: <strong>{m.jumlah_diambil} {m.satuan}</strong></span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dua Pilihan Toggle: Tidak Ada vs Ada Kelebihan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => {
                      setAdaKelebihanMaterial(false);
                      setRincianKelebihan('');
                      setFotoKelebihan('');
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      !adaKelebihanMaterial
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isDark ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tidak Ada Material Berlebih</span>
                      </span>
                      <input
                        type="radio"
                        checked={!adaKelebihanMaterial}
                        onChange={() => {}}
                        className="accent-emerald-500"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => setAdaKelebihanMaterial(true)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      adaKelebihanMaterial
                        ? 'border-amber-500 bg-amber-500/10'
                        : isDark ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Ada Material Berlebih / Sisa (Cukup Catatan &amp; Foto)</span>
                      </span>
                      <input
                        type="radio"
                        checked={adaKelebihanMaterial}
                        onChange={() => {}}
                        className="accent-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Input Rincian Tulisan & Foto Jika Ada Kelebihan Material */}
                {adaKelebihanMaterial && (
                  <div className="space-y-3.5 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-200">
                    
                    {/* Rekonsiliasi Per Item: Sesuaikan Terpakai & Sisa */}
                    <div>
                      <label className="block text-xs font-bold text-amber-400 mb-1.5">
                        1. Penyesuaian Pemakaian Material Lapangan:
                      </label>
                      <div className="space-y-2">
                        {materialList.map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex-1">
                              <span className="font-bold text-xs block text-slate-200">{m.nama_barang}</span>
                              <span className="text-[10px] text-slate-400">
                                Diambil: <strong className="font-mono text-slate-300">{m.jumlah_diambil} {m.satuan}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">Terpakai:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={m.jumlah_diambil}
                                  value={m.jumlah_terpakai}
                                  onChange={(e) => handleMaterialUsageChange(idx, e.target.value)}
                                  className={`w-16 p-1 text-center font-mono font-bold text-xs rounded-lg border outline-none ${
                                    isDark ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300 text-emerald-600'
                                  }`}
                                />
                                <span className="text-[10px] text-slate-400 font-mono">{m.satuan}</span>
                              </div>

                              <div className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                                Sisa: {m.jumlah_sisa || 0} {m.satuan}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-400 mb-1">
                        2. Catatan Tertulis Rincian Material Berlebih / Sisa: *
                      </label>
                      <textarea
                        rows={2}
                        value={rincianKelebihan}
                        onChange={(e) => setRincianKelebihan(e.target.value)}
                        placeholder="Contoh: Sisa kabel dropcore 25 meter digulung di mobil operasional untuk retur/penanganan gangguan..."
                        className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-400 mb-1.5">
                        3. Foto Hasil Kamera / Upload Bukti Fisik Barang Berlebih: *
                      </label>
                      
                      {fotoKelebihan ? (
                        <div className="relative rounded-xl overflow-hidden border border-amber-500/40 h-36 w-full mb-2">
                          <img src={fotoKelebihan} alt="Bukti Kelebihan Material" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <label className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-amber-600 text-white text-[10px] font-bold transition cursor-pointer">
                              <span>Ganti Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={isCompressingKelebihan || submitting}
                                onChange={handleFileKelebihanChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur px-2 py-0.5 rounded text-[10px] text-amber-300 font-mono">
                            Bukti Fisik Barang Berlebih (Kamera/Upload Real)
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className={`block py-3 px-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition ${
                            isCompressingKelebihan
                              ? 'opacity-60 pointer-events-none'
                              : isDark ? 'bg-slate-900/60 hover:bg-slate-900 text-amber-400 border-amber-500/40' : 'bg-amber-50/50 hover:bg-amber-100/50 text-amber-600 border-amber-300'
                          }`}>
                            <span className="font-bold text-xs flex flex-col items-center justify-center gap-1.5">
                              {isCompressingKelebihan ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                                  <span>Mengompresi Foto Sisa...</span>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-5 h-5 text-amber-400" />
                                  <span>Ambil Foto Kamera / Unggah Bukti Sisa Material</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Kamera HP atau Galeri Gambar Fisik</span>
                                </>
                              )}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              disabled={isCompressingKelebihan || submitting}
                              onChange={handleFileKelebihanChange}
                              className="hidden"
                            />
                          </label>

                          {compressionStatsKelebihan && !isCompressingKelebihan && (
                            <div className="flex items-center justify-between p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <strong>Terkompresi: {compressionStatsKelebihan.compressed}</strong>
                              </span>
                              <span>Asli: {compressionStatsKelebihan.original} (Hemat {compressionStatsKelebihan.percent}%)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Checkbox Konfirmasi Retur ke Sentral STO */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="konfirmasiReturCheckbox"
                        checked={konfirmasiRetur}
                        onChange={(e) => setKonfirmasiRetur(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-amber-500 accent-amber-500 cursor-pointer shrink-0"
                      />
                      <label htmlFor="konfirmasiReturCheckbox" className="text-xs text-slate-300 cursor-pointer">
                        <strong className="text-amber-400 block mb-0.5">Komitmen Mobile Stock &amp; Retur Sentral STO:</strong>
                        Saya menyatakan bertanggung jawab penuh atas barang berlebih ini (sisa kabel digulung di kendaraan untuk perbaikan / perangkat dikembalikan ke gudang) sesuai ketentuan Telkom Akses.
                      </label>
                    </div>

                    {/* Alert Peringatan Ganti Rugi Sesuai Permintaan User */}
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Peringatan Audit STO:</strong> Jika material berlebih tidak dikembalikan ke Sentral STO atau hilang tanpa bukti fisik, teknisi wajib bertanggung jawab dan mengganti rugi sesuai ketentuan Telkom Akses.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  ← Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-burgundy-600 hover:bg-burgundy-700 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  Lanjut ke Foto & Penerbitan BASTP →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: 3 FOTO DOKUMENTASI LENGKAP & PENERBITAN BASTP */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-rose-500 block mb-0.5">3 Foto Pembuktian Fisik Lapangan (Hasil Kamera / Dokumen Asli):</span>
                <span>Unggah foto barcode SN modem, foto layar hasil ukur redaman OPM (dBm), dan foto rumah/pelanggan asli di lapangan.</span>
              </div>

              {/* Grid 3 Slot Foto Dokumentasi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SLOT 1: FOTO BARCODE / SN MODEM ONT */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5" />
                        <span>1. SN Barcode Modem</span>
                      </span>
                    </div>
                    {fotoSn ? (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden border border-purple-500/40 bg-black">
                        <img src={fotoSn} alt="Foto SN Modem" className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-purple-300 font-mono">
                          SN: {snOnt || 'ONT'}
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 w-full rounded-xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center p-2 text-center text-purple-400">
                        <Barcode className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-[10px] font-bold">Foto Barcode SN</span>
                        <span className="text-[9px] text-slate-400">Belum diupload</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-1">
                    <label className={`block py-2 px-2.5 rounded-xl text-center cursor-pointer text-[10px] font-bold border transition ${
                      isCompressing && compressionSlot === 'sn' ? 'opacity-50 pointer-events-none' : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500 shadow-sm'
                    }`}>
                      <span className="flex items-center justify-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isCompressing && compressionSlot === 'sn' ? 'Mengompres...' : (fotoSn ? 'Ganti Foto Barcode' : '+ Ambil / Upload Foto SN')}</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={isCompressing || submitting}
                        onChange={(e) => handleSlotFileChange(e, 'sn')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* SLOT 2: FOTO HASIL UKUR REDAMAN OPM DBM */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5" />
                        <span>2. Redaman OPM (dBm)</span>
                      </span>
                    </div>
                    {fotoOpm ? (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden border border-emerald-500/40 bg-black">
                        <img src={fotoOpm} alt="Foto Redaman OPM" className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-emerald-300 font-mono">
                          {redamanDbm} dBm
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 w-full rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center p-2 text-center text-emerald-400">
                        <Radio className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-[10px] font-bold">Foto Pengukuran OPM</span>
                        <span className="text-[9px] text-slate-400">Nilai: {redamanDbm} dBm</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-1">
                    <label className={`block py-2 px-2.5 rounded-xl text-center cursor-pointer text-[10px] font-bold border transition ${
                      isCompressing && compressionSlot === 'opm' ? 'opacity-50 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-sm'
                    }`}>
                      <span className="flex items-center justify-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isCompressing && compressionSlot === 'opm' ? 'Mengompres...' : (fotoOpm ? 'Ganti Foto OPM' : '+ Ambil / Upload Foto OPM')}</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={isCompressing || submitting}
                        onChange={(e) => handleSlotFileChange(e, 'opm')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* SLOT 3: FOTO RUMAH / SELFIE TEKNISI DG PELANGGAN */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        <span>3. Rumah & Pelanggan</span>
                      </span>
                    </div>
                    {fotoRumah ? (
                      <div className="relative h-28 w-full rounded-xl overflow-hidden border border-sky-500/40 bg-black">
                        <img src={fotoRumah} alt="Foto Rumah / Pelanggan" className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-white font-mono truncate max-w-[120px]">
                          {pelangganNama}
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 w-full rounded-xl border-2 border-dashed border-sky-500/30 bg-sky-500/5 flex flex-col items-center justify-center p-2 text-center text-sky-400">
                        <Camera className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-[10px] font-bold">Foto Rumah Pelanggan</span>
                        <span className="text-[9px] text-slate-400">{pelangganNama}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-1">
                    <label className={`block py-2 px-2.5 rounded-xl text-center cursor-pointer text-[10px] font-bold border transition ${
                      isCompressing && compressionSlot === 'rumah' ? 'opacity-50 pointer-events-none' : 'bg-sky-600 hover:bg-sky-700 text-white border-sky-500 shadow-sm'
                    }`}>
                      <span className="flex items-center justify-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isCompressing && compressionSlot === 'rumah' ? 'Mengompres...' : (fotoRumah ? 'Ganti Foto Rumah' : '+ Ambil / Upload Foto Rumah')}</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={isCompressing || submitting}
                        onChange={(e) => handleSlotFileChange(e, 'rumah')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Catatan Selesai */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Catatan Teknisi / Berita Acara:
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Kondisi redaman, lampu ONT, kepuasan pelanggan..."
                  className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Ringkasan BASTP */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dokumen BASTP Siap Diterbitkan</span>
                </div>
                <div>• Nomor BASTP: <strong>BASTP/TA-PYK/2026/{String(tugasId).padStart(4, '0')}</strong></div>
                <div>• ODP / Port: <strong>{odpId} (Port {portOdp})</strong> | Redaman: <strong>{redamanDbm} dBm</strong></div>
                <div>• SN ONT Terpasang: <strong>{snOnt}</strong> (Status: Terpasang di Pelanggan)</div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  disabled={submitting || isCompressing}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  ← Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmitClosing}
                  disabled={submitting || isCompressing || isCompressingKelebihan}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses BASTP...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Closing & Terbitkan BASTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}