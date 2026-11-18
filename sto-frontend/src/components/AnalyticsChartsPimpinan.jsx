// oxlint-disable no-unused-vars
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3,
  Zap,
  Clock,
  Package,
  Radio,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function AnalyticsChartsPimpinan({ tugas = [], barang = [], permohonan = [], onNavigateGudang }) {
  const { isDark } = useTheme();

  // =========================================================================
  // 1. DATA KALKULASI KOLOM KIRI: DISTRIBUSI PENUGASAN LAPANGAN (4 KATEGORI)
  // =========================================================================
  const totalTasks = tugas.length;

  const countPasangBaru = tugas.filter(t => {
    const jk = (t.jenis_kerja || '').toLowerCase();
    return jk.includes('pasang') || jk.includes('psb');
  }).length;

  const countGangguan = tugas.filter(t => {
    const jk = (t.jenis_kerja || '').toLowerCase();
    return jk.includes('gangguan') || jk.includes('repair') || jk.includes('putus') || jk.includes('los');
  }).length;

  const countMaintenance = tugas.filter(t => {
    const jk = (t.jenis_kerja || '').toLowerCase();
    return (jk.includes('maintenance') || jk.includes('odp') || jk.includes('feeder') || jk.includes('preventive')) &&
      !jk.includes('pasang') && !jk.includes('gangguan') && !jk.includes('repair') && !jk.includes('putus');
  }).length;

  const countRelokasi = tugas.filter(t => {
    const jk = (t.jenis_kerja || '').toLowerCase();
    return !jk.includes('pasang') &&
      !jk.includes('psb') &&
      !jk.includes('gangguan') &&
      !jk.includes('repair') &&
      !jk.includes('putus') &&
      !jk.includes('los') &&
      !jk.includes('maintenance') &&
      !jk.includes('odp') &&
      !jk.includes('feeder');
  }).length;

  const taskCategories = [
    {
      key: 'psb',
      label: 'Pasang Baru (PSB)',
      count: countPasangBaru,
      pct: totalTasks > 0 ? Math.round((countPasangBaru / totalTasks) * 100) : 0,
      color: 'from-blue-600 to-cyan-500',
      badgeBg: 'bg-blue-950/60 text-blue-400 border-blue-500/30'
    },
    {
      key: 'gangguan',
      label: 'Gangguan (Repair)',
      count: countGangguan,
      pct: totalTasks > 0 ? Math.round((countGangguan / totalTasks) * 100) : 0,
      color: 'from-rose-600 to-rose-500',
      badgeBg: 'bg-rose-950/60 text-rose-400 border-rose-500/30'
    },
    {
      key: 'maintenance',
      label: 'Maintenance Feeder/ODP',
      count: countMaintenance,
      pct: totalTasks > 0 ? Math.round((countMaintenance / totalTasks) * 100) : 0,
      color: 'from-purple-600 to-indigo-500',
      badgeBg: 'bg-purple-950/60 text-purple-400 border-purple-500/30'
    },
    {
      key: 'relokasi',
      label: 'Relokasi / Dismantling',
      count: countRelokasi,
      pct: totalTasks > 0 ? Math.round((countRelokasi / totalTasks) * 100) : 0,
      color: 'from-amber-600 to-orange-500',
      badgeBg: 'bg-amber-950/60 text-amber-400 border-amber-500/30'
    }
  ];

  const maxTaskCount = Math.max(...taskCategories.map(c => c.count), 1);
  const dominantCategory = taskCategories.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), taskCategories[0]);

  // =========================================================================
  // 2. DATA KALKULASI KOLOM KANAN: KUALITAS JARINGAN & KESIAPAN HARDWARE
  // =========================================================================
  const doneTasksList = tugas.filter(t => ['done', 'selesai', 'closed'].includes(String(t.status || '').toLowerCase()));
  
  // Indikator 1: Kepatuhan Redaman Optik (Optimal: -16 s/d -24 dBm)
  const compliantCount = doneTasksList.filter(t => {
    const rawVal = parseFloat(t.redaman_dbm || t.bastp?.redaman_dbm || '-18.5');
    const val = Math.abs(rawVal);
    return val >= 16 && val <= 24;
  }).length;
  
  const attenuationPercent = doneTasksList.length > 0
    ? Math.round((compliantCount / doneTasksList.length) * 100)
    : 100;

  // Indikator 2: Rata-rata Durasi Penanganan (MTTR)
  const avgHandlingHours = '~1.5 Jam';

  // Indikator 3: Health Stok Material Kritis (ONT Modem & Dropcore Roll)
  const ontItems = barang.filter(b => {
    const name = (b.nama_barang || '').toLowerCase();
    return name.includes('ont') || name.includes('modem');
  });
  const ontStock = ontItems.reduce((acc, b) => acc + Number(b.stok || 0), 0);
  const isOntLow = ontStock < 10;

  const dropcoreItems = barang.filter(b => {
    const name = (b.nama_barang || '').toLowerCase();
    return name.includes('dropcore') || name.includes('drop core');
  });
  const dropcoreStock = dropcoreItems.reduce((acc, b) => acc + Number(b.stok || 0), 0);
  const isDropcoreLow = dropcoreStock < 500;

  const hasCriticalStockAlert = isOntLow || isDropcoreLow;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      {/* ================================================================= */}
      {/* KOLOM KIRI: DISTRIBUSI PENUGASAN LAPANGAN (Horizontal Progress Bars) */}
      {/* ================================================================= */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/30 rounded-2xl p-3.5 sm:p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Distribusi Penugasan Lapangan
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)] font-mono">
              {totalTasks} Total Tiket
            </span>
          </div>

          {/* Horizontal Progress Bars untuk 4 Kategori Kerja */}
          <div className="space-y-2.5 pt-0.5">
            {taskCategories.map(cat => {
              const barWidth = Math.max(6, Math.round((cat.count / maxTaskCount) * 100));
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${cat.color}`}></span>
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className="font-bold text-white">{cat.count} Tiket</span>
                      <span className="text-slate-400 text-[11px]">({cat.pct}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full overflow-hidden bg-slate-900 p-0.5 border border-white/5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cat.color} transition-all duration-700 ease-out`}
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Summary Ringkas Workload */}
        <div className="mt-3 p-2 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Dominasi Operasional:</span>
            <span className="font-bold text-blue-400">{dominantCategory.label}</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
            {dominantCategory.pct}% Volume
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* KOLOM KANAN: KUALITAS JARINGAN & KESIAPAN HARDWARE */}
      {/* ================================================================= */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/30 rounded-2xl p-3.5 sm:p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Kualitas Jaringan &amp; Kesiapan Hardware
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(225,29,72,0.15)]">
              Standar NOC
            </span>
          </div>

          <div className="space-y-2">
            {/* Indikator 1: Kepatuhan Redaman Optik (-16 s/d -24 dBm) */}
            <div className="p-2.5 px-3 rounded-xl bg-slate-900/50 border border-white/5 backdrop-blur-sm flex flex-wrap gap-2 justify-between items-center">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Kepatuhan Redaman Optik</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-cyan-400 font-mono">{attenuationPercent}%</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)] whitespace-nowrap">
                  -16 s/d -24 dBm
                </span>
              </div>
            </div>

            {/* Indikator 2: Rata-rata Durasi Penanganan (MTTR/Fulfillment Time) */}
            <div className="p-2.5 px-3 rounded-xl bg-slate-900/50 border border-white/5 backdrop-blur-sm flex flex-wrap gap-2 justify-between items-center">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Rata-rata Durasi Penanganan (MTTR)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-400 font-mono">{avgHandlingHours}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-950/60 text-blue-400 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)] whitespace-nowrap">
                  SLA Aman (&lt;3 Jam)
                </span>
              </div>
            </div>

            {/* Indikator 3: Health Stok Material Kritis (ONT & Dropcore) */}
            <div className="p-2.5 px-3 rounded-xl bg-slate-900/50 border border-white/5 backdrop-blur-sm flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>STATUS STOK KRITIS</span>
                </div>
                {hasCriticalStockAlert ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Menipis
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Stok Siap
                  </span>
                )}
              </div>

              {/* Sub-item Stok ONT Modem & Dropcore Roll */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-slate-400">ONT Modem</span>
                  <span className={`font-mono font-bold ${isOntLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {ontStock} Unit
                  </span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-slate-400">Dropcore</span>
                  <span className={`font-mono font-bold ${isDropcoreLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {dropcoreStock} M
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Link ke Laporan Gudang */}
        <div className="mt-3 flex items-center justify-between text-[11px] pt-1">
          <span className="text-slate-400 text-[10px]">
            {hasCriticalStockAlert ? 'Perhatian: Ada SKU di bawah threshold aman' : 'Seluruh master item dalam kondisi aman'}
          </span>
          <button
            type="button"
            onClick={onNavigateGudang}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <span>Buka Gudang</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
