import React from 'react';
import WebGISMap from './WebGISMap';
import { MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function WebGISTracking() {
  const { isDark } = useTheme();

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
              <MapPin className="w-5 h-5" />
            </span>
            <span>Live WebGIS Tracking Teknisi STO</span>
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pemantauan GPS armada lapangan real-time dengan pilihan layer Satelit, Street, Dark, dan Topografi.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/30 border border-rose-500/30 text-rose-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>Sinyal GPS Aktif</span>
        </div>
      </div>

      {/* Interactive WebGIS Map with Google Maps Layer Switcher */}
      <div className="h-[560px] w-full">
        <WebGISMap />
      </div>
    </div>
  );
}

export default WebGISTracking;