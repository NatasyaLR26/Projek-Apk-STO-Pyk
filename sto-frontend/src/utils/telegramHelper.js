/**
 * ============================================================================
 * TELEGRAM NOTIFICATION DISPATCHER (Dual-Dispatch: Express API + Direct Bot API)
 * ============================================================================
 * Menjamin notifikasi Telegram PASTI terkirim 100%:
 * 1. Mencoba via backend Express lokal (/api/telegram/send) jika backend aktif.
 * 2. Jika backend offline / error / di hosting Vercel, otomatis fallback seketika
 *    mengirim langsung ke Telegram Bot API (https://api.telegram.org/bot.../sendMessage).
 * ============================================================================
 */

const TELEGRAM_BOT_TOKEN = '8893464249:AAFhp-jmadAfKHrYfM56EzWyLN2d9_iaMm4';
const TELEGRAM_CHAT_ID = '-1003981401195';

export const sendTelegramAlert = async (text) => {
  if (!text) return false;

  // 1. Coba kirim via Express Backend API (timeout 1200ms)
  let sentViaBackend = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);

    const res = await fetch('http://localhost:5000/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      sentViaBackend = true;
      console.log('[TelegramAlert] Berhasil terkirim via Backend Express.');
      return true;
    }
  } catch {
    // Backend offline / mode standalone / Vercel
  }

  // 2. Direct Fallback ke Telegram Bot API (HTTPS Langsung dari Browser)
  if (!sentViaBackend) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });

      const data = await response.json();
      if (data && data.ok) {
        console.log('[TelegramAlert] Berhasil terkirim langsung via Telegram Bot API (ID:', data.result?.message_id, ')');
        return true;
      } else {
        console.warn('[TelegramAlert] Telegram Bot API response:', data);
      }
    } catch (err) {
      console.error('[TelegramAlert] Gagal mengirim pesan ke Telegram:', err.message);
    }
  }

  return false;
};

export default sendTelegramAlert;
