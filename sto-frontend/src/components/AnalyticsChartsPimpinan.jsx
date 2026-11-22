// oxlint-disable no-unused-vars
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Zap,
  Radio,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function AnalyticsChartsPimpinan({ tugas = [], barang = [], odp = [], onNavigateGudang }) {
  const { isDark } = useTheme();
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // =========================================================================
  // 4. DATA KALKULASI REAL-TIME: STATUS ODP & PORT (ANIMATED PIE / DONUT)
  // =========================================================================
  const totalOdp = odp.length || 0;
  const odpTersedia = odp.filter(o => o.status === 'Tersedia').length;
  const odpPenuh = odp.filter(o => o.status === 'Penuh').length;
  const odpMaint = odp.filter(o => o.status === 'Maintenance' || o.status === 'Optimasi').length;
  const calcTotalOdp = totalOdp > 0 ? totalOdp : 1;

  const odpRadius = 40;
  const odpCircumference = 2 * Math.PI * odpRadius; // 251.32
  const tersediaStroke = (odpTersedia / calcTotalOdp) * odpCircumference;
  const penuhStroke = (odpPenuh / calcTotalOdp) * odpCircumference;
  const maintStroke = (odpMaint / calcTotalOdp) * odpCircumference;

  const tersediaPercent = totalOdp > 0 ? Math.round((odpTersedia / totalOdp) * 100) : 0;
  const penuhPercent = totalOdp > 0 ? Math.round((odpPenuh / totalOdp) * 100) : 0;
  const maintPercent = totalOdp > 0 ? Math.max(0, 100 - tersediaPercent - penuhPercent) : 0;

  const totalPorts = odp.reduce((acc, curr) => acc + (Number(curr.kapasitas_port) || 8), 0);
  const usedPorts = odp.reduce((acc, curr) => acc + (Number(curr.port_terpakai) || 0), 0);
  const idlePorts = Math.max(0, totalPorts - usedPorts);
  const portOkupansiPct = totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0;

  // =========================================================================
  // 1. DATA KALKULASI REAL-TIME: STATUS TIKET (DONUT / PIE CHART)
  // =========================================================================
  const totalTasks = tugas.length || 0;
  const isDoneTask = (status) => ['done', 'selesai', 'closed'].includes(String(status || '').toLowerCase());
  const isProgressTask = (status) => ['progress', 'in_progress', 'assigned', 'pengerjaan'].includes(String(status || '').toLowerCase());

  const doneCount = tugas.filter(t => isDoneTask(t.status)).length;
  const progressCount = tugas.filter(t => isProgressTask(t.status)).length;
  const waitingCount = Math.max(0, totalTasks - doneCount - progressCount);

  const donePercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
  const progressPercent = totalTasks > 0 ? Math.round((progressCount / totalTasks) * 100) : 0;
  const waitingPercent = totalTasks > 0 ? Math.max(0, 100 - donePercent - progressPercent) : 0;

  // SVG Donut calculation (circumference = 2 * pi * r = 2 * 3.14159 * 40 = 251.32)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const calcTotal = totalTasks > 0 ? totalTasks : 1;
  const doneStroke = (doneCount / calcTotal) * circumference;
  const progressStroke = (progressCount / calcTotal) * circumference;
  const waitingStroke = (waitingCount / calcTotal) * circumference;

  // =========================================================================
  // 2. DATA KALKULASI REAL-TIME: JENIS PEKERJAAN (BAR CHART)
  // =========================================================================
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
      desc: 'Instalasi Baru IndiHome',
      count: countPasangBaru,
      pct: totalTasks > 0 ? Math.round((countPasangBaru / totalTasks) * 100) : 0,
      color: 'from-blue-600 to-cyan-500',
      badgeBg: 'bg-blue-950/60 text-blue-400 border-blue-500/30'
    },
    {
      key: 'gangguan',
      label: 'Gangguan (Repair)',
      desc: 'Assurance & Splicing Putus',
      count: countGangguan,
      pct: totalTasks > 0 ? Math.round((countGangguan / totalTasks) * 100) : 0,
      color: 'from-rose-600 to-rose-500',
      badgeBg: 'bg-rose-950/60 text-rose-400 border-rose-500/30'
    },
    {
      key: 'maintenance',
      label: 'Maintenance ODP/Feeder',
      desc: 'Pemeliharaan Sinyal Optik',
      count: countMaintenance,
      pct: totalTasks > 0 ? Math.round((countMaintenance / totalTasks) * 100) : 0,
      color: 'from-purple-600 to-indigo-500',
      badgeBg: 'bg-purple-950/60 text-purple-400 border-purple-500/30'
    },
    {
      key: 'relokasi',
      label: 'Dismantling / Relokasi',
      desc: 'Penarikan & Pindah Jalur',
      count: countRelokasi,
      pct: totalTasks > 0 ? Math.round((countRelokasi / totalTasks) * 100) : 0,
      color: 'from-amber-600 to-orange-500',
      badgeBg: 'bg-amber-950/60 text-amber-400 border-amber-500/30'
    }
  ];

  const maxTaskCount = Math.max(...taskCategories.map(c => c.count), 1);
  const dominantCategory = taskCategories.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), taskCategories[0]);

  // =========================================================================
  // 3. DATA KALKULASI REAL-TIME: TINGKAT KETERSEDIAAN MATERIAL GUDANG
  // =========================================================================
  const inventoryItems = (Array.isArray(barang) ? barang : []).slice(0, 5).map(b => {
    const stokNum = Number(b.stok || 0);
    const threshold = 15;
    const isCritical = stokNum <= 10;
    const isLow = stokNum > 10 && stokNum <= 25;
    const fillPercent = Math.min(100, Math.round((stokNum / 100) * 100));

    return {
      nama: b.nama_barang || 'Material',
      stok: stokNum,
      satuan: b.satuan || 'unit',
      percent: fillPercent,
      isCritical,
      isLow,
      isSafe: !isCritical && !isLow
    };
  });

  // Indikator Kualitas Sinyal (Redaman)
  const doneTasksList = tugas.filter(t => isDoneTask(t.status));
  const compliantCount = doneTasksList.filter(t => {
    const rawVal = parseFloat(t.redaman_dbm || t.bastp?.redaman_dbm || '-18.5');
    const val = Math.abs(rawVal);
    return val >= 16 && val <= 24;
  }).length;
  const attenuationPercent = doneTasksList.length > 0
    ? Math.round((compliantCount / doneTasksList.length) * 100)
    : 100;

  return (
    <div className="space-y-3.5">
      {/* GRID UTAMA: 4 GRAFIK REALTIME (PIE STATUS TIKET, BAR JENIS KERJA, STATUS MATERIAL, & PIE STATUS ODP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* ================================================================= */}
        {/* VISUAL 1: PIE / DONUT CHART (Distribusi Tiket & SLA Realtime) */}
        {/* ================================================================= */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/30 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between transition-all overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Status Tiket
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono">
                {donePercent}% Selesai
              </span>
            </div>

            {/* SVG Donut Graphic */}
            <div className="flex items-center justify-center gap-3 py-1.5">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={isDark ? '#1e293b' : '#f1f5f9'}
                    strokeWidth="13"
                  />

                  {totalTasks > 0 ? (
                    <>
                      {/* Segment 1: Selesai (Emerald) */}
                      {doneCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="13"
                          strokeDasharray={`${doneStroke} ${circumference}`}
                          strokeDashoffset="0"
                          className="transition-all duration-700 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setHoveredSlice(`Selesai: ${doneCount} Tiket (${donePercent}%)`)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      )}

                      {/* Segment 2: Dikerjakan (Blue) */}
                      {progressCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="13"
                          strokeDasharray={`${progressStroke} ${circumference}`}
                          strokeDashoffset={-doneStroke}
                          className="transition-all duration-700 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setHoveredSlice(`Progress: ${progressCount} Tiket (${progressPercent}%)`)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      )}

                      {/* Segment 3: Siaga Terbuka (Amber) */}
                      {waitingCount > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="13"
                          strokeDasharray={`${waitingStroke} ${circumference}`}
                          strokeDashoffset={-(doneStroke + progressStroke)}
                          className="transition-all duration-700 cursor-pointer hover:opacity-80"
                          onMouseEnter={() => setHoveredSlice(`Siaga Terbuka: ${waitingCount} Tiket (${waitingPercent}%)`)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      )}
                    </>
                  ) : (
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="13"
                      strokeDasharray="2 4"
                    />
                  )}
                </svg>

                {/* Center Donut Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-lg font-black text-white">{totalTasks}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1 truncate max-w-[70px]">
                    {hoveredSlice ? 'Info' : 'Total'}
                  </span>
                </div>
              </div>

              {/* Legend Kolom Kanan */}
              <div className="space-y-1.5 text-xs shrink-0">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="text-slate-300 text-[11px]">Selesai</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{doneCount} ({donePercent}%)</span>
                </div>
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <span className="text-slate-300 text-[11px]">Progress</span>
                  </div>
                  <span className="font-mono font-bold text-blue-400 text-xs">{progressCount} ({progressPercent}%)</span>
                </div>
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-slate-300 text-[11px]">Siaga</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-xs">{waitingCount} ({waitingPercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info Pie */}
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>SLA Realtime:</span>
            <span className="font-bold text-emerald-400 font-mono">{donePercent >= 70 ? 'Optimal (SLA Terpenuhi)' : 'Dalam Target'}</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VISUAL 2: DIAGRAM BATANG (BAR CHART) JENIS PEKERJAAN STO */}
        {/* ================================================================= */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/30 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between transition-all overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Jenis Tugas
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-500/30 font-mono">
                {totalTasks} Tiket
              </span>
            </div>

            {/* Horizontal Progress Bars untuk 4 Kategori Kerja */}
            <div className="space-y-2 pt-0.5">
              {taskCategories.map(cat => {
                const barWidth = Math.max(6, Math.round((cat.count / maxTaskCount) * 100));
                return (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${cat.color} shrink-0`}></span>
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <div className="flex items-center gap-1 font-mono text-xs shrink-0">
                        <span className="font-bold text-white">{cat.count}</span>
                        <span className="text-slate-400 text-[10px]">({cat.pct}%)</span>
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

          {/* Footer Info Bar */}
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dominasi Kerja:</span>
            <span className="font-bold text-blue-400 font-mono">{dominantCategory.label} ({dominantCategory.pct}%)</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VISUAL 3: RINGKASAN STOK MATERIAL GUDANG (STATUS SEDERHANA) */}
        {/* ================================================================= */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/30 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between transition-all overflow-hidden md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Stok Material
                </h3>
              </div>
              <button
                type="button"
                onClick={onNavigateGudang}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition cursor-pointer"
                title="Buka Data Gudang Lengkap"
              >
                <span>Gudang</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Indikator Status Material (Merah Menipis, Kuning Waspada, Hijau Aman) */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <div className="p-1.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-center">
                <span className="text-[9px] text-rose-400 font-bold block">Menipis</span>
                <span className="text-xs font-black text-rose-300 font-mono">
                  {(Array.isArray(barang) ? barang : []).filter(b => Number(b.stok || 0) <= 10).length}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-center">
                <span className="text-[9px] text-amber-400 font-bold block">Waspada</span>
                <span className="text-xs font-black text-amber-300 font-mono">
                  {(Array.isArray(barang) ? barang : []).filter(b => Number(b.stok || 0) > 10 && Number(b.stok || 0) <= 25).length}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-center">
                <span className="text-[9px] text-emerald-400 font-bold block">Aman</span>
                <span className="text-xs font-black text-emerald-300 font-mono">
                  {(Array.isArray(barang) ? barang : []).filter(b => Number(b.stok || 0) > 25).length}
                </span>
              </div>
            </div>

            {/* List Ringkas Material Lapangan */}
            <div className="space-y-1.5 pt-0.5">
              {inventoryItems.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-none">
                  <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[140px]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      item.isCritical ? 'bg-rose-500' : item.isLow ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="truncate">{item.nama}</span>
                  </span>
                  <span className={`font-mono text-xs font-bold shrink-0 ${
                    item.isCritical ? 'text-rose-400' : item.isLow ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {item.stok} {item.satuan}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Quality Strip */}
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Radio className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Redaman:</span>
            </div>
            <span className="font-bold text-cyan-400 font-mono">{attenuationPercent}% Optimal</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VISUAL 4: ANIMATED PIE / DONUT CHART STATUS ODP & OKUPANSI PORT */}
        {/* ================================================================= */}
        <div className="bg-slate-950/70 backdrop-blur-xl border border-rose-950/30 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between transition-all overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Status ODP
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 font-mono">
                {totalOdp} Titik
              </span>
            </div>

            {/* SVG Donut Graphic */}
            <div className="flex items-center justify-center gap-3 py-1.5">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={odpRadius}
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="12"
                  />
                  {/* Sektor 1: Tersedia (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={odpRadius}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${tersediaStroke} ${odpCircumference}`}
                    strokeDashoffset="0"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Sektor 2: Penuh (Rose) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={odpRadius}
                    fill="transparent"
                    stroke="#f43f5e"
                    strokeWidth="12"
                    strokeDasharray={`${penuhStroke} ${odpCircumference}`}
                    strokeDashoffset={`-${tersediaStroke}`}
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Sektor 3: Maintenance (Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={odpRadius}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${maintStroke} ${odpCircumference}`}
                    strokeDashoffset={`-${tersediaStroke + penuhStroke}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Center Port Idle Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-base font-black text-white font-mono leading-none">
                    {idlePorts}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                    Port Idle
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="space-y-1.5 shrink-0 text-[11px]">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>Tersedia:</span>
                  </span>
                  <strong className="font-mono text-emerald-400">{odpTersedia} ({tersediaPercent}%)</strong>
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span>Penuh:</span>
                  </span>
                  <strong className="font-mono text-rose-400">{odpPenuh} ({penuhPercent}%)</strong>
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span>Maintenance:</span>
                  </span>
                  <strong className="font-mono text-amber-400">{odpMaint} ({maintPercent}%)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Okupansi Port */}
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Total Port FO:</span>
            <span className="font-bold text-cyan-400 font-mono">{usedPorts}/{totalPorts} ({portOkupansiPct}% Okupansi)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
