/**
 * ============================================================================
 * UTILITY: soundHelper.js
 * Generator Suara Notifikasi Realtime ("Ding Dong" Bell Chime)
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
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

/**
 * Memainkan suara lonceng "Ding Dong" berkualitas tinggi secara instan
 * saat ada penugasan baru, permohonan barang ke gudang, persetujuan pimpinan, atau rilis barang.
 * - Nada 1 "Ding" (G5 ~783.99 Hz)
 * - Nada 2 "Dong" (C5 ~523.25 Hz) berjarak 220ms dengan resonansi hangat
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

    // ==========================================
    // STAGE 1: NADA PERTAMA "DING" (t = 0 s)
    // ==========================================
    // Fundamental G5 (783.99 Hz)
    const oscDing1 = audioCtx.createOscillator();
    const gainDing1 = audioCtx.createGain();
    oscDing1.type = 'sine';
    oscDing1.frequency.setValueAtTime(783.99, now);
    oscDing1.frequency.exponentialRampToValueAtTime(780, now + 0.35);

    gainDing1.gain.setValueAtTime(0.35, now);
    gainDing1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    oscDing1.connect(gainDing1);
    gainDing1.connect(audioCtx.destination);
    oscDing1.start(now);
    oscDing1.stop(now + 0.42);

    // Overtone kristal Ding (G6 ~ 1567.98 Hz)
    const oscDing2 = audioCtx.createOscillator();
    const gainDing2 = audioCtx.createGain();
    oscDing2.type = 'sine';
    oscDing2.frequency.setValueAtTime(1567.98, now);
    gainDing2.gain.setValueAtTime(0.18, now);
    gainDing2.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscDing2.connect(gainDing2);
    gainDing2.connect(audioCtx.destination);
    oscDing2.start(now);
    oscDing2.stop(now + 0.3);

    // ==========================================
    // STAGE 2: NADA KEDUA "DONG" (t = now + 0.22 s)
    // ==========================================
    const tDong = now + 0.22;

    // Fundamental C5 (523.25 Hz)
    const oscDong1 = audioCtx.createOscillator();
    const gainDong1 = audioCtx.createGain();
    oscDong1.type = 'sine';
    oscDong1.frequency.setValueAtTime(523.25, tDong);
    oscDong1.frequency.exponentialRampToValueAtTime(520, tDong + 0.65);

    gainDong1.gain.setValueAtTime(0.4, tDong);
    gainDong1.gain.exponentialRampToValueAtTime(0.0001, tDong + 0.7);

    oscDong1.connect(gainDong1);
    gainDong1.connect(audioCtx.destination);
    oscDong1.start(tDong);
    oscDong1.stop(tDong + 0.75);

    // Resonansi hangat Dong C4 (261.63 Hz)
    const oscDong2 = audioCtx.createOscillator();
    const gainDong2 = audioCtx.createGain();
    oscDong2.type = 'triangle';
    oscDong2.frequency.setValueAtTime(261.63, tDong);
    gainDong2.gain.setValueAtTime(0.15, tDong);
    gainDong2.gain.exponentialRampToValueAtTime(0.0001, tDong + 0.5);

    oscDong2.connect(gainDong2);
    gainDong2.connect(audioCtx.destination);
    oscDong2.start(tDong);
    oscDong2.stop(tDong + 0.55);

    // Kilau nada tinggi Dong (C6 ~ 1046.5 Hz)
    const oscDong3 = audioCtx.createOscillator();
    const gainDong3 = audioCtx.createGain();
    oscDong3.type = 'sine';
    oscDong3.frequency.setValueAtTime(1046.5, tDong);
    gainDong3.gain.setValueAtTime(0.12, tDong);
    gainDong3.gain.exponentialRampToValueAtTime(0.0001, tDong + 0.4);

    oscDong3.connect(gainDong3);
    gainDong3.connect(audioCtx.destination);
    oscDong3.start(tDong);
    oscDong3.stop(tDong + 0.45);

  } catch (err) {
    // Browser autoplay policy catch
    console.debug('Audio chime notification handled:', err);
  }
};
