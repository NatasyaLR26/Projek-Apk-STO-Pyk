import React, { useEffect, useState } from 'react';
import { Activity, Radio, ArrowRight, Sparkles } from 'lucide-react';
import BrandLogo from './BrandLogo';

// Nilai Utama (Core Values) BUMN - AKHLAK Telkom Group
const AKHLAK_VALUES = [
  { letter: 'A', name: 'Amanah', desc: 'Memegang teguh kepercayaan yang diberikan' },
  { letter: 'K', name: 'Kompeten', desc: 'Terus belajar dan mengembangkan kapabilitas' },
  { letter: 'H', name: 'Harmonis', desc: 'Saling peduli dan menghargai perbedaan' },
  { letter: 'L', name: 'Loyal', desc: 'Berdedikasi & mengutamakan kepentingan Bangsa' },
  { letter: 'A', name: 'Adaptif', desc: 'Terus berinovasi & antusias menghadapi perubahan' },
  { letter: 'K', name: 'Kolaboratif', desc: 'Membangun kerja sama yang sinergis' },
];

export default function SplashScreen({ onFinish, duration = 1000 }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 200);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [duration, onFinish]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 150);
  };

  return (
    <div
      className={`fixed inset-0 z-99999 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#0b101f] to-rose-950 text-white transition-opacity duration-300 p-4 overflow-y-auto ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Skip Button on top right */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer z-10"
      >
        <span>Lewati</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Center Animated Logo Emblem */}
      <div className="relative mb-5 flex items-center justify-center shrink-0">
        <div className="absolute w-36 h-36 rounded-full border-2 border-rose-500/20 animate-ping opacity-50 pointer-events-none" />
        <div className="absolute w-28 h-28 rounded-full border border-blue-500/30 animate-pulse pointer-events-none" />
        <BrandLogo size="lg" className="transform scale-110" clickable={false} />
      </div>

      {/* Branding */}
      <div className="text-center px-4 mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
          <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
          <span>Telkom Akses &bull; Payakumbuh</span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Integrasi Operasional Jaringan FO &amp; Logistik
        </p>
      </div>

      {/* AKHLAK BUMN */}
      <div className="w-full max-w-lg mx-auto my-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-950/40 border border-rose-500/30 text-[10px] font-bold text-rose-300 mb-2.5">
          <Sparkles className="w-3 h-3 text-rose-400" />
          <span>AKHLAK</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {AKHLAK_VALUES.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm"
            >
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-600 to-rose-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs shadow-rose-950">
                {item.letter}
              </span>
              <span className="text-[11px] font-bold text-slate-200">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar & Status Counter */}
      <div className="w-64 max-w-xs space-y-2 mt-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-rose-400 animate-spin" />
            <span>Sinkronisasi Sistem...</span>
          </span>
          <span className="text-rose-400 font-bold">{progress}%</span>
        </div>

        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 p-px">
          <div
            className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 rounded-full transition-all duration-75 shadow-sm shadow-rose-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer copyright */}
      <div className="mt-4 text-[10px] text-slate-500 font-mono text-center">
        © 2026 PT Telkom Akses • BerAKHLAK untuk Indonesia
      </div>
    </div>
  );
}
