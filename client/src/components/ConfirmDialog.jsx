import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  isLoading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          iconBg: 'bg-red-500/10 border-red-500/30',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/30',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          iconBg: 'bg-emerald-500/10 border-emerald-500/30',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
        };
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-blue-400" />,
          iconBg: 'bg-blue-500/10 border-blue-500/30',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
        };
    }
  };

  const { icon, iconBg, btnBg } = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-white tracking-tight leading-snug">
              {title}
            </h3>
            <div className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${btnBg} disabled:opacity-40`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
