/**
 * ============================================================================
 * TELEGRAM BOT SERVICE (sto-backend/src/services/telegramService.js)
 * ============================================================================
 * Bot Telegram Resmi: @sto_pyk_bot (ID: 8893464249)
 * Mendukung Alur Kerja Sidang KP & Dual Broadcast:
 * 1. Broadcast Tiket Baru ke Teknisi dengan Tombol Inline [🔘 AMBIL TIKET SEKARANG]
 * 2. Magic Link Auth Tokens Generator & Auto-Login
 * 3. Polling Callback Query Telegram & Auto-Claim Tiket
 * 4. Notifikasi Permohonan & Rilis Material Gudang
 * 5. Notifikasi Check-In & Closing BASTP
 * ============================================================================
 */

const crypto = require('crypto');
const supabase = require('../config/supabaseClient');

const BOT_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8893464249:AAFhp-jmadAfKHrYfM56EzWyLN2d9_iaMm4';
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper Escape HTML untuk sanitasi teks Telegram
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Fungsi pengiriman langsung ke Telegram Group (Sesuai SOP Alur Telegram)
async function kirimKeGrup(teks, options = {}) {
  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || BOT_TOKEN;
  const groupId = process.env.TELEGRAM_GROUP_ID || process.env.TELEGRAM_CHAT_ID || '-1003981401195';

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: groupId,
          text: teks,
          parse_mode: 'HTML',
          ...options
        }),
      }
    );
    const data = await res.json();
    if (!data.ok) console.error('Telegram error:', data);
    return data;
  } catch (err) {
    console.error('Telegram error:', err.message);
    return { ok: false, error: err.message };
  }
}

// Registry Chat ID Penerima Aktif (Default terisi Group ID utama)
const defaultGroupId = process.env.TELEGRAM_GROUP_ID || '-1003981401195';
const registeredChatIds = new Set([defaultGroupId]);

// Inisialisasi dari environment variables jika ada
if (process.env.TELEGRAM_CHAT_ID) {
  process.env.TELEGRAM_CHAT_ID.split(',').forEach(id => {
    const clean = id.trim();
    if (clean) registeredChatIds.add(clean);
  });
}
if (process.env.TELEGRAM_GROUP_ID) {
  registeredChatIds.add(process.env.TELEGRAM_GROUP_ID.trim());
}

let lastUpdateId = 0;
let isPollingActive = false;

/**
 * Mengambil updates dari Telegram untuk mendeteksi chat_id & group_id pengirim
 */
async function getRecentUpdates() {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getUpdates?offset=${lastUpdateId + 1}`);
    const result = await response.json();
    if (result.ok && Array.isArray(result.result)) {
      const chats = result.result
        .map(u => u.message?.chat || u.my_chat_member?.chat || u.channel_post?.chat || u.callback_query?.message?.chat)
        .filter(Boolean)
        .map(c => ({
          id: String(c.id),
          type: c.type, // 'private' | 'group' | 'supergroup' | 'channel'
          title: c.title || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'Tanpa Nama',
          username: c.username || null,
          isGroup: c.type === 'group' || c.type === 'supergroup'
        }));

      // Unikkan berdasarkan id & daftarkan otomatis ke registeredChatIds
      const uniqueChats = [];
      const seen = new Set();
      for (const c of chats) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          uniqueChats.push(c);
          registeredChatIds.add(c.id);
        }
      }

      // Update lastUpdateId
      for (const u of result.result) {
        if (u.update_id > lastUpdateId) {
          lastUpdateId = u.update_id;
        }
      }

      return {
        success: true,
        chats: uniqueChats,
        registeredCount: registeredChatIds.size,
        allRecipients: Array.from(registeredChatIds)
      };
    }
    return { success: false, error: 'Tidak ada updates' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Memproses interaksi callback query tombol inline [ 🔘 AMBIL TIKET SEKARANG ]
 */
async function handleTelegramCallbackQuery(cq) {
  const data = cq.data || '';
  const from = cq.from || {};
  const senderChatId = String(from.id || cq.message?.chat?.id || '');
  const senderUsername = from.username || '';
  const senderName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || 'Teknisi Lapangan';

  // Tangani aksi Lihat Tiket (view_ID)
  if (data.startsWith('view_')) {
    const tugasId = parseInt(data.replace('view_', ''), 10);
    const baseUrl = process.env.APP_FRONTEND_URL || 'http://localhost:5173';
    await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: cq.id,
        text: `Membuka Tiket #${tugasId} di browser...`
      })
    });
    await kirimKeGrup(`ℹ️ <b>Detail Tiket #${tugasId}:</b> <a href="${baseUrl}/tiket/${tugasId}">${baseUrl}/tiket/${tugasId}</a>`);
    return;
  }

  if (!data.startsWith('claim_')) return;

  const tugasId = parseInt(data.replace('claim_', ''), 10);
  if (isNaN(tugasId) || tugasId <= 0) return;

  try {
    // 1. Identifikasi teknisi di tabel users
    let techUser = null;
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teknisi');

      if (usersData && usersData.length > 0) {
        techUser = usersData.find(u =>
          (u.telegram_chat_id && String(u.telegram_chat_id) === senderChatId) ||
          (u.username_telegram && u.username_telegram.toLowerCase() === senderUsername.toLowerCase())
        ) || usersData[0];

        // Jika user belum memiliki telegram_chat_id, simpan otomatis
        if (techUser && (!techUser.telegram_chat_id || !techUser.username_telegram)) {
          await supabase.from('users').update({
            telegram_chat_id: senderChatId,
            username_telegram: senderUsername || null
          }).eq('id', techUser.id);
        }
      }
    } catch (err) {
      console.warn('[handleTelegramCallbackQuery] Lookup user notice:', err.message);
    }

    const assignedUserId = techUser?.id || 2;
    const assignedUserName = techUser?.nama_lengkap || senderName;

    // 2. Buat token magic link di tabel auth_tokens
    const token = crypto.randomBytes(24).toString('hex');
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('auth_tokens').insert([{
      token,
      user_id: assignedUserId,
      tugas_id: tugasId,
      expired_at: expiredAt,
      is_used: false
    }]);

    // 3. Update status tugas menjadi Progress / diambil teknisi
    await supabase.from('tugas').update({
      teknisi_id: assignedUserId,
      status: 'Progress'
    }).eq('id', tugasId);

    // 4. Jawab callback query Telegram
    await fetch(`${TELEGRAM_API_BASE}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: cq.id,
        text: `Tiket #${tugasId} berhasil Anda ambil! Membuka aplikasi...`
      })
    });

    // 5. Kirim konfirmasi pesan dengan magic link langsung
    const baseUrl = process.env.APP_FRONTEND_URL || 'http://localhost:5173';
    const magicLink = `${baseUrl}/magic-login?token=${token}`;

    const replyText = `
🎉 <b>TIKET #${tugasId} BERHASIL DIAMBIL OLEH TEKNISI!</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👷 <b>Teknisi Penanggung Jawab:</b> ${assignedUserName}
⚡ <b>Status:</b> <code>IN-PROGRESS (Sedang Dikerjakan)</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Silakan klik link di bawah ini untuk membuka detail tiket di ponsel Anda tanpa login manual:

👉 <a href="${magicLink}">${magicLink}</a>

<i>Token berlaku selama 24 jam dan langsung memverifikasi sesi teknisi lapangan STO Payakumbuh.</i>
    `.trim();

    await sendTelegramMessage(replyText, senderChatId);
  } catch (err) {
    console.error('[handleTelegramCallbackQuery] Error:', err.message);
  }
}

/**
 * Worker polling berkala Telegram untuk menerima aksi klik tombol inline teknisi
 */
async function pollTelegramUpdates() {
  if (isPollingActive) return;
  isPollingActive = true;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/getUpdates?offset=${lastUpdateId + 1}&timeout=3`);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        if (update.update_id > lastUpdateId) {
          lastUpdateId = update.update_id;
        }

        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query);
        } else if (update.message?.chat?.id) {
          registeredChatIds.add(String(update.message.chat.id));
        }
      }
    }
  } catch (err) {
    // Abaikan error polling sementara
  } finally {
    isPollingActive = false;
  }
}

// Jalankan polling setiap 4 detik untuk merespons tombol inline teknisi
const pollInterval = setInterval(pollTelegramUpdates, 4000);
if (pollInterval && typeof pollInterval.unref === 'function') {
  pollInterval.unref();
}
pollTelegramUpdates().catch(() => {});

/**
 * Mengirim pesan teks terformat HTML ke satu atau banyak target chat Telegram
 */
async function sendTelegramMessage(text, target = null, options = {}) {
  let targets = [];

  if (target && typeof target === 'string' && target !== 'all' && target !== 'teknisi' && target !== 'gudang') {
    targets = target.split(',').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(target) && target.length > 0) {
    targets = target.map(String);
  } else {
    const defaultGroup = process.env.TELEGRAM_GROUP_ID || '-1003981401195';
    targets = [defaultGroup];
    registeredChatIds.forEach(id => {
      if (!targets.includes(id)) targets.push(id);
    });
  }

  const results = [];

  for (const chatId of targets) {
    try {
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        ...options
      };

      const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (resJson.ok) {
        results.push({ chatId, success: true, messageId: resJson.result.message_id });
      } else {
        console.warn(`[Telegram Error] Chat ${chatId}:`, resJson.description);
        results.push({ chatId, success: false, error: resJson.description });
      }
    } catch (err) {
      console.error(`[Telegram Exception] Chat ${chatId}:`, err.message);
      results.push({ chatId, success: false, error: err.message });
    }
  }

  const anySuccess = results.some(r => r.success);
  return {
    success: anySuccess,
    deliveredCount: results.filter(r => r.success).length,
    totalAttempted: targets.length,
    details: results,
    draftMessage: text
  };
}

/**
 * Menambahkan chat/group id secara manual
 */
function addChatRecipient(chatId) {
  if (chatId) {
    registeredChatIds.add(String(chatId).trim());
  }
  return Array.from(registeredChatIds);
}

function getAllRecipients() {
  return Array.from(registeredChatIds);
}

// ============================================================================
// TEMPLATE PESAN RESMI DUAL BROADCAST & ALUR KERJA SIDANG KP
// ============================================================================

/**
 * FASE 1: Broadcast Tiket Baru Pimpinan ke Teknisi
 * Sesuai Format Spesifik Pengguna:
 * 🚨 TIKET GANGGUAN BARU
 * ODP: ODP-PYK-01/04
 * Lokasi: Jl. Soekarno-Hatta
 * Jenis: Kabel Dropcore Putus
 * [ 🔘 AMBIL TIKET SEKARANG ] (Tombol Inline Telegram)
 */
function templateTiketBaru(param1, param2, param3) {
  let tugas, baseUrl, magicUrl;
  if (param1 && param1.tugas) {
    tugas = param1.tugas;
    baseUrl = param1.baseUrl || 'http://localhost:5173';
    magicUrl = param1.magicUrl;
  } else {
    tugas = param1 || {};
    baseUrl = 'http://localhost:5173';
    magicUrl = typeof param2 === 'string' ? param2 : param3;
    if (param2 && typeof param2 === 'object' && param2.kode_odp) {
      tugas.odp_kode = param2.kode_odp;
    }
  }

  const odpKode = tugas.odp_kode || (tugas.odp ? tugas.odp.kode_odp : 'ODP-PYK-01/04');
  const lokasi = tugas.lokasi || 'Jl. Soekarno-Hatta';
  const jenisKerja = tugas.jenis_kerja || 'Kabel Dropcore Putus';
  const targetUrl = magicUrl || `${baseUrl}/magic-login?tugas_id=${tugas.id || ''}`;

  return `
🚨 <b>TIKET GANGGUAN BARU</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 <b>ODP:</b> <code>${odpKode}</code>
📍 <b>Lokasi:</b> ${lokasi}
💼 <b>Jenis:</b> ${jenisKerja}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>Aksi Teknisi Lapangan:</b>
Tekan tombol <b>[ 🔘 AMBIL TIKET SEKARANG ]</b> di bawah atau buka tautan langsung:

👉 <a href="${targetUrl}">${targetUrl}</a>
`.trim();
}

/**
 * Membangun markup tombol inline Telegram [ 🔘 AMBIL TIKET SEKARANG ]
 */
function buildInlineKeyboardTiket(param1, param2) {
  let tugas, magicUrl;
  if (param1 && param1.tugas) {
    tugas = param1.tugas;
    magicUrl = param1.magicUrl;
  } else {
    tugas = typeof param1 === 'object' ? param1 : { id: param1 };
    magicUrl = param2;
  }

  const isHttps = magicUrl && magicUrl.startsWith('https://');

  if (isHttps) {
    return {
      inline_keyboard: [
        [
          {
            text: '🔘 AMBIL TIKET SEKARANG',
            url: magicUrl
          }
        ]
      ]
    };
  }

  // Gunakan callback_data agar Telegram bot menerima event klik teknisi
  return {
    inline_keyboard: [
      [
        {
          text: '🔘 AMBIL TIKET SEKARANG',
          callback_data: `claim_${tugas?.id || 'new'}`
        }
      ]
    ]
  };
}

/**
 * FASE 2: Notifikasi Permohonan Material ke Grup Gudang
 */
function templatePermohonanMaterial({ tugas, permohonan, items = [], teknisiNama = 'Teknisi Lapangan', baseUrl = 'http://localhost:5173' }) {
  const daftarItems = items.length > 0
    ? items.map(i => `• <b>${i.nama_barang || i.item?.nama_barang || i.nama}</b>: ${i.jumlah || i.jumlah_minta} ${i.satuan || i.item?.satuan || 'pcs'}`).join('\n')
    : '• 150 meter Kabel FO Dropcore 1-Core\n• 1 unit Modem ONT ZTE F670L\n• 1 set Roset Optik & Pigtail';

  const tiketUrl = `${baseUrl}/tiket/${tugas?.id || permohonan?.tugas_id}`;

  return `
📦 <b>PERMOHONAN MATERIAL GUDANG BARU</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 <b>No. Permohonan:</b> #${permohonan?.id || 'REQ-01'}
📋 <b>Terkait Tiket:</b> #${tugas?.id || permohonan?.tugas_id}
👷 <b>Teknisi Pemohon:</b> ${teknisiNama}
👤 <b>Pelanggan:</b> ${tugas?.pelanggan_nama || 'Pelanggan Telkom'}
📍 <b>Lokasi Pemasangan:</b> ${tugas?.lokasi || 'Payakumbuh'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 <b>Daftar Kebutuhan Material:</b>
${daftarItems}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Petugas Gudang silakan periksa fisik barang, lakukan scan Serial Number (SN) ONT, dan setujui serah terima pada portal gudang:
👉 <a href="${tiketUrl}">${tiketUrl}</a>
`.trim();
}

/**
 * FASE 3: Konfirmasi Rilis Barang & Binding SN ONT (Status: In-Transit)
 */
function templateRilisBarang({ tugas, snOnt = 'ZTEGC8B90112', petugasGudang = 'Siti Rahmawati' }) {
  return `
✅ <b>MATERIAL TELAH DIRILIS OLEH GUDANG</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 <b>No. Tiket:</b> #${tugas.id}
👤 <b>Pelanggan:</b> ${tugas.pelanggan_nama || 'Pelanggan Telkom'}
🏢 <b>Petugas Gudang:</b> ${petugasGudang}
🏷️ <b>SN ONT Terikat:</b> <code>${snOnt}</code>
📦 <b>Status Material:</b> <pre>IN-TRANSIT (Dibawa Teknisi Menuju Lokasi)</pre>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stok gudang telah terpotong otomatis di database Supabase Cloud.
Teknisi dipersilakan menuju ke lokasi instalasi pelanggan & lakukan Check-In.
`.trim();
}

/**
 * FASE 4: Notifikasi Check-In Teknisi di Lokasi Pelanggan
 */
function templateCheckIn({ tugas, teknisiNama = 'Ahmad Fadli', latitude, longitude, waktuWib }) {
  const now = waktuWib || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return `
📍 <b>TEKNISI CHECK-IN DI LOKASI PELANGGAN</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 <b>No. Tiket:</b> #${tugas.id}
👷 <b>Teknisi Lapangan:</b> ${teknisiNama}
👤 <b>Pelanggan:</b> ${tugas.pelanggan_nama || 'Pelanggan Telkom'}
🕒 <b>Waktu Tiba:</b> ${now}
📌 <b>Koordinat GPS:</b> <code>${latitude}, ${longitude}</code>
🗺️ <b>Buka di Peta:</b> <a href="${mapsUrl}">Google Maps Lokasi</a>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: Teknisi telah tiba di lokasi. Memulai penarikan dropcore dari ODP, splicing, dan pengukuran redaman optik OPM.
`.trim();
}

/**
 * FASE 5: Closing BASTP Digital & WebGIS Magic Auto-Update
 */
function templateClosingBastp({ tugas, odp, redamanDbm = -18.5, snOnt = 'ZTEGC8B90112', bastpNo, portBaru, kapasitasPort, statusOdp }) {
  const noSurat = bastpNo || `BASTP/TA-PYK/2026/${String(tugas.id).padStart(4, '0')}`;
  const statusIcon = statusOdp === 'Penuh' ? '🔴' : statusOdp === 'Hampir Penuh' ? '🟡' : '🟢';

  return `
🎉 <b>PEKERJAAN SELESAI & TIKET RESMI DITUTUP (CLOSED)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 <b>No. BASTP:</b> <code>${noSurat}</code>
📋 <b>No. Tiket:</b> #${tugas.id} (${tugas.jenis_kerja || 'Pasang Baru IndiHome'})
👤 <b>Pelanggan:</b> ${tugas.pelanggan_nama || 'Pelanggan Telkom'}
📶 <b>Redaman Optik OPM:</b> <b>${redamanDbm} dBm</b> (QC Telkom PASS ✓)
🏷️ <b>Status ONT Modem:</b> <code>${snOnt}</code> &rarr; <b>ACTIVE (Terpasang di Rumah Pelanggan)</b>
✍️ <b>Tanda Tangan Pelanggan:</b> Terverifikasi Digital di Layar HP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ <b>WEBGIS AUTO-UPDATE (TRANSAKSI DATABASE BERANTAI):</b>
🔌 <b>Titik ODP:</b> <b>${odp?.kode_odp || tugas.odp_kode || 'ODP-PYK-FA/001'}</b>
📊 <b>Port Terpakai:</b> ${portBaru} / ${kapasitasPort} Port
${statusIcon} <b>Status Indikator WebGIS:</b> <b>${String(statusOdp).toUpperCase()}</b>

<i>Peta WebGIS Pimpinan telah merefleksikan perubahan warna marker ODP secara real-time!</i>
`.trim();
}

module.exports = {
  BOT_TOKEN,
  esc,
  kirimKeGrup,
  sendTelegramMessage,
  getRecentUpdates,
  addChatRecipient,
  getAllRecipients,
  templateTiketBaru,
  buildInlineKeyboardTiket,
  templatePermohonanMaterial,
  templateRilisBarang,
  templateCheckIn,
  templateClosingBastp,
  handleTelegramCallbackQuery
};

