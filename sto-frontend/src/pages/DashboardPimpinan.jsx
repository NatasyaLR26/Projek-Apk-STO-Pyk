import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  MapPin,
  ArrowRight,
  FileText,
  User,
  Users,
  Download,
  Printer,
  UserPlus
} from 'lucide-react';
import ModernSidebar from '../components/ModernSidebar';
import FormTugas from '../components/FormTugas';
import ApprovalMaterial from '../components/ApprovalMaterial';
import LaporanAudit from '../components/LaporanAudit';
import WebGISTracking from '../components/WebGISTracking';
import KelolaTugas from '../components/KelolaTugas';
import KelolaPegawai from '../components/KelolaPegawai';
import ModalBASTP from '../components/ModalBASTP';
import TabelAsetJaringan from '../components/TabelAsetJaringan';
import TabelPelangganAset from '../components/TabelPelangganAset';
import AnalyticsChartsPimpinan from '../components/AnalyticsChartsPimpinan';
import ModalDetailRiwayatTeknisi from '../components/ModalDetailRiwayatTeknisi';
import LaporanGudangPimpinan from '../components/LaporanGudangPimpinan';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

// ============================================================================
// 1. DATA PARSING & SANITIZATION HELPER (TELECOM OPERATIONAL STANDARD)
// ============================================================================
export const parseTelecomTaskDetails = (task) => {
  if (!task) {
    return { name: 'Pelanggan STO', telp: null, address: 'Payakumbuh', note: null };
  }

  let rawName = (task.pelanggan_nama || '').trim();
  let rawTelp = (task.pelanggan_telp || task.telepon || '').trim();
  let rawLoc = (task.lokasi || task.alamat || '').trim();
  let rawNotes = (task.keterangan || task.catatan || '').trim();

  // Pola regex nomor telepon fleksibel (6 s/d 16 digit: 08, +62, 0)
  const phonePattern = /(?:\+?62|08|0)[0-9\-\s]{6,16}/g;

  // 1. Ekstraksi nomor telepon jika belum tersedia
  if (!rawTelp) {
    const matchName = rawName.match(phonePattern);
    const matchLoc = rawLoc.match(phonePattern);
    const matchNotes = rawNotes.match(phonePattern);
    if (matchName) rawTelp = matchName[0].trim();
    else if (matchLoc) rawTelp = matchLoc[0].trim();
    else if (matchNotes) rawTelp = matchNotes[0].trim();
  }

  // 2. Ekstraksi pola backend "Telp:\s*...", "Pelanggan:\s*...", "Catatan:\s*..."
  const pipeTelpMatch = rawLoc.match(/Telp:\s*([^|•]+)/i);
  if (pipeTelpMatch) {
    if (!rawTelp) rawTelp = pipeTelpMatch[1].trim();
    rawLoc = rawLoc.replace(/Telp:\s*[^|•]+/gi, '').trim();
  }

  const pipePelangganMatch = rawLoc.match(/Pelanggan:\s*([^|•]+)/i);
  if (pipePelangganMatch) {
    if (!rawName || rawName.toLowerCase() === 'pelanggan' || rawName.toLowerCase() === 'pelanggan sto' || rawName.toLowerCase() === 'pelanggan telkom') {
      rawName = pipePelangganMatch[1].trim();
    }
    rawLoc = rawLoc.replace(/Pelanggan:\s*[^|•]+/gi, '').trim();
  }

  const pipeNoteMatch = rawLoc.match(/Catatan:\s*([^|]+)/i);
  if (pipeNoteMatch) {
    if (!rawNotes) rawNotes = pipeNoteMatch[1].trim();
    rawLoc = rawLoc.replace(/\|\s*Catatan:\s*[^|]+/gi, '').trim();
  }

  // 3. Ekstraksi kurung siku catatan [catatan]
  const bracketNoteMatch = rawLoc.match(/\[(.*?)\]/);
  if (bracketNoteMatch) {
    if (!rawNotes) rawNotes = bracketNoteMatch[1].trim();
    rawLoc = rawLoc.replace(/\[(.*?)\]/g, '').trim();
  }

  // 4. Bersihkan nomor telepon
  const digitsOnly = (rawTelp || '').replace(/[^0-9]/g, '');
  const cleanTelp = digitsOnly.length >= 7 ? rawTelp.replace(/[()—_]/g, '').replace(/\s+/g, ' ').trim() : null;

  // 5. Bersihkan nama dari digit telepon, kurung, dan simbol artefak
  let name = rawName
    .replace(phonePattern, '')
    .replace(/[0-9]{6,}/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[|•()—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanTelp) {
    const rawDigits = cleanTelp.replace(/[^0-9]/g, '');
    if (rawDigits.length >= 7) {
      name = name.replace(new RegExp(rawDigits, 'g'), '').trim();
    }
  }

  // Fallback nama jika kosong atau generik
  if (!name || name.toLowerCase() === 'pelanggan' || name.toLowerCase() === 'pelanggan sto' || name.toLowerCase() === 'pelanggan telkom') {
    if (rawLoc.includes(' - ')) {
      const parts = rawLoc.split(' - ');
      const possibleName = parts[0]
        .replace(phonePattern, '')
        .replace(/[0-9]{6,}/g, '')
        .replace(/[•()—]/g, '')
        .trim();
      if (
        possibleName &&
        !possibleName.toLowerCase().startsWith('jl') &&
        !possibleName.toLowerCase().startsWith('jalan') &&
        !possibleName.toLowerCase().startsWith('kel') &&
        !possibleName.toLowerCase().startsWith('kec') &&
        possibleName.length < 35
      ) {
        name = possibleName;
        rawLoc = parts.slice(1).join(' - ');
      }
    }
  }
  if (!name) name = 'Pelanggan STO';

  // 6. Bersihkan alamat dari nomor telepon dan nama pelanggan berulang
  let address = rawLoc
    .replace(phonePattern, '')
    .replace(/[0-9]{6,}/g, '');

  if (name && name.toLowerCase() !== 'pelanggan' && name.toLowerCase() !== 'pelanggan sto' && name.toLowerCase() !== 'pelanggan telkom') {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    address = address.replace(new RegExp(escapedName, 'gi'), ' ');
  }

  address = address
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[|•]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();

  if (!address) address = 'Wilayah STO Payakumbuh';

  return {
    name,
    telp: cleanTelp,
    address,
    note: rawNotes || null
  };
};

// Helper badge konfigurasi jenis penugasan teknisi
const getTaskTypeConfig = (jenisKerja) => {
  const jk = (jenisKerja || '').toLowerCase();
  if (jk.includes('pasang') || jk.includes('psb')) {
    return {
      label: 'Pasang Baru',
      badgeBg: 'bg-blue-950/60 text-blue-400 border border-blue-500/30',
      badgeText: 'Pasang Baru'
    };
  }
  if (jk.includes('kabel') || jk.includes('putus') || jk.includes('dropcore') || jk.includes('gangguan') || jk.includes('repair') || jk.includes('los')) {
    return {
      label: 'Gangguan',
      badgeBg: 'bg-rose-950/60 text-rose-400 border border-rose-500/30',
      badgeText: 'Gangguan'
    };
  }
  if (jk.includes('maintenance') || jk.includes('odp') || jk.includes('feeder')) {
    return {
      label: 'Maintenance',
      badgeBg: 'bg-purple-950/60 text-purple-400 border border-purple-500/30',
      badgeText: 'Maintenance'
    };
  }
  return {
    label: 'Relokasi',
    badgeBg: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
    badgeText: 'Relokasi'
  };
};

// Helper pembeda nama teknisi agar tidak ada badge kembar membingungkan (contoh: "Reza R." dan "Reza T.")
const getTechDisplayName = (tech, allTechs = []) => {
  if (!tech?.nama_lengkap) return 'Teknisi';
  const fullName = tech.nama_lengkap.trim();
  const parts = fullName.split(/\s+/);
  if (parts.length === 1) return parts[0];

  const firstName = parts[0];
  const hasDuplicateFirstName = allTechs.some(t =>
    Number(t.id) !== Number(tech.id) &&
    t.nama_lengkap?.trim().toLowerCase().split(/\s+/)[0] === firstName.toLowerCase()
  );

  if (hasDuplicateFirstName) {
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }

  return parts.length > 1 ? `${firstName} ${parts[parts.length - 1].charAt(0)}.` : firstName;
};

function DashboardPimpinan() {
  const [activeMenu, setActiveMenu] = useState(() => {
    try {
      const saved = localStorage.getItem('sto_active_tab_pimpinan');
      const valid = ['dashboard', 'tracking', 'tabel-odp', 'kelola-tugas', 'approval', 'laporan-kerja', 'laporan-gudang', 'tabel-pelanggan', 'kelola-pegawai'];
      return saved && valid.includes(saved) ? saved : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const handleSetActiveMenu = (tab) => {
    setActiveMenu(tab);
    try {
      localStorage.setItem('sto_active_tab_pimpinan', tab);
    } catch {}
  };

  // Reset tab ke overview dashboard jika logo diklik
  useEffect(() => {
    const handleReset = (e) => {
      if (!e.detail?.role || e.detail.role === 'pimpinan') {
        setActiveMenu('dashboard');
      }
    };
    window.addEventListener('sto:reset-dashboard-tab', handleReset);
    return () => window.removeEventListener('sto:reset-dashboard-tab', handleReset);
  }, []);

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showAddPegawaiModal, setShowAddPegawaiModal] = useState(false);
  const [bastpModalTask, setBastpModalTask] = useState(null);
  const [selectedTrackingTaskId, setSelectedTrackingTaskId] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState(null);

  const navigate = useNavigate();
  const { isDark } = useTheme();
  const {
    tugas = [],
    permohonan = [],
    barang = [],
    users = [],
    sidebarCollapsed
  } = useApp();

  // Proteksi sesi pimpinan
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || user.role !== 'pimpinan') {
        navigate('/');
      }
    } catch {
      navigate('/');
    }
  }, [navigate]);

  // Daftar teknisi lapangan asli
  const fieldTechnicians = useMemo(() => {
    return users.filter(u =>
      u.role === 'teknisi' &&
      Number(u.id) !== 99 &&
      !String(u.nama_lengkap || '').toLowerCase().includes('pool')
    );
  }, [users]);

  // Helper normalisasi status tiket
  const isDoneTask = useCallback((status) => ['done', 'selesai', 'closed'].includes(String(status || '').toLowerCase()), []);
  const isProgressTask = useCallback((status) => ['progress', 'in_progress', 'assigned', 'pengerjaan'].includes(String(status || '').toLowerCase()), []);

  // =========================================================================
  // SECTION 1: EXECUTIVE KPI STRIP METRICS
  // =========================================================================
  const totalTasks = tugas.length;
  const progressTasks = useMemo(() => tugas.filter(t => isProgressTask(t.status)).length, [tugas, isProgressTask]);
  const doneTasks = useMemo(() => tugas.filter(t => isDoneTask(t.status)).length, [tugas, isDoneTask]);
  const pendingRequests = useMemo(() => permohonan.filter(p => String(p.status || '').toLowerCase() === 'pending').length, [permohonan]);

  // Breakdown mikro Kolom 1: Pasang Baru vs Gangguan
  const psbCount = useMemo(() => {
    return tugas.filter(t => {
      const jk = (t.jenis_kerja || '').toLowerCase();
      return jk.includes('pasang') || jk.includes('psb');
    }).length;
  }, [tugas]);

  const gangguanCount = useMemo(() => {
    return tugas.filter(t => {
      const jk = (t.jenis_kerja || '').toLowerCase();
      return jk.includes('gangguan') || jk.includes('repair') || jk.includes('putus') || jk.includes('los');
    }).length;
  }, [tugas]);

  // Breakdown mikro Kolom 2: Teknisi Aktif
  const activeTechCount = useMemo(() => {
    return fieldTechnicians.filter(tech =>
      tugas.some(t => Number(t.teknisi_id) === Number(tech.id) && isProgressTask(t.status))
    ).length;
  }, [fieldTechnicians, tugas, isProgressTask]);

  // Breakdown mikro Kolom 3: % Kepatuhan Redaman Optik Ideal (-16 s/d -24 dBm)
  const doneTasksList = useMemo(() => tugas.filter(t => isDoneTask(t.status)), [tugas, isDoneTask]);
  const attenuationPercent = useMemo(() => {
    if (doneTasksList.length === 0) return 100;
    const compliant = doneTasksList.filter(t => {
      const rawVal = parseFloat(t.redaman_dbm || t.bastp?.redaman_dbm || '-18.5');
      const val = Math.abs(rawVal);
      return val >= 16 && val <= 24;
    }).length;
    return Math.round((compliant / doneTasksList.length) * 100);
  }, [doneTasksList]);

  // Pembagian Teknisi: Sedang Bertugas vs Siaga di Posko
  const activeTechAssignments = useMemo(() => {
    const list = [];
    fieldTechnicians.forEach(tech => {
      const currentTask = tugas.find(t =>
        Number(t.teknisi_id) === Number(tech.id) && isProgressTask(t.status)
      );
      if (currentTask) {
        list.push({ tech, currentTask });
      }
    });
    return list;
  }, [fieldTechnicians, tugas, isProgressTask]);

  const idleTechnicians = useMemo(() => {
    return fieldTechnicians.filter(tech =>
      !tugas.some(t => Number(t.teknisi_id) === Number(tech.id) && isProgressTask(t.status))
    );
  }, [fieldTechnicians, tugas, isProgressTask]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0f1d] text-white transition-colors duration-300">
      
      {/* Left Sidebar Layout */}
      <ModernSidebar activeTab={activeMenu} onTabChange={handleSetActiveMenu} />

      {/* Main Content Area beside Sidebar */}
      <main className={`flex-1 min-w-0 flex flex-col ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} transition-all duration-300`}>
        <div className="p-2.5 sm:p-4 space-y-3 flex-1 max-w-7xl w-full mx-auto">
          
          {/* Header Banner (Enterprise Telecom Standard) */}
          <div className="p-3 sm:p-3.5 rounded-2xl border bg-slate-950/70 backdrop-blur-xl border-rose-950/30 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
                <h1 className="text-lg font-extrabold text-white tracking-tight">
                  {activeMenu === 'dashboard' && 'Dashboard Pimpinan'}
                  {activeMenu === 'tracking' && 'Peta WebGIS & Radar Armada'}
                  {activeMenu === 'tabel-odp' && 'Inventarisasi Aset Jaringan'}
                  {activeMenu === 'kelola-tugas' && 'Kelola Tiket Tugas'}
                  {activeMenu === 'approval' && 'Persetujuan Material'}
                  {activeMenu === 'laporan-kerja' && 'Laporan Kerja Lapangan'}
                  {activeMenu === 'laporan-gudang' && 'Laporan Logistik Gudang'}
                  {activeMenu === 'tabel-pelanggan' && 'Data Pelanggan & Aset'}
                  {activeMenu === 'kelola-pegawai' && 'Kelola Pegawai'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeMenu === 'kelola-pegawai' ? (
                <button
                  type="button"
                  onClick={() => setShowAddPegawaiModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Tambah Pegawai</span>
                </button>
              ) : activeMenu === 'laporan-gudang' ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('sto:export-gudang'))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              ) : activeMenu === 'tabel-pelanggan' ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('sto:export-pelanggan'))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Data</span>
                </button>
              ) : activeMenu === 'laporan-kerja' ? (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-sm transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rekap</span>
                </button>
              ) : activeMenu === 'tabel-odp' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('sto:export-odp'))}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('sto:open-add-odp'))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ ODP</span>
                  </button>
                </div>
              ) : activeMenu === 'approval' ? null : (
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tiket Baru</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: DASHBOARD LENGKAP */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* ============================================================= */}
              {/* SECTION 1: EXECUTIVE KPI STRIP (4 Key Pillars) */}
              {/* ============================================================= */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                
                {/* 1. Kolom 1 (Total Operasi) */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-slate-950/70 backdrop-blur-xl border-rose-950/30 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Total Operasi
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-300">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tracking-tight">
                      {totalTasks}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono">
                    <span className="text-blue-400 font-bold">{psbCount} PSB</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-rose-400 font-bold">{gangguanCount} Gangguan</span>
                  </div>
                </div>

                {/* 2. Kolom 2 (In-Flight Operations) */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-slate-950/70 backdrop-blur-xl border-blue-950/40 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        In-Flight Operations
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.2)]">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-1 font-mono tracking-tight">
                      {progressTasks}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                    <span className="relative flex h-1.5 w-1.5 mr-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">{activeTechCount} Teknisi</span>
                    <span className="text-slate-400">On-Duty</span>
                  </div>
                </div>

                {/* 3. Kolom 3 (Resolved & QC Passed) */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-slate-950/70 backdrop-blur-xl border-emerald-950/40 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Resolved &amp; QC Passed
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono tracking-tight">
                      {doneTasks}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                    <span className="text-slate-400">Kepatuhan Redaman:</span>
                    <span className="font-mono font-bold text-cyan-400">{attenuationPercent}% Optimal</span>
                  </div>
                </div>

                {/* 4. Kolom 4 (Approval Bottleneck / Action Required) */}
                <div
                  onClick={() => handleSetActiveMenu('approval')}
                  className="p-3 sm:p-3.5 rounded-xl border bg-slate-950/70 backdrop-blur-xl border-amber-500/40 hover:border-amber-400 shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:scale-[1.02] transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  title="Klik untuk meninjau permohonan material teknisi"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider group-hover:text-amber-300 transition">
                        Approval Bottleneck
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.25)] group-hover:scale-110 transition">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono tracking-tight group-hover:text-amber-300 transition">
                      {pendingRequests}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                    <span className="text-slate-400">Status Permohonan:</span>
                    <span className="font-bold text-amber-300 flex items-center gap-1 group-hover:underline">
                      <span>{pendingRequests > 0 ? 'Perlu Tindakan' : 'Semua Clear'}</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>

              </div>

              {/* ============================================================= */}
              {/* SECTION 2: OPERATIONAL WORKLOAD & QUALITY BENCHMARK */}
              {/* ============================================================= */}
              <AnalyticsChartsPimpinan
                tugas={tugas}
                barang={barang}
                permohonan={permohonan}
                onNavigateGudang={() => handleSetActiveMenu('laporan-gudang')}
              />

              {/* ============================================================= */}
              {/* SECTION 3: LIVE FIELD DISPATCH & ACTIVITY LEDGER (65% : 35%) */}
              {/* ============================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
                
                {/* KOLOM KIRI (65% ~ 8/12): Ledger Penugasan Terkini (Fixed-Width Table) */}
                <div className="lg:col-span-8 p-3.5 sm:p-4 rounded-2xl border bg-slate-950/70 backdrop-blur-xl border-rose-950/30 shadow-[0_8px_30px_rgba(0,0,0,0.35)] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-500" />
                      <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                        Ledger Penugasan Terkini
                      </h2>
                    </div>
                    <button
                      onClick={() => handleSetActiveMenu('laporan-kerja')}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Lihat Semua</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Table fixed-width tanpa horizontal scrollbar */}
                  <div className="w-full overflow-hidden rounded-xl border border-white/5">
                    <table className="w-full table-fixed text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/90 text-slate-400 border-b border-rose-950/40 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-2.5 py-2 font-bold w-[24%]">ID &amp; Pekerjaan</th>
                          <th className="px-2.5 py-2 font-bold w-[44%]">Informasi Pelanggan &amp; Alamat</th>
                          <th className="px-2.5 py-2 font-bold w-[20%]">Teknisi Bertugas</th>
                          <th className="px-1.5 py-2 text-center font-bold w-[12%]">Status &amp; BASTP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-950/20">
                        {tugas.slice(0, 5).map(t => {
                          const tech = users.find(u => Number(u.id) === Number(t.teknisi_id));
                          const cust = parseTelecomTaskDetails(t);
                          const isDone = isDoneTask(t.status);
                          const isProgress = isProgressTask(t.status);
                          const taskTypeCfg = getTaskTypeConfig(t.jenis_kerja);

                          return (
                            <tr key={t.id} className="hover:bg-rose-950/10 transition-colors">
                              {/* Kolom 1: ID Tiket & Jenis Pekerjaan */}
                              <td className="px-2.5 py-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-black text-rose-500 text-xs shrink-0">
                                    #{t.id}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold border tracking-wide truncate ${taskTypeCfg.badgeBg}`}>
                                    {taskTypeCfg.badgeText}
                                  </span>
                                </div>
                              </td>

                              {/* Kolom 2: Informasi Pelanggan & Alamat (Diparsing Bersih Tanpa Duplikasi) */}
                              <td className="px-2.5 py-2">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-extrabold text-white text-xs truncate">
                                    <span>{cust.name}</span>
                                    {cust.telp && (
                                      <span className="text-[10px] text-slate-400 font-mono font-normal ml-1">
                                        • {cust.telp}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate" title={cust.address}>
                                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span className="truncate max-w-[240px]">
                                      {cust.address?.length > 40 ? `${cust.address.slice(0, 40)}...` : cust.address}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Kolom 3: Teknisi Bertugas */}
                              <td className="px-2.5 py-2">
                                <div className="truncate min-w-0">
                                  {tech ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTechnician(tech)}
                                      className="font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1.5 cursor-pointer transition text-left truncate w-full"
                                      title={tech.nama_lengkap}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0"></span>
                                      <span className="truncate">{tech.nama_lengkap}</span>
                                    </button>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                                      📢 Open Pool
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Kolom 4: Status Tiket & BASTP */}
                              <td className="px-1.5 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {isDone ? (
                                    <>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                        Done
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setBastpModalTask(t)}
                                        className="p-1 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-[9px] font-bold transition cursor-pointer"
                                        title="Buka Rekap BASTP"
                                      >
                                        <FileText className="w-2.5 h-2.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      isProgress
                                        ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                                        : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                                    }`}>
                                      {t.status || 'Open'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KOLOM KANAN (35% ~ 4/12): Status Penugasan Tim Teknisi */}
                <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-2xl border bg-slate-950/70 backdrop-blur-xl border-rose-950/30 shadow-[0_8px_30px_rgba(0,0,0,0.35)] space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-rose-500" />
                      <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                        Status Tim Teknisi
                      </h2>
                    </div>

                    <button
                      onClick={() => handleSetActiveMenu('tracking')}
                      className="px-2 py-0.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-400 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>Radar WebGIS</span>
                    </button>
                  </div>

                  {/* Bagian Atas: Teknisi Aktif Lapangan (On-Duty) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      <span>Teknisi Aktif ({activeTechAssignments.length})</span>
                    </div>

                    {activeTechAssignments.length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-[10px] text-slate-400 italic text-center">
                        Tidak ada teknisi aktif di lapangan saat ini.
                      </div>
                    ) : (
                      activeTechAssignments.map(({ tech, currentTask }) => {
                        const cust = parseTelecomTaskDetails(currentTask);
                        const taskCfg = getTaskTypeConfig(currentTask.jenis_kerja);

                        return (
                          <div
                            key={tech.id}
                            className="p-2 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/30 transition-all flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {tech.nama_lengkap?.charAt(0) || 'T'}
                                </div>
                                <div className="leading-tight">
                                  <div className="text-[11px] font-bold text-white">{tech.nama_lengkap}</div>
                                  <div className="text-[9px] text-slate-400 font-mono">Tiket #{currentTask.id}</div>
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold border ${taskCfg.badgeBg}`}>
                                {taskCfg.badgeText}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-300 flex items-center gap-1 truncate">
                              <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                              <span className="truncate" title={cust.address}>{cust.address}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => setSelectedTechnician(tech)}
                                className="text-[9px] text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                              >
                                <User className="w-2.5 h-2.5" />
                                <span>Detail</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTrackingTaskId(currentTask.id);
                                  handleSetActiveMenu('tracking');
                                }}
                                className="px-1.5 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <MapPin className="w-2 h-2" />
                                <span>Lacak</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bagian Bawah: Teknisi Siaga / Posko (Standby) */}
                  <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <span>Siaga di Posko ({idleTechnicians.length})</span>
                    </div>

                    {idleTechnicians.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic">
                        Semua teknisi sedang aktif di lapangan.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {idleTechnicians.map(tech => (
                          <button
                            key={tech.id}
                            type="button"
                            onClick={() => setSelectedTechnician(tech)}
                            className="px-2 py-0.5 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer group"
                            title={tech.nama_lengkap}
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-300 group-hover:text-white transition truncate max-w-[120px]">
                              {getTechDisplayName(tech, fieldTechnicians)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PUSAT KENDALI WEBGIS ODP */}
          {activeMenu === 'tracking' && (
            <div className="animate-in fade-in duration-200">
              <WebGISTracking initialSelectedTaskId={selectedTrackingTaskId} />
            </div>
          )}

          {/* TAB 2.5: TABEL INVENTARISASI ASET JARINGAN (ODP, TIANG FO, ODC) */}
          {activeMenu === 'tabel-odp' && (
            <div className="animate-in fade-in duration-200">
              <TabelAsetJaringan hideHeader={true} onNavigateToWebGis={() => handleSetActiveMenu('tracking')} />
            </div>
          )}

          {/* TAB 3: MANAJEMEN PENUGASAN LAPANGAN (CRUD TIKET) */}
          {activeMenu === 'kelola-tugas' && (
            <div className="animate-in fade-in duration-200">
              <KelolaTugas
                onOpenCreateModal={() => setShowCreateTaskModal(true)}
                onOpenBastp={setBastpModalTask}
              />
            </div>
          )}

          {/* TAB 4: PERMOHONAN DARI TEKNISI (APPROVAL MATERIAL) */}
          {activeMenu === 'approval' && (
            <div className="animate-in fade-in duration-200">
              <ApprovalMaterial />
            </div>
          )}

          {/* TAB 5: LAPORAN KERJA LAPANGAN */}
          {activeMenu === 'laporan-kerja' && (
            <div className="animate-in fade-in duration-200">
              <LaporanAudit hideHeader={true} />
            </div>
          )}

          {/* TAB 6: LAPORAN BARANG DARI GUDANG (MODULAR COMPONENT) */}
          {activeMenu === 'laporan-gudang' && (
            <div className="animate-in fade-in duration-200">
              <LaporanGudangPimpinan />
            </div>
          )}

          {/* TAB 7: DATA PELANGGAN & AUDIT PENARIKAN ASET STO */}
          {activeMenu === 'tabel-pelanggan' && (
            <div className="animate-in fade-in duration-200">
              <TabelPelangganAset hideHeader={true} />
            </div>
          )}

          {/* TAB 8: KELOLA AKUN & PEGAWAI */}
          {activeMenu === 'kelola-pegawai' && (
            <div className="animate-in fade-in duration-200">
              <KelolaPegawai
                hideHeader={true}
                showAddModal={showAddPegawaiModal}
                setShowAddModal={setShowAddPegawaiModal}
              />
            </div>
          )}

        </div>
      </main>

      {/* Modal: Buat Tiket Tugas Baru (SOP 1) */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-slate-900/95 backdrop-blur-2xl border border-rose-950/50 text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-rose-950/40 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-rose-500" />
                Buat &amp; Siarkan Tiket Kerja
              </h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <FormTugas onCreated={() => setShowCreateTaskModal(false)} />
          </div>
        </div>
      )}

      {/* Modal BASTP & Rekonsiliasi Material Digital */}
      {bastpModalTask && (
        <ModalBASTP
          task={bastpModalTask}
          onClose={() => setBastpModalTask(null)}
        />
      )}

      {/* Modal Detail & Riwayat Kerja Teknisi */}
      {selectedTechnician && (
        <ModalDetailRiwayatTeknisi
          teknisi={selectedTechnician}
          onClose={() => setSelectedTechnician(null)}
          onOpenBastp={setBastpModalTask}
          onNavigateToTracking={(taskId) => {
            setSelectedTrackingTaskId(taskId);
            handleSetActiveMenu('tracking');
          }}
        />
      )}

    </div>
  );
}

export default DashboardPimpinan;
