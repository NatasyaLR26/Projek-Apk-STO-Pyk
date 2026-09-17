import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Snackbar({ notification, onClose }) {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      return;
    }

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
          bg: isDark ? 'bg-rose-950/90' : 'bg-rose-50',
          border: isDark ? 'border-rose-700/60 shadow-rose-950/50' : 'border-rose-200 shadow-rose-200/50',
          iconColor: 'text-rose-500',
          textColor: isDark ? 'text-rose-100' : 'text-rose-900',
          subColor: isDark ? 'text-rose-300' : 'text-rose-700',
          barColor: 'bg-rose-500',
          Icon: AlertCircle
        };
      case 'warning':
        return {
          bg: isDark ? 'bg-amber-950/90' : 'bg-amber-50',
          border: isDark ? 'border-amber-700/60 shadow-amber-950/50' : 'border-amber-200 shadow-amber-200/50',
          iconColor: 'text-amber-500',
          textColor: isDark ? 'text-amber-100' : 'text-amber-900',
          subColor: isDark ? 'text-amber-300' : 'text-amber-700',
          barColor: 'bg-amber-500',
          Icon: AlertTriangle
        };
      case 'info':
        return {
          bg: isDark ? 'bg-slate-900/95' : 'bg-sky-50',
          border: isDark ? 'border-blue-600/50 shadow-blue-950/50' : 'border-blue-200 shadow-blue-200/50',
          iconColor: 'text-blue-500',
          textColor: isDark ? 'text-blue-100' : 'text-blue-900',
          subColor: isDark ? 'text-blue-300' : 'text-blue-700',
          barColor: 'bg-blue-500',
          Icon: Info
        };
      case 'success':
      default:
        return {
          bg: isDark ? 'bg-slate-900/95' : 'bg-emerald-50',
          border: isDark ? 'border-emerald-600/50 shadow-emerald-950/50' : 'border-emerald-200 shadow-emerald-200/50',
          iconColor: 'text-emerald-500',
          textColor: isDark ? 'text-emerald-100' : 'text-emerald-900',
          subColor: isDark ? 'text-emerald-300' : 'text-emerald-700',
          barColor: 'bg-emerald-500',
          Icon: CheckCircle2
        };
    }
  };

  const style = getStyle();
  const StatusIcon = style.Icon;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 shadow-2xl ${style.bg} ${style.border}`}>
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-xl mt-0.5 ${isDark ? 'bg-white/10' : 'bg-black/5'} ${style.iconColor}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 text-xs">
            <div className={`font-bold text-sm leading-tight ${style.textColor}`}>
              {title}
            </div>
            <p className={`mt-0.5 leading-relaxed ${style.subColor}`}>
              {notification.message}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-black hover:bg-black/5'}`}
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar Countdown Timer */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
          <div
            className={`h-full transition-all duration-75 ${style.barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
