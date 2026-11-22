import React, { useState } from 'react';
import WebGISMap from './WebGISMap';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

export default function WebGISTracking({ initialSelectedTaskId = null, onEditOdp = null }) {
  const { isDark } = useTheme();
  const { odp = [] } = useApp();

  const [selectedOdpId, setSelectedOdpId] = useState(null);
  const [selectedTugasId, setSelectedTugasId] = useState(initialSelectedTaskId);
  const [odpToEdit, setOdpToEdit] = useState(null);

  // Handler Edit ODP standar React tanpa bergantung pada objek global window
  const handleEditOdp = (pointOrId) => {
    let target = pointOrId;
    if (typeof pointOrId === 'number' || typeof pointOrId === 'string') {
      target = odp.find(o => Number(o.id) === Number(pointOrId)) || null;
    }
    setOdpToEdit(target);
    if (typeof onEditOdp === 'function') {
      onEditOdp(target);
    }
  };

  // Statistik Geospasial ODP & Okupansi Port
  const totalOdp = odp.length;
  const totalIdlePorts = odp.reduce(
    (acc, curr) => acc + Math.max(0, (Number(curr.kapasitas_port) || 8) - (Number(curr.port_terpakai) || 0)),
    0
  );
  const penuhCount = odp.filter(
    (o) => o.status === 'Penuh' || (Number(o.kapasitas_port) || 8) - (Number(o.port_terpakai) || 0) <= 0
  ).length;
  const optimasiCount = odp.filter(
    (o) => o.status === 'Maintenance' || Number(o.redaman_dbm) <= -24
  ).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 4 Kartu KPI Atas (Telecom OSS Standard) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Total ODP */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/80 backdrop-blur-xl shadow-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL ODP</div>
          <div className={`text-xl sm:text-2xl font-black mt-0.5 font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalOdp} Titik</div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tersebar di Payakumbuh</div>
        </div>

        {/* Card 2: Port Tersedia */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-emerald-950/40 backdrop-blur-xl shadow-lg' : 'bg-emerald-50/70 border-emerald-200 shadow-sm'
        }`}>
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">PORT TERSEDIA</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400 font-mono">{totalIdlePorts} Port Idle</div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-emerald-700/80'}`}>Siap Pasang Baru</div>
        </div>

        {/* Card 3: ODP Penuh */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-rose-950/40 backdrop-blur-xl shadow-lg' : 'bg-rose-50/70 border-rose-200 shadow-sm'
        }`}>
          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">ODP PENUH</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-rose-600 dark:text-rose-400 font-mono">{penuhCount} Titik</div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-rose-700/80'}`}>Okupansi 100%</div>
        </div>

        {/* Card 4: Perlu Optimasi */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-amber-950/40 backdrop-blur-xl shadow-lg' : 'bg-amber-50/70 border-amber-200 shadow-sm'
        }`}>
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">PERLU OPTIMASI</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-400 font-mono">{optimasiCount} Titik</div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-amber-700/80'}`}>Redaman &gt; -24 dBm</div>
        </div>
      </div>

      {/* Grid: Map Utama WebGIS (Tampilan Luas, Bersih, dan Fokus Penuh) */}
      <div className={`h-[580px] sm:h-[640px] w-full rounded-3xl overflow-hidden shadow-2xl border ${
        isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-300 bg-white'
      }`}>
        <WebGISMap
          selectedOdpId={selectedOdpId}
          onSelectOdp={setSelectedOdpId}
          selectedTugasId={selectedTugasId}
          onSelectTugas={setSelectedTugasId}
          odpToEdit={odpToEdit}
          onClearEditOdp={() => setOdpToEdit(null)}
          onEditOdp={handleEditOdp}
        />
      </div>
    </div>
  );
}