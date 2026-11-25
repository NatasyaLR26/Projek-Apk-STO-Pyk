import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Snackbar({ notification, onClose }) {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    const duration = notification.duration || 4000;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        onClose();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [notification, onClose]);

  if (!notification) return null;

  const type = notification.type || 'success';
  const title = notification.title || (
    type === 'success' ? 'Berhasil' :
    type === 'error' ? 'Terjadi Kesalahan' :
    type === 'warning' ? 'Perhatian' : 'Informasi'
  );

  const getStyle = () => {
    switch (type) {
      case 'error':
        return {
          bg: isDark ? 'bg-slate-950/90 border-rose-500/50 shadow-rose-950/50' : 'bg-white/95 border-rose-300 shadow-rose-200/60',
          badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          badgeText: 'GAGAL',
          iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
          textColor: isDark ? 'text-white' : 'text-slate-900',
          subColor: isDark ? 'text-rose-200/90' : 'text-rose-900/90',
          barColor: 'bg-gradient-to-r from-rose-600 to-red-500',
          glow: 'shadow-rose-600/20',
          Icon: AlertCircle
        };
      case 'warning':
        return {
          bg: isDark ? 'bg-slate-950/90 border-amber-500/50 shadow-amber-950/50' : 'bg-white/95 border-amber-300 shadow-amber-200/60',
          badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          badgeText: 'PERHATIAN',
          iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          textColor: isDark ? 'text-white' : 'text-slate-900',
          subColor: isDark ? 'text-amber-200/90' : 'text-amber-900/90',
          barColor: 'bg-gradient-to-r from-amber-600 to-yellow-500',
          glow: 'shadow-amber-600/20',
          Icon: AlertTriangle
        };
      case 'info':
        return {
          bg: isDark ? 'bg-slate-950/90 border-blue-500/50 shadow-blue-950/50' : 'bg-white/95 border-blue-300 shadow-blue-200/60',
          badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          badgeText: 'INFORMASI',
          iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
          textColor: isDark ? 'text-white' : 'text-slate-900',
          subColor: isDark ? 'text-slate-300' : 'text-slate-700',
          barColor: 'bg-gradient-to-r from-blue-600 to-cyan-500',
          glow: 'shadow-blue-600/20',
          Icon: Info
        };
      case 'success':
      default:
        return {
          bg: isDark ? 'bg-slate-950/90 border-emerald-500/50 shadow-emerald-950/50' : 'bg-white/95 border-emerald-300 shadow-emerald-200/60',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          badgeText: 'BERHASIL',
          iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          textColor: isDark ? 'text-white' : 'text-slate-900',
          subColor: isDark ? 'text-slate-300' : 'text-slate-700',
          barColor: 'bg-gradient-to-r from-emerald-600 to-teal-400',
          glow: 'shadow-emerald-600/20',
          Icon: CheckCircle2
        };
    }
  };

  const style = getStyle();
  const StatusIcon = style.Icon;

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-[calc(100%-2.5rem)] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`relative overflow-hidden rounded-2xl border-2 backdrop-blur-2xl p-4 shadow-2xl ${style.glow} ${style.bg}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${style.iconBg}`}>
            <StatusIcon className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${style.badgeBg}`}>
                {style.badgeText}
              </span>
              <span className={`font-black text-xs truncate ${style.textColor}`}>
                {title}
              </span>
            </div>
            <p className={`text-[11px] font-medium leading-relaxed break-words ${style.subColor}`}>
              {notification.message}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Countdown Timer */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/5">
          <div
            className={`h-full transition-all duration-75 ${style.barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
