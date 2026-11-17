/**
 * ============================================================================
 * UTILITY: soundHelper.js
 * Generator Suara Notifikasi Realtime ("Tingg!" Bell Chime)
 * Menggunakan Web Audio API Universal (Bekerja di Browser Tanpa File Eksternal)
 * ============================================================================
 */

let audioCtx = null;

// Buka kunci AudioContext saat ada interaksi pertama user sesuai kebijakan autoplay browser
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
    } catch (_) {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

/**
 * Memainkan suara bel lonceng "Tingg!" berkualitas tinggi secara instan
 * saat ada penugasan baru, permohonan barang ke gudang, persetujuan pimpinan, atau rilis barang.
 */
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // 1. Nada Fundamental Bell (C6 ~ 1046.5 Hz ke 880 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.65);

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.7);

    // 2. Nada Shimmering Overtone (Harmonik C7 ~ 2093 Hz) -> Karakter "Tingg!" jernih kristal
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2093, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.5);

    gain2.gain.setValueAtTime(0.22, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.55);

    // 3. Sub-harmonic halus (523.25 Hz C5) untuk kehangatan suara lonceng
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(523.25, now);
    gain3.gain.setValueAtTime(0.12, now);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start(now);
    osc3.stop(now + 0.4);
  } catch (err) {
    // Browser autoplay policy catch
    console.debug('Audio chime notification handled:', err);
  }
};
