import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Power, X } from 'lucide-react';

export default function ModalLogoutConfirm({ isOpen, onClose, onConfirm }) {
  // ESC key handler untuk membatalkan logout
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 transition-all duration-500 ease-out animate-in fade-in"
      style={{
        backdropFilter: 'grayscale(100%) blur(6px)',
        WebkitBackdropFilter: 'grayscale(100%) blur(6px)'
      }}
      onClick={onClose}
    >
      {/* Alert Card Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl p-6 sm:p-7 border border-slate-700/80 bg-slate-900/95 backdrop-blur-2xl text-white shadow-2xl shadow-rose-950/40 text-center space-y-4 my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Soft Ambient Glow di belakang kartu */}
        <div className="absolute -inset-1 bg-gradient-to-r from-rose-600/20 via-rose-500/10 to-amber-500/20 rounded-3xl blur-xl pointer-events-none -z-10" />

        {/* Tombol Tutup Silang di Sudut Kanan Atas */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Batal (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Turn-Off / Warning Pulse Ring */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/30 animate-ping opacity-75 pointer-events-none duration-1000" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-700 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 border-2 border-amber-400/60 animate-pulse">
            <Power className="w-7 h-7 text-amber-200" />
          </div>
        </div>

        {/* Teks Minimalis Tanpa Pemborosan Kata */}
        <div className="pt-1">
          <h3 className="text-base font-bold text-white tracking-tight">
            Apakah ingin keluar?
          </h3>
        </div>

        {/* Tombol Aksi: Batal vs Ya */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            Ya
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
