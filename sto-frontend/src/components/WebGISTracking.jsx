import React, { useState } from 'react';
import WebGISMap, { getTaskTypeConfig } from './WebGISMap';
import { MapPin, Navigation, UserCheck, Wrench, Radio } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

function WebGISTracking({ initialSelectedTaskId = null }) {
  const { isDark } = useTheme();
  const { trackingGps, tugas, users } = useApp();
  const [selectedTugasId, setSelectedTugasId] = useState(initialSelectedTaskId);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
              <MapPin className="w-5 h-5" />
            </span>
            <span>Live WebGIS Tracking Teknisi & Titik Lapangan STO</span>
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pemantauan posisi realtime teknisi dan lokasi pemasangan / perbaikan pelanggan (Koto Nan IV Payakumbuh).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/30 border border-rose-500/30 text-rose-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 beacon-soft"></span>
            <span>{trackingGps.length} Armada Terhubung</span>
          </div>
        </div>
      </div>

      {/* Grid: Map Utama */}
      <div className="h-[520px] w-full rounded-2xl overflow-hidden shadow-xl">
        <WebGISMap selectedTugasId={selectedTugasId} onSelectTugas={setSelectedTugasId} />
      </div>

      {/* Daftar Armada Aktif & Lokasi Pemasangan/Perbaikan */}
      <div className={`p-4 sm:p-5 rounded-3xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-500" />
            <h2 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Detail Pekerjaan Armada Lapangan yang Sedang Berjalan
            </h2>
          </div>
          <span className="text-[10px] text-slate-400">
            Klik kartu untuk memfokuskan titik di peta
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trackingGps.map(gps => {
            const tech = users.find(u => Number(u.id) === Number(gps.teknisi_id));
            const activeTask = tugas.find(t =>
              (Number(t.id) === Number(gps.tugas_id) || Number(t.teknisi_id) === Number(gps.teknisi_id)) &&
              t.status !== 'Done'
            );
            const taskCfg = getTaskTypeConfig(activeTask?.jenis_kerja || 'Siaga');
            const isSelected = selectedTugasId === activeTask?.id;

            return (
              <div
                key={gps.id}
                onClick={() => activeTask && setSelectedTugasId(activeTask.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-500/10'
                    : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                      {tech?.nama_lengkap?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {tech?.nama_lengkap || 'Teknisi Lapangan'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {gps.waktu_update}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${taskCfg.badgeBg}`}>
                    {taskCfg.badgeText}
                  </span>
                </div>

                {activeTask ? (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">Tiket Penugasan:</span>
                      <strong style={{ color: taskCfg.bgColor }}>#{activeTask.id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Pelanggan: </span>
                      <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{activeTask.pelanggan_nama}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Lokasi Pasang/Perbaikan: </span>
                      <span className="text-slate-300 block text-[10px] truncate">{activeTask.lokasi}</span>
                    </div>
                    <div className="text-[10px] text-emerald-500 font-mono mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Kecepatan: {gps.kecepatan}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 italic">
                    Armada sedang siaga / belum mengambil tiket pekerjaan.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WebGISTracking;