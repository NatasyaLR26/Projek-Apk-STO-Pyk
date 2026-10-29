const telegramService = require('../services/telegramService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// 1. Cek status bot & daftar chat_id aktif
exports.getStatus = async (req, res) => {
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${telegramService.BOT_TOKEN}/getMe`);
    const meData = await meRes.json();
    const updates = await telegramService.getRecentUpdates();

    return successResponse(res, 200, 'Status Telegram Bot berhasil diambil', {
      bot: meData.result || null,
      registered_recipients: telegramService.getAllRecipients(),
      recent_chats: updates.chats || []
    });
  } catch (err) {
    return errorResponse(res, 500, 'Gagal mengambil status bot Telegram', err.message);
  }
};

// 2. Poll dan sinkronkan updates dari Telegram (auto-detect groups & users)
exports.syncUpdates = async (req, res) => {
  try {
    const updates = await telegramService.getRecentUpdates();
    return successResponse(res, 200, 'Sinkronisasi update Telegram berhasil', {
      registered_recipients: telegramService.getAllRecipients(),
      recent_chats: updates.chats || []
    });
  } catch (err) {
    return errorResponse(res, 500, 'Gagal sinkronisasi update Telegram', err.message);
  }
};

// 3. Tambah chat_id atau group_id aktif secara manual
exports.setChatId = async (req, res) => {
  const { chat_id } = req.body;
  if (!chat_id) {
    return errorResponse(res, 400, 'chat_id wajib disertakan');
  }

  const allRecipients = telegramService.addChatRecipient(chat_id);
  return successResponse(res, 200, `Chat/Grup ID ${chat_id} berhasil didaftarkan!`, {
    registered_recipients: allRecipients
  });
};

// 4. Kirim tes pesan Telegram ke semua penerima
exports.sendTestMessage = async (req, res) => {
  const { message, chat_id } = req.body;
  const testText = message || `
🤖 <b>TES KONEKSI BOT TELEGRAM STO TELKOM AKSES</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sistem Bot: @sto_pyk_bot
Status: <b>ONLINE & REALTIME TERHUBUNG</b>
Waktu: ${new Date().toLocaleString('id-ID')}
Sistem siap menyiarkan tiket pimpinan, permohonan material gudang, check-in, dan closing BASTP!
  `.trim();

  const result = await telegramService.sendTelegramMessage(testText, chat_id);

  if (!result.success) {
    return errorResponse(res, 400, 'Gagal mengirim pesan ke sebagian atau seluruh target', result);
  }

  return successResponse(res, 200, `Pesan tes berhasil dikirim ke ${result.deliveredCount} target Telegram!`, result);
};
