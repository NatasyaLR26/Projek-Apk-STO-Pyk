import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Radio,
  Edit2,
  Trash2
} from 'lucide-react';
import WebGISMap from './WebGISMap';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

export default function WebGISTracking({ initialSelectedTaskId = null, onEditOdp = null }) {
  const { isDark } = useTheme();
  const {
    odp = [],
    deleteOdp
  } = useApp();

  const [selectedOdpId, setSelectedOdpId] = useState(null);
  const [selectedTugasId, setSelectedTugasId] = useState(initialSelectedTaskId);
  const [odpToEdit, setOdpToEdit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sinkronisasi prop initialSelectedTaskId saat berpindah tiket dari tab pimpinan
  useEffect(() => {
    if (initialSelectedTaskId !== undefined && initialSelectedTaskId !== null) {
      setSelectedTugasId(initialSelectedTaskId);
    }
  }, [initialSelectedTaskId]);

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

  const handleDeleteOdp = (id) => {
    if (window.confirm('Yakin ingin menghapus titik ODP ini dari WebGIS?')) {
      deleteOdp(id);
    }
  };

  // Filter ODP
  const filteredOdp = odp.filter((item) => {
    const matchSearch =
      item.kode_odp?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nama_lokasi?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL ODP</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-white font-mono">{totalOdp} Titik</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tersebar di Payakumbuh</div>
        </div>

        {/* Card 2: Port Tersedia */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-emerald-950/40 backdrop-blur-xl shadow-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">PORT TERSEDIA</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-emerald-400 font-mono">{totalIdlePorts} Port Idle</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Siap Pasang Baru</div>
        </div>

        {/* Card 3: ODP Penuh */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-rose-950/40 backdrop-blur-xl shadow-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">ODP PENUH</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-rose-400 font-mono">{penuhCount} Titik</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Okupansi 100%</div>
        </div>

        {/* Card 4: Perlu Optimasi */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/70 border-amber-950/40 backdrop-blur-xl shadow-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">PERLU OPTIMASI</div>
          <div className="text-xl sm:text-2xl font-black mt-0.5 text-amber-400 font-mono">{optimasiCount} Titik</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Redaman &gt; -24 dBm</div>
        </div>
      </div>

      {/* Grid: Map Utama */}
      <div className="h-[520px] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-800/80">
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

      {/* Panel Daftar & Kelola Data ODP */}
      <div className={`p-4 sm:p-5 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500" />
            <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Daftar Inventaris ODP
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ODP / Jalan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                } focus:outline-none focus:border-blue-500`}
              />
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              } focus:outline-none cursor-pointer`}
            >
              <option value="all">Semua Status</option>
              <option value="Tersedia">Tersedia</option>
              <option value="Penuh">Penuh</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        {/* ODP Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOdp.map((point) => {
            const isSelected = selectedOdpId === point.id;
            const totalPort = Number(point.kapasitas_port) || 8;
            const usedPort = Number(point.port_terpakai) || 0;
            const availablePort = Math.max(0, totalPort - usedPort);
            const percentUsed = Math.round((usedPort / totalPort) * 100);

            let statusBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            let barColor = 'bg-emerald-500';

            if (point.status === 'Maintenance' || Number(point.redaman_dbm) <= -24) {
              statusBadge = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
              barColor = 'bg-rose-500';
            } else if (availablePort === 0 || point.status === 'Penuh') {
              statusBadge = 'bg-red-500/20 text-red-400 border-red-500/30';
              barColor = 'bg-red-500';
            } else if (availablePort <= 1) {
              statusBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              barColor = 'bg-amber-500';
            }

            // Format redaman: Selalu menyertakan tanda minus, contoh "-18.5 dBm"
            const rawVal = point.redaman_dbm != null ? Number(point.redaman_dbm) : 18.5;
            const redamanMag = !isNaN(rawVal) && rawVal !== 0 ? Math.abs(rawVal) : 18.5;
            const formattedRedaman = `-${redamanMag.toFixed(1)} dBm`;

            let redamanBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            if (redamanMag > 24) {
              redamanBadgeClass = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
            } else if (redamanMag > 22) {
              redamanBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            }

            return (
              <div
                key={point.id}
                onClick={() => setSelectedOdpId(point.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/10'
                    : isDark
                    ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                      FO
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {point.kode_odp}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {Number(point.latitude).toFixed(4)}, {Number(point.longitude).toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge}`}>
                    {point.status}
                  </span>
                </div>

                <div className="mt-2.5 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">Alamat Tiang:</span>
                    <div className={`font-semibold text-[11px] truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {point.nama_lokasi}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-400">Okupansi Port:</span>
                      <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                        {usedPort} dari {totalPort} Port Terpakai ({availablePort} Kosong)
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percentUsed}%` }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-slate-400">Redaman Optik:</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border shrink-0 whitespace-nowrap ${redamanBadgeClass}`}>
                      {formattedRedaman}
                    </span>
                  </div>

                  {/* Action Buttons (Touch Target Minimum 40px untuk Kemudahan Tap Layar HP) */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditOdp(point);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOdp(point.id);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}