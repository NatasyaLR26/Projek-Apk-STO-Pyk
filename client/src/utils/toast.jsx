import React from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Custom Toast Notification Component for STO Telkom Dark Mode
 */
const CustomToast = ({ t, type, title, subtitle }) => {
  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />,
          borderColor: 'border-emerald-500/30',
          accentBar: 'bg-emerald-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />,
          borderColor: 'border-red-500/30',
          accentBar: 'bg-red-600'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />,
          borderColor: 'border-amber-500/30',
          accentBar: 'bg-amber-500'
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />,
          borderColor: 'border-blue-500/30',
          accentBar: 'bg-blue-500'
        };
    }
  };

  const { icon, borderColor, accentBar } = getIconAndColors();

  return (
    <div
      className={`${
        t.visible ? 'animate-in fade-in slide-in-from-top-3 sm:slide-in-from-right-5 duration-300' : 'animate-out fade-out slide-out-to-right-5 duration-200'
      } relative flex items-start gap-3 w-full max-w-sm bg-slate-900/95 backdrop-blur-md border ${borderColor} p-4 rounded-xl shadow-2xl shadow-black/60 overflow-hidden text-slate-100 pointer-events-auto select-none`}
    >
      {/* Colored Left Accent Bar */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${accentBar}`} />

      {/* Status Icon */}
      <div className="pl-1.5">{icon}</div>

      {/* Message Content */}
      <div className="flex-1 pr-2">
        <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
          {title}
        </h4>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {/* Manual Close Button */}
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none"
        title="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const showSuccess = (title, subtitle = '') => {
  toast.custom((t) => <CustomToast t={t} type="success" title={title} subtitle={subtitle} />, {
    duration: 3500
  });
};

export const showError = (title, subtitle = '') => {
  toast.custom((t) => <CustomToast t={t} type="error" title={title} subtitle={subtitle} />, {
    duration: 4000
  });
};

export const showWarning = (title, subtitle = '') => {
  toast.custom((t) => <CustomToast t={t} type="warning" title={title} subtitle={subtitle} />, {
    duration: 3500
  });
};

export const showInfo = (title, subtitle = '') => {
  toast.custom((t) => <CustomToast t={t} type="info" title={title} subtitle={subtitle} />, {
    duration: 3500
  });
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo
};
