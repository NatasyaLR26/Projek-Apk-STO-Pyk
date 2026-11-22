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

        {/* Icon Turn-Off / LogOut dengan Pulse Ring */}
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-rose-500/20 animate-ping opacity-60 pointer-events-none" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 border border-rose-400/40">
            <Power className="w-7 h-7" />
          </div>
        </div>

        {/* Judul & Penjelasan */}
        <div className="space-y-1.5 pt-1">
          <h3 className="text-lg font-black tracking-tight text-white">
            Konfirmasi Keluar Sistem
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            Apakah Anda yakin ingin keluar dari <strong className="text-white">Fiber Ops STO Payakumbuh</strong>? Sesi kerja Anda akan diakhiri secara aman.
          </p>
        </div>

        {/* Tombol Aksi: Batal vs Ya, Keluar */}
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
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ya, Keluar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
