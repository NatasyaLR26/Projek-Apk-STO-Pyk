// oxlint-disable no-unused-vars react-hooks/exhaustive-deps react/refs
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ModernSidebar from '../components/ModernSidebar';
import RequestBarangModal from '../components/RequestBarangModal';
import UploadBuktiModal from '../components/UploadBuktiModal';
import ModalBASTP from '../components/ModalBASTP';
import CetakSuratPermohonan from '../components/CetakSuratPermohonan';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { parseTaskDetails } from '../utils/taskFormatter';
import {
  Wrench,
  MapPin,
  Package,
  Camera,
  Eye,
  Truck,
  Navigation,
  Radio,
  Clock,
  Phone,
  CheckCircle2,
  FilePlus2,
  Printer,
  FileText,
  Lock,
  Barcode,
  Zap,
  Layers
} from 'lucide-react';

/**
 * ============================================================================
 * PORTAL TEKNISI LAPANGAN STO TELKOM AKSES (PAYAKUMBUH KOTO NAN IV)
 * ============================================================================
 * Fitur Utama Teknisi:
 * 1. Mengambil / mengklaim tiket penugasan dari siaran terbuka (Open Pool).
 * 2. Mengajukan surat permohonan material barang ke bagian logistik gudang.
 * 3. Mencetak fisik surat permohonan pengambilan barang.
 * 4. Memantau status persetujuan (Approval) Pimpinan STO.
 * 5. Pelacakan GPS lapangan & pengiriman koordinat real-time ke WebGIS Pimpinan.
 * 6. Closing pekerjaan: validasi ODP, redaman dBm, SN ONT, rekonsiliasi material & cetak BASTP.
 * ============================================================================
 */
// Helper pembersih lokasi agar tidak mengulang nama/no telepon pelanggan
const cleanLocation = (rawLoc, custName) => {
  if (!rawLoc) return '-';
  const cust = parseTaskDetails({ lokasi: rawLoc, pelanggan_nama: custName });
  return cust.address || rawLoc;
};

// Komponen Thumbnail Bukti Foto dengan fallback jika image error/broken (e.g. Tiket #29)
function BuktiThumbnail({ src, alt = "Bukti Foto", onClick, className = "w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0 cursor-pointer hover:opacity-90" }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        onClick={onClick}
        className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-750 transition"
        title="Bukti Foto"
      >
        <Camera className="w-5 h-5 text-slate-500" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      onClick={onClick}
    />
  );
}

export default function DashboardTeknisi() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const {
    tugas,
    setTugas,
    claimTugas,
    checkInTugas,
    updateTugas,
    permohonan,
    detailPermohonan,
    barang,
    saldoTeknisi,
    showToast,
    sidebarCollapsed,
    currentUser
  } = useApp();

  const [isCheckingInId, setIsCheckingInId] = useState(null);

  const handleDoCheckIn = (targetTask) => {
    if (isCheckingInId) return;
    setIsCheckingInId(targetTask.id);

    let resolved = false;
    const doCheck = (lat, lng) => {
      if (resolved) return;
      resolved = true;
      setIsCheckingInId(null);
      checkInTugas(targetTask.id, {
        latitude: lat || targetTask.target_lat || -0.2285,
        longitude: lng || targetTask.target_lng || 100.6335
      });
    };

    // Strict 1000ms safety timer fallback - NEVER hangs!
    const timer = setTimeout(() => {
      doCheck(targetTask.target_lat || -0.2285, targetTask.target_lng || 100.6335);
    }, 1000);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          doCheck(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          clearTimeout(timer);
          doCheck(targetTask.target_lat || -0.2285, targetTask.target_lng || 100.6335);
        },
        { timeout: 900, maximumAge: 60000, enableHighAccuracy: false }
      );
    } else {
      clearTimeout(timer);
      doCheck(targetTask.target_lat || -0.2285, targetTask.target_lng || 100.6335);
    }
  };

  // Sesi akun teknisi aktif
  const user = currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null) || { id: 2, nama_lengkap: 'Ahmad Fadli', role: 'teknisi' };
  const currentTechId = Number(user?.id || 2);

  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      const saved = localStorage.getItem('sto_active_tab_teknisi');
      const valid = ['tiket', 'surat-permohonan', 'status-approval', 'pengerjaan', 'cetak-surat'];
      return saved && valid.includes(saved) ? saved : 'tiket';
    } catch {
      return 'tiket';
    }
  });

  const handleSetActiveMenu = (tab) => {
    setActiveMenu(tab);
    try {
      localStorage.setItem('sto_active_tab_teknisi', tab);
    } catch {}
  };

  // Reset tab ke tiket jika logo diklik
  useEffect(() => {
    const handleReset = (e) => {
      if (!e.detail?.role || e.detail.role === 'teknisi') {
        setActiveMenu('tiket');
      }
    };
    window.addEventListener('sto:reset-dashboard-tab', handleReset);
    return () => window.removeEventListener('sto:reset-dashboard-tab', handleReset);
  }, []);
  const [modalTugasId, setModalTugasId] = useState(null);
  const [uploadTugasId, setUploadTugasId] = useState(null);
  const [bastpModalTask, setBastpModalTask] = useState(null);
  
  // Filter daftar tugas:
  // 1. Tiket terbuka yang disiarkan Pimpinan (pool terbuka atau siapapun teknisi dapat mengambil)
  const openTasks = useMemo(() => {
    return tugas.filter(t => {
      const isPool = !t.teknisi_id || Number(t.teknisi_id) === 99 || Number(t.teknisi_id) === 0 || t.teknisi_id === 'null' || t.teknisi_id === '0';
      const st = String(t.status || '').toLowerCase().trim();
      const isOpen = st === 'open' || st === 'menunggu' || st === '' || st === 'open pool' || st === 'pending';
      return isPool && isOpen;
    });
  }, [tugas]);

  const isDoneStatus = useCallback((status) => {
    const st = String(status || '').toLowerCase().trim();
    return st === 'done' || st === 'selesai' || st === 'closed';
  }, []);

  // Tangkap seluruh lifecycle tiket aktif: assigned, in_progress, progress, menunggu_material, material_approved, pengerjaan, bastp_ready, open, menunggu
  const isActiveLifecycle = useCallback((status) => {
    const st = String(status || '').toLowerCase().trim();
    const activeLifecycles = [
      'progress',
      'in_progress',
      'assigned',
      'menunggu_material',
      'material_approved',
      'pengerjaan',
      'bastp_ready',
      'menunggu',
      'open',
      'pending',
      'proses'
    ];
    return activeLifecycles.includes(st) || (!isDoneStatus(st) && st !== '');
  }, [isDoneStatus]);

  // 2. Tiket yang diambil oleh teknisi ini (Memoized)
  const myTasks = useMemo(() => {
    return tugas.filter(t => Number(t.teknisi_id) === currentTechId);
  }, [tugas, currentTechId]);

  const myActiveTasks = useMemo(() => {
    return myTasks.filter(t => !isDoneStatus(t.status) && isActiveLifecycle(t.status));
  }, [myTasks, isDoneStatus, isActiveLifecycle]);

  const myDoneTasks = useMemo(() => {
    return myTasks.filter(t => isDoneStatus(t.status));
  }, [myTasks, isDoneStatus]);

  // Tiket aktif untuk navigasi pengerjaan (hanya tiket yang belum selesai)
  const activeTasks = myActiveTasks;

  // Permohonan material yang diajukan oleh teknisi ini (Memoized)
  const myRequests = useMemo(() => {
    return permohonan.filter(p => {
      const parent = tugas.find(t => Number(t.id) === Number(p.tugas_id));
      return Number(parent?.teknisi_id) === currentTechId;
    });
  }, [permohonan, tugas, currentTechId]);

    const activeTasksRef = useRef(activeTasks);
  activeTasksRef.current = activeTasks;

  // Proteksi hak akses sesi teknisi
  useEffect(() => {
    if (!user || user.role !== 'teknisi') {
      navigate('/');
    }
  }, [navigate]);



  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${
      isDark ? 'bg-[#0a0f1d] text-white' : 'bg-slate-50 text-slate-900'
    } transition-colors duration-300`}>
      
      {/* Left Sidebar Layout */}
      <ModernSidebar activeTab={activeMenu} onTabChange={handleSetActiveMenu} />

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 flex flex-col overflow-y-auto ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-72'} transition-all duration-300`}>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
          
          {/* Header Banner */}
          <div className={`p-5 sm:p-6 rounded-3xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  PORTAL TEKNISI LAPANGAN
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: TA-02981</span>
              </div>
              <h1 className={`text-xl sm:text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeMenu === 'tiket' && 'Dashboard Teknisi'}
                {activeMenu === 'surat-permohonan' && 'Pengajuan Kebutuhan Material'}
                {activeMenu === 'cetak-surat' && 'Cetak Surat Permohonan'}
                {activeMenu === 'status-approval' && 'Pengambilan Material di Gudang'}
                {activeMenu === 'pengerjaan' && 'Pemasangan & BASTP Digital'}
              </h1>
            </div>

            {/* Quick Status Info */}
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>{myActiveTasks.length} Tiket Aktif</span>
              </span>
            </div>
          </div>

          {/* TAB 1: AMBIL TIKET / PEKERJAAN */}
          {activeMenu === 'tiket' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* SECTION 1: POOL TIKET TERBUKA (DIUMUMKAN PIMPINAN) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-extrabold flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        📢
                      </span>
                      <span>Broadcast Tiket Terbuka (Open Pool)</span>
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 self-start sm:self-auto">
                    {openTasks.length} Tiket Tersedia
                  </span>
                </div>

                {openTasks.length === 0 ? (
                  <div className={`p-8 text-center rounded-3xl border ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
                      📭
                    </div>
                    <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Tidak Ada Tiket Terbuka Saat Ini
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Semua pekerjaan telah diambil oleh teknisi atau belum ada tiket baru yang diterbitkan oleh Pimpinan STO.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {openTasks.map(t => {
                      const cust = parseTaskDetails(t);
                      return (
                      <div
                        key={t.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isDark ? 'bg-slate-900/90 border-blue-900/50 hover:border-blue-500' : 'bg-white border-blue-200 shadow-md hover:border-blue-500'
                        } space-y-4`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-500">#{t.id}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Pool Terbuka
                              </span>
                            </div>
                            <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'} mt-1 truncate capitalize`} title={cust.name}>
                              {cust.name}
                            </h3>
                          </div>
                          <span className={`whitespace-nowrap inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-bold border shadow-xs tracking-wide ${
                            (t.jenis_kerja?.includes('Pasang') || t.jenis_kerja === 'Pasang Baru') ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' :
                            (t.jenis_kerja?.includes('Gangguan') || t.jenis_kerja?.includes('Putus')) ? 'bg-rose-600/20 text-rose-400 border-rose-500/40' :
                            t.jenis_kerja?.includes('Modem') ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' :
                            'bg-purple-600/20 text-purple-400 border-purple-500/40'
                          }`}>
                            {t.jenis_kerja}
                          </span>
                        </div>

                        <div className={`p-3.5 rounded-2xl text-xs space-y-2 ${isDark ? 'bg-slate-950/70 border border-slate-800 text-slate-300' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate block max-w-full" title={cust.address}>{cust.address}</span>
                          </div>
                          {(cust.telp || t.pelanggan_telp) && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{cust.telp || t.pelanggan_telp}</span>
                            </div>
                          )}
                        </div>

                        {/* Claim Button */}
                        <button
                          onClick={async () => {
                            await claimTugas(t.id, user.id);
                            showToast(`Tiket #${t.id} berhasil Anda ambil! Segera ajukan permohonan material ke gudang.`, 'success');
                          }}
                          className="w-full py-3 px-4 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-900/40 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>Ambil Pekerjaan</span>
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: TIKET SAYA YANG SEDANG BERJALAN */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div>
                    <h2 className="text-base font-extrabold flex items-center gap-2">
                      <span className="p-1.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                        <Wrench className="w-4 h-4" />
                      </span>
                      <span>Tiket Dalam Pengerjaan</span>
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 self-start sm:self-auto">
                    {myActiveTasks.length} Tiket Aktif
                  </span>
                </div>

                {myActiveTasks.length === 0 ? (
                  <div className={`p-8 text-center rounded-3xl border ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
                      🛠️
                    </div>
                    <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Belum Ada Pekerjaan Aktif
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Ambil tiket dari pool siaran terbuka di atas untuk memulai pekerjaan Anda.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myActiveTasks.map(t => {
                      const cust = parseTaskDetails(t);
                      return (
                      <div
                        key={t.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                        } space-y-4`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-500">#{t.id}</span>
                              <span className={`whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs tracking-wide ${
                                (t.jenis_kerja?.includes('Pasang') || t.jenis_kerja === 'Pasang Baru') ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' :
                                (t.jenis_kerja?.includes('Gangguan') || t.jenis_kerja?.includes('Putus')) ? 'bg-rose-600/20 text-rose-400 border-rose-500/40' :
                                t.jenis_kerja?.includes('Modem') ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' :
                                'bg-purple-600/20 text-purple-400 border-purple-500/40'
                              }`}>
                                {t.jenis_kerja || 'Perbaikan'}
                              </span>
                            </div>
                            <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'} mt-1 truncate capitalize`} title={cust.name}>
                              {cust.name}
                            </h3>
                          </div>
                        </div>

                        <div className={`p-3 rounded-2xl text-xs space-y-1.5 ${isDark ? 'bg-slate-950/60 border border-slate-850 text-slate-300' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate block max-w-full" title={cust.address}>{cust.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{cust.telp || t.pelanggan_telp || '0812-xxxx-xxxx'}</span>
                          </div>
                        </div>

                        {/* Status Alur Pengerjaan Lapangan Realistis */}
                        {(() => {
                          const taskPerm = permohonan.find(p => Number(p.tugas_id) === Number(t.id) || (p.tugas_ids && p.tugas_ids.map(Number).includes(Number(t.id))));
                          const isApproved = taskPerm?.status === 'Approved';
                          const isReleased = taskPerm?.status === 'Released' || t.material_status === 'Dalam Perjalanan';
                          const isSelfSpliced = t.material_status === 'Splicing Mandiri (Tanpa Order Gudang)' || t.material_status === 'Tanpa Order Gudang';
                          const isPending = taskPerm && taskPerm.status === 'Pending';
                          const isCheckedIn = !!t.checkin?.verified;
                          const isTroubleOrSplicing = (t.jenis_kerja || '').toLowerCase().includes('gangguan') ||
                                                      (t.jenis_kerja || '').toLowerCase().includes('putus') ||
                                                      (t.jenis_kerja || '').toLowerCase().includes('splicing') ||
                                                      (t.jenis_kerja || '').toLowerCase().includes('maintenance');

                          return (
                            <div className="space-y-2.5 pt-1">
                              {/* Alokasi ONT Spesifik dari Gudang */}
                              {(t.assigned_sn_ont || t.sn_ont) && (
                                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono flex items-center justify-between">
                                  <div className="flex items-center gap-2 truncate">
                                    <Barcode className="w-4 h-4 text-purple-400 shrink-0" />
                                    <span className="truncate">ONT: <strong>{t.assigned_sn_ont || t.sn_ont}</strong> {t.assigned_model_ont ? `(${t.assigned_model_ont})` : ''}</span>
                                  </div>
                                  <span className="text-[10px] text-purple-300 font-sans font-bold bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/40 shrink-0 ml-1">
                                    Alokasi Gudang
                                  </span>
                                </div>
                              )}

                              {/* Tombol Aksi Utama Berdasarkan Alur SOP */}
                              <div className="space-y-2">
                                {!taskPerm && !isSelfSpliced && (
                                  <>
                                    {isTroubleOrSplicing ? (
                                      <div className="space-y-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (typeof setTugas === 'function') {
                                              setTugas(prev => prev.map(item => Number(item.id) === Number(t.id) ? {
                                                ...item,
                                                material_status: 'Splicing Mandiri (Tanpa Order Gudang)',
                                                status: 'Progress'
                                              } : item));
                                            }
                                            showToast(`Tiket #${t.id} siap diselesaikan via Splicing Mandiri! Langsung aktifkan GPS saat tiba.`, 'success');
                                          }}
                                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                                        >
                                          <Zap className="w-4 h-4 text-amber-300" />
                                          <span>⚡ Selesaikan Gangguan Langsung (Splicing Mandiri Tanpa Gudang)</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setModalTugasId(t.id)}
                                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                                        >
                                          <Package className="w-3.5 h-3.5 text-amber-400" />
                                          <span>📦 Butuh Material Gudang (Ganti Dropcore / ONT Rusak)</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setModalTugasId(t.id)}
                                        className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                                      >
                                        <Package className="w-4 h-4" />
                                        <span>📦 Isi & Ajukan Kebutuhan Material ke Gudang</span>
                                      </button>
                                    )}
                                  </>
                                )}

                                {taskPerm && !isReleased && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => showToast('Permohonan telah diteruskan ke Gudang STO Payakumbuh. Silakan temui petugas logistik untuk serah terima barang.', 'info')}
                                        className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                                      >
                                        <span>📦 Menunggu Pengambilan di Gudang</span>
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSetActiveMenu('cetak-surat')}
                                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                                    >
                                      <span>🖨️ Cetak Permohonan Material</span>
                                    </button>
                                  </div>
                                )}

                                {(isReleased || isSelfSpliced) && !isCheckedIn && (
                                  <div className="space-y-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDoCheckIn(t)}
                                      disabled={isCheckingInId === t.id}
                                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-75"
                                    >
                                      {isCheckingInId === t.id ? (
                                        <span className="flex items-center gap-2">
                                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                          <span>MEMVERIFIKASI LOKASI GPS...</span>
                                        </span>
                                      ) : (
                                        <>
                                          <MapPin className="w-4 h-4 text-amber-300" />
                                          <span>📍 GPS AKTIF: SAYA SUDAH SAMPAI DI LOKASI KERJA</span>
                                        </>
                                      )}
                                    </button>
                                    {isReleased && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetActiveMenu('cetak-surat')}
                                        className="w-full py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 font-medium text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                                      >
                                        <Printer className="w-3 h-3" />
                                        <span>Cetak Surat Jalan / Bukti Gudang (Opsional)</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {isCheckedIn && (
                                  <button
                                    type="button"
                                    onClick={() => setUploadTugasId(t.id)}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                                  >
                                    <Camera className="w-4 h-4" />
                                    <span>📸 AMBIL FOTO SELESAI & SCAN SERIAL NUMBER ONT (BASTP)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 3: RIWAYAT PEKERJAAN SELESAI */}
              {myDoneTasks.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Riwayat Pekerjaan Selesai</span>
                    </h2>
                    <span className="text-xs text-emerald-400 font-bold">{myDoneTasks.length} Pekerjaan Tuntas</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myDoneTasks.map(t => {
                      const cust = parseTaskDetails(t);
                      return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-3xl border ${
                          isDark ? 'bg-slate-900/60 border-emerald-500/30' : 'bg-white border-emerald-200 shadow-sm'
                        } flex flex-col justify-between`}
                      >
                        {/* Body Atas: Info Pelanggan (Kiri) & Thumbnail Foto (Kanan) */}
                        <div className="flex items-start justify-between gap-3">
                          {/* Sisi Kiri (flex-1) */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">#{t.id}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                ✓ Selesai & Terpasang
                              </span>
                            </div>
                            <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'} truncate capitalize`} title={cust.name}>
                              {cust.name}
                            </div>
                            <div className="text-slate-400 text-xs truncate block max-w-full" title={cust.address}>
                              {cust.address}
                            </div>
                            {t.waktu_selesai && (
                              <div className="text-[10px] text-emerald-400 font-mono">Closing: {t.waktu_selesai}</div>
                            )}
                          </div>

                          {/* Sisi Kanan (flex-shrink-0) */}
                          <div className="shrink-0">
                            <BuktiThumbnail
                              src={t.foto_bukti}
                              alt="Bukti Foto"
                              className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0 cursor-pointer hover:opacity-90"
                              onClick={() => setBastpModalTask(t)}
                            />
                          </div>
                        </div>

                        {/* Sisi Bawah: Tombol "Lihat BASTP" */}
                        <button
                          type="button"
                          onClick={() => setBastpModalTask(t)}
                          className="w-full mt-3 py-2 text-xs font-medium rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/50 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Lihat BASTP</span>
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: BUAT SURAT PERMOHONAN BARANG */}
          {activeMenu === 'surat-permohonan' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className={`p-6 rounded-3xl border ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} mb-4`}>
                  Pilih Tiket Pekerjaan
                </h2>
                {myActiveTasks.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-3`}>
                      Belum ada tiket yang sedang Anda kerjakan. Silakan ambil tiket pekerjaan terlebih dahulu dari Pool Tiket Terbuka.
                    </p>
                    <button
                      onClick={() => handleSetActiveMenu('tiket')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Buka Pool Tiket Pekerjaan
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {myActiveTasks.map(t => {
                      const cust = parseTaskDetails(t);
                      return (
                      <div
                        key={t.id}
                        className={`p-5 rounded-2xl border transition cursor-pointer ${
                          modalTugasId === t.id
                            ? 'border-rose-500 bg-rose-500/10 shadow-lg'
                            : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setModalTugasId(t.id)}
                      >
                        {/* Card Header (Flex justify-between items-center mb-2) */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-900/60 px-2 py-0.5 rounded">
                            #{t.id}
                          </span>
                          <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs tracking-wide ${
                            (t.jenis_kerja?.includes('Pasang') || t.jenis_kerja === 'Pasang Baru') ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' :
                            (t.jenis_kerja?.includes('Gangguan') || t.jenis_kerja?.includes('Putus')) ? 'bg-rose-600/20 text-rose-400 border-rose-500/40' :
                            t.jenis_kerja?.includes('Modem') ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' :
                            'bg-purple-600/20 text-purple-400 border-purple-500/40'
                          }`}>
                            {t.jenis_kerja || 'Pasang Baru'}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div>
                          <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'} mb-1 truncate capitalize`} title={cust.name}>
                            {cust.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-4 min-w-0" title={cust.address}>
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate block">{cust.address}</span>
                          </div>
                        </div>

                        {/* Card Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalTugasId(t.id);
                          }}
                          className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-98"
                        >
                          <FilePlus2 className="w-3.5 h-3.5" />
                          <span>Ajukan Material</span>
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CETAK FISIK SURAT PERMOHONAN */}
          {activeMenu === 'cetak-surat' && (
            <div className="animate-in fade-in duration-200">
              <CetakSuratPermohonan />
            </div>
          )}

          {/* TAB 4: STATUS PERSETUJUAN PIMPINAN & AMBIL BARANG GUDANG */}
          {activeMenu === 'status-approval' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {myRequests.length === 0 ? (
                <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <div className="text-sm font-bold text-white">Belum Ada Pengajuan Material</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRequests.map(req => {
                    const task = tugas.find(t => Number(t.id) === Number(req.tugas_id));
                    const cust = parseTaskDetails(task);
                    const details = detailPermohonan.filter(d => Number(d.permohonan_id) === Number(req.id));
                    const isApproved = req.status === 'Approved';
                    const isReleased = req.status === 'Released';

                    return (
                      <div
                        key={req.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isReleased
                            ? isDark ? 'bg-slate-900/80 border-emerald-500/40' : 'bg-white border-emerald-500/40 shadow-sm'
                            : isApproved
                            ? isDark ? 'bg-slate-900/80 border-amber-500/50' : 'bg-white border-amber-500/50 shadow-sm'
                            : isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                        } space-y-4`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-slate-400">Permohonan #{req.id}</span>
                            <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} mt-1 flex items-center gap-1.5 flex-wrap`}>
                              <span>Tiket #{req.tugas_id}</span>
                              <span className="text-slate-500">•</span>
                              <span className={`capitalize font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{cust.name}</span>
                            </h2>
                            {cust.address && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate block max-w-full" title={cust.address}>{cust.address}</span>
                              </div>
                            )}
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap inline-flex items-center gap-1 shrink-0 ${
                            isReleased
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isApproved
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isReleased ? 'bg-emerald-400' : isApproved ? 'bg-amber-400' : 'bg-slate-400'}`} />
                            {isReleased ? 'Material Diserahkan' : isApproved ? 'Siap Diambil di Gudang' : 'Menunggu Otorisasi'}
                          </span>
                        </div>

                        {/* Items Requested */}
                        <div className={`p-3 rounded-2xl text-xs ${isDark ? 'bg-slate-950 border border-slate-850' : 'bg-slate-50 border border-slate-200'} space-y-1`}>
                          <div className="font-semibold text-slate-400 text-[10px] uppercase">Rincian Material:</div>
                          {details.map(d => {
                            const itm = barang.find(b => Number(b.id) === Number(d.barang_id));
                            return (
                              <div key={d.id} className="flex justify-between text-xs">
                                <span>• {itm?.nama_barang || 'Barang'}</span>
                                <strong className="text-white">{d.jumlah_minta} {itm?.satuan}</strong>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={!isApproved && !isReleased}
                            onClick={() => {
                              if (isApproved || isReleased) {
                                handleSetActiveMenu('cetak-surat');
                              }
                            }}
                            title={!isApproved && !isReleased ? 'Menunggu otorisasi pimpinan sebelum mencetak bukti pengambilan' : 'Cetak Bukti Pengambilan Material'}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                              !isApproved && !isReleased
                                ? 'bg-slate-800/50 text-slate-500 border border-slate-800 opacity-50 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer active:scale-95'
                            }`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Bukti Pengambilan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PENGERJAAN LAPANGAN & UPLOAD BUKTI SELESAI */}
          {activeMenu === 'pengerjaan' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Work Orders to Finish */}
              <div className="space-y-4">
                <h2 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Daftar Pekerjaan Siap Ditutup (BASTP)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTasks.map(t => {
                    const isDone = t.status === 'Done';
                    const cust = parseTaskDetails(t);
                    return (
                      <div
                        key={t.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isDone
                            ? isDark ? 'bg-slate-900/60 border-emerald-500/40 opacity-80' : 'bg-white border-emerald-500/40 shadow-sm'
                            : isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                        } space-y-4`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-400">Tiket #{t.id}</span>
                            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5 truncate capitalize`} title={cust.name}>
                              {cust.name}
                            </h3>
                            <p className="text-xs text-slate-400 truncate block max-w-full" title={cust.address}>{cust.address}</p>
                          </div>
                          {isDone ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Selesai (Done)
                            </span>
                          ) : (
                            <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs tracking-wide ${
                              (t.jenis_kerja?.includes('Pasang') || t.jenis_kerja === 'Pasang Baru')
                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                                : (t.jenis_kerja?.includes('Gangguan') || t.jenis_kerja?.includes('Putus'))
                                ? 'bg-rose-600/20 text-rose-400 border-rose-500/40'
                                : t.jenis_kerja?.includes('Modem')
                                ? 'bg-amber-600/20 text-amber-400 border-amber-500/40'
                                : 'bg-purple-600/20 text-purple-400 border-purple-500/40'
                            }`}>
                              {t.jenis_kerja || 'Pasang Baru'}
                            </span>
                          )}
                        </div>

                        {t.foto_bukti && (
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-850">
                            <BuktiThumbnail
                              src={t.foto_bukti}
                              alt="Bukti Selesai"
                              className="w-16 h-16 object-cover rounded-xl border border-slate-700"
                            />
                            <div className="text-xs">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Foto Tervalidasi
                              </span>
                              <p className="text-slate-400 text-[11px] mt-0.5">Selesai: {t.waktu_selesai}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          {isDone ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs text-center border border-emerald-500/30 flex items-center justify-center">
                                ✓ Pekerjaan Selesai & Terverifikasi
                              </div>
                              <button
                                onClick={() => setBastpModalTask(t)}
                                className="py-2 px-3.5 rounded-xl bg-burgundy-600 hover:bg-burgundy-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Lihat BASTP</span>
                              </button>
                            </div>
                          ) : !t.checkin?.verified ? (
                            <button
                              type="button"
                              onClick={() => handleDoCheckIn(t)}
                              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                              <MapPin className="w-4 h-4" />
                              <span>Check-In Lokasi (GPS)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setUploadTugasId(t.id)}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Unggah Foto Bukti & Selesaikan (Closing BASTP)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Modal: Request Barang (SOP 2) */}
      {modalTugasId && (
        <RequestBarangModal
          tugasId={modalTugasId}
          onClose={() => setModalTugasId(null)}
          onSuccess={() => {
            setModalTugasId(null);
            handleSetActiveMenu('status-approval');
          }}
        />
      )}

      {/* Modal: Upload Bukti Selesai (SOP 6) */}
      {uploadTugasId && (
        <UploadBuktiModal
          tugasId={uploadTugasId}
          onClose={() => setUploadTugasId(null)}
          onSuccess={() => {
            setUploadTugasId(null);
            showToast('Pekerjaan selesai! Berita acara berhasil diperbarui.', 'success');
          }}
        />
      )}

      {/* Modal: Dokumen BASTP & Rekonsiliasi Material Digital */}
      {bastpModalTask && (
        <ModalBASTP
          task={bastpModalTask}
          onClose={() => setBastpModalTask(null)}
        />
      )}

    </div>
  );
}