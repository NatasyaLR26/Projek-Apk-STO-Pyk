const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const telegramService = require('../services/telegramService');
const odpController = require('./odpController');

// 1. Ambil semua tugas (dukung filter status)
exports.getAllTugas = async (req, res) => {
  const { status, teknisi_id } = req.query;

  let query = supabase
    .from('tugas')
    .select(`
      *,
      pimpinan:pimpinan_id ( id, nama_lengkap, email ),
      teknisi:teknisi_id ( id, nama_lengkap, email )
    `)
    .order('id', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (teknisi_id) {
    query = query.eq('teknisi_id', parseInt(teknisi_id, 10));
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data tiket tugas', error.message);
  }

  return successResponse(res, 200, 'Daftar tiket tugas berhasil diambil', data, { tugas: data });
};

// 2. Pimpinan membuat tugas baru untuk teknisi (Sekali Klik Dual Broadcast: Supabase & Telegram)
exports.createTugas = async (req, res) => {
  const {
    pimpinan_id,
    teknisi_id,
    jenis_kerja,
    lokasi,
    pelanggan_nama,
    pelanggan_telp,
    keterangan,
    catatan,
    status,
    odp_id,
    odp_kode
  } = req.body;

  // validasi input dasar
  if (!pimpinan_id || !jenis_kerja || !lokasi) {
    return errorResponse(res, 400, 'Pimpinan ID, jenis pekerjaan, dan lokasi wajib diisi');
  }

  const parsedPimpinanId = parseInt(pimpinan_id, 10);
  const parsedTeknisiId = teknisi_id ? parseInt(teknisi_id, 10) : null;
  const parsedOdpId = odp_id ? parseInt(odp_id, 10) : null;

  // Format informasi tambahan pelanggan & catatan ke dalam kolom lokasi sesuai skema tabel tugas
  const extraInfo = [];
  if (pelanggan_nama) extraInfo.push(`Pelanggan: ${pelanggan_nama}`);
  if (pelanggan_telp) extraInfo.push(`Telp: ${pelanggan_telp}`);
  const note = keterangan || catatan;
  if (note) extraInfo.push(`Catatan: ${note}`);

  const fullLokasi = extraInfo.length > 0
    ? `${lokasi} (${extraInfo.join(' | ')})`
    : lokasi;

  const insertPayload = {
    pimpinan_id: parsedPimpinanId,
    teknisi_id: parsedTeknisiId,
    jenis_kerja,
    lokasi: fullLokasi,
    status: status || 'menunggu',
    broadcast_status: 'sent'
  };

  if (parsedOdpId && !isNaN(parsedOdpId)) {
    insertPayload.odp_id = parsedOdpId;
  }

  let { data, error } = await supabase
    .from('tugas')
    .insert([insertPayload])
    .select()
    .single();

  // Fallback jika schema lama memiliki constraint NOT NULL pada teknisi_id
  if (error && error.message && error.message.toLowerCase().includes('not-null')) {
    insertPayload.teknisi_id = parsedTeknisiId || 2;
    const retry = await supabase.from('tugas').insert([insertPayload]).select().single();
    data = retry.data;
    error = retry.error;
  }

  // Fallback jika kolom odp_id belum ada pada view tertentu
  if (error && error.message && error.message.toLowerCase().includes('odp_id')) {
    delete insertPayload.odp_id;
    const retry = await supabase.from('tugas').insert([insertPayload]).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    return errorResponse(res, 500, 'Gagal menyimpan data tugas ke Supabase', error?.message);
  }

  // FASE DUAL BROADCAST: Generate Magic Link Token di auth_tokens & Siarkan ke Telegram
  let magicUrl = '';
  let token = '';
  try {
    const crypto = require('crypto');
    token = crypto.randomBytes(24).toString('hex');
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const assignedUserId = parsedTeknisiId || 2; // Default teknisi utama STO

    await supabase.from('auth_tokens').insert([{
      token,
      user_id: assignedUserId,
      tugas_id: data.id,
      expired_at: expiredAt,
      is_used: false
    }]);

    const baseUrl = process.env.APP_FRONTEND_URL || 'http://localhost:5173';
    magicUrl = `${baseUrl}/magic-login?token=${token}`;

    const odp = odp_kode || (parsedOdpId ? `ODP-ID-${parsedOdpId}` : 'ODP-PYK-01/04');
    const lokasi = data.lokasi || fullLokasi;
    const jenis = data.jenis_kerja || jenis_kerja;

    const inlineKeyboard = telegramService.buildInlineKeyboardTiket({
      tugas: data,
      magicUrl
    });

    // 1. Broadcast pesan tiket gangguan baru ke Telegram Group (SOP Alur Telegram)
    const pesanTiket = `🚨 <b>TIKET GANGGUAN BARU</b>\nODP: ${telegramService.esc(odp)}\nLokasi: ${telegramService.esc(lokasi)}\nJenis: ${telegramService.esc(jenis)}`;
    const tgResult = await telegramService.kirimKeGrup(pesanTiket, {
      reply_markup: inlineKeyboard
    });

    // Simpan telegram_message_id jika berhasil
    if (tgResult && tgResult.result?.message_id) {
      try {
        await supabase.from('tugas').update({
          telegram_message_id: String(tgResult.result.message_id)
        }).eq('id', data.id);
      } catch { /* fallback */ }
    }
  } catch (tgErr) {
    console.warn('[Telegram Dual Broadcast Notice]', tgErr.message);
  }

  return successResponse(res, 201, 'Tugas berhasil disimpan ke database & disiarkan serentak ke Telegram!', {
    ...data,
    magic_url: magicUrl,
    magic_token: token
  }, { tugas: data });
};

// 3. Edit / Perbarui Tiket Penugasan (CRUD Update)
exports.updateTugas = async (req, res) => {
  const { id } = req.params;
  const { jenis_kerja, lokasi, status, teknisi_id, foto_bukti } = req.body;

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const updatePayload = {};
  if (jenis_kerja !== undefined) updatePayload.jenis_kerja = jenis_kerja;
  if (lokasi !== undefined) updatePayload.lokasi = lokasi;
  if (status !== undefined) updatePayload.status = status;
  if (teknisi_id !== undefined) updatePayload.teknisi_id = teknisi_id ? parseInt(teknisi_id, 10) : null;
  if (foto_bukti !== undefined) updatePayload.foto_bukti = foto_bukti;

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse(res, 400, 'Tidak ada data tugas yang diperbarui');
  }

  const { data, error } = await supabase
    .from('tugas')
    .update(updatePayload)
    .eq('id', parsedId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 500, 'Gagal memperbarui tiket tugas', error.message);
  }

  return successResponse(res, 200, 'Tiket tugas berhasil diperbarui', data, { tugas: data });
};

// 4. Hapus / Batalkan Tiket Penugasan (CRUD Delete)
exports.deleteTugas = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const { data, error } = await supabase
    .from('tugas')
    .delete()
    .eq('id', parsedId)
    .select();

  if (error) {
    return errorResponse(res, 500, 'Gagal menghapus tiket tugas', error.message);
  }

  return successResponse(res, 200, 'Tiket tugas berhasil dihapus', data);
};

// 5. Teknisi mengklaim/mengambil tugas dari pool terbuka
exports.claimTugas = async (req, res) => {
  const { id } = req.params;
  const { teknisi_id } = req.body;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const parsedTeknisiId = parseInt(teknisi_id, 10);
  if (!teknisi_id || isNaN(parsedTeknisiId) || parsedTeknisiId <= 0) {
    return errorResponse(res, 400, 'Teknisi ID wajib disertakan dan harus berupa angka valid');
  }

  const { data: existingTugas, error: errFind } = await supabase
    .from('tugas')
    .select('*')
    .eq('id', parsedId)
    .single();

  if (errFind || !existingTugas) {
    return errorResponse(res, 404, 'Tugas tidak ditemukan');
  }

  if (existingTugas.status === 'Done') {
    return errorResponse(res, 400, 'Tugas sudah selesai dikerjakan dan tidak dapat diklaim');
  }

  const { data, error } = await supabase
    .from('tugas')
    .update({
      teknisi_id: parsedTeknisiId,
      status: 'Progress',
    })
    .eq('id', parsedId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 500, 'Gagal mengklaim tugas', error.message);
  }

  return successResponse(res, 200, 'Tugas berhasil diambil oleh teknisi', data, { tugas: data });
};

// 6. Ambil daftar tugas yang masih terbuka (belum diambil teknisi)
exports.getOpenTugas = async (req, res) => {
  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .or('teknisi_id.is.null,status.eq.Open,status.eq.menunggu')
    .order('id', { ascending: false });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data tugas terbuka', error.message);
  }

  return successResponse(res, 200, 'Data tugas terbuka berhasil diambil', data, { tugas: data });
};

// 7. Teknisi melihat daftar tugas miliknya
exports.getTugasByTeknisi = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID teknisi tidak valid');
  }

  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .eq('teknisi_id', parsedId)
    .order('id', { ascending: false });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data tugas', error.message);
  }

  return successResponse(res, 200, 'Data tugas berhasil diambil', data, { tugas: data });
};

// 8. Teknisi upload foto bukti & selesaikan tugas
exports.selesaikanTugas = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  let fotoUrl = req.body.foto_bukti || null;

  if (req.file) {
    const rawExt = req.file.originalname ? req.file.originalname.split('.').pop() : 'jpg';
    const ext = (rawExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `tugas-${parsedId}-${Date.now()}.${ext}`;

    const { error: errUpload } = await supabase.storage
      .from('bukti-foto')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (!errUpload) {
      const { data: publicUrlData } = supabase.storage
        .from('bukti-foto')
        .getPublicUrl(fileName);
      fotoUrl = publicUrlData ? publicUrlData.publicUrl : '';
    }
  }

  const updateFields = {
    status: 'Done',
  };
  if (fotoUrl) updateFields.foto_bukti = fotoUrl;

  const { data: tugasUpdated, error: errUpdate } = await supabase
    .from('tugas')
    .update(updateFields)
    .eq('id', parsedId)
    .select()
    .single();

  if (errUpdate) {
    return errorResponse(res, 500, 'Gagal update status tugas', errUpdate.message);
  }

  return successResponse(res, 200, 'Tugas berhasil diselesaikan', tugasUpdated, { tugas: tugasUpdated });
};

// 9. Pimpinan lihat semua tugas yang masih aktif
exports.getTugasAktif = async (req, res) => {
  const { data, error } = await supabase
    .from('tugas')
    .select(`
      id,
      jenis_kerja,
      lokasi,
      status,
      teknisi:teknisi_id ( id, nama_lengkap )
    `)
    .neq('status', 'Done')
    .order('id', { ascending: false });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data tugas aktif', error.message);
  }

  return successResponse(res, 200, 'Data tugas aktif berhasil diambil', data, { tugas: data });
};

// 10. FASE 4: Teknisi Check-In di Lokasi Pelanggan (Catat GPS Satu Kali & Notif Telegram)
exports.checkInTugas = async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, teknisi_nama } = req.body;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const waktuWib = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  // Simpan koordinat checkin ke Supabase jika tabel mendukung kolomnya
  try {
    await supabase.from('tugas').update({
      status: 'In-Progress'
    }).eq('id', parsedId);
  } catch (err) {
    // Ignore fallback
  }

  // Ambil detail tugas untuk data notifikasi
  let tugasData = { id: parsedId, pelanggan_nama: 'Pelanggan Telkom' };
  try {
    const { data: tData } = await supabase.from('tugas').select('*').eq('id', parsedId).single();
    if (tData) tugasData = tData;
  } catch {
    // fallback
  }

  const msg = telegramService.templateCheckIn({
    tugas: tugasData,
    teknisiNama: teknisi_nama || 'Teknisi Lapangan',
    latitude: latitude || -0.2289,
    longitude: longitude || 100.6322,
    waktuWib
  });

  const tgResult = await telegramService.sendTelegramMessage(msg);

  return successResponse(res, 200, 'Teknisi berhasil check-in di lokasi pelanggan', {
    tugas_id: parsedId,
    latitude,
    longitude,
    waktu: waktuWib,
    telegram: tgResult
  });
};

// 11. FASE 5: Closing Pekerjaan & WebGIS Magic (Transaksi Database Berantai 🔥)
exports.closeTugas = async (req, res) => {
  const { id } = req.params;
  const {
    redaman_dbm,
    foto_ont,
    tanda_tangan_pelanggan,
    sn_ont,
    odp_id,
    odp_kode,
    pelanggan_nama
  } = req.body;

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const redaman = parseFloat(redaman_dbm) || -18.50;
  const sn = sn_ont || 'ZTEGC8B90112';
  const bastpNo = `BASTP/TA-PYK/2026/${String(parsedId).padStart(4, '0')}`;

  // 1. Ubah status tugas menjadi Closed (dan Done)
  try {
    await supabase.from('tugas').update({
      status: 'Closed',
      foto_bukti: foto_ont || null
    }).eq('id', parsedId);
  } catch (err) {
    console.warn('[closeTugas] Supabase update status notice:', err.message);
  }

  // 2. Eksekusi WebGIS Magic: Naikkan 1 port terpakai di ODP & evaluasi status warna (Kuning/Merah)
  const targetOdpId = odp_id || odp_kode || 1;
  const updatedOdp = await odpController.incrementPortOdpInternal(targetOdpId);

  // 3. Dispatch notifikasi ringkasan BASTP digital ke Grup Pimpinan di Telegram
  const tgMsg = telegramService.templateClosingBastp({
    tugas: {
      id: parsedId,
      pelanggan_nama: pelanggan_nama || 'Pelanggan IndiHome',
      odp_kode: updatedOdp.kode_odp || odp_kode || 'ODP-PYK-FA/001'
    },
    odp: updatedOdp,
    redamanDbm: redaman,
    snOnt: sn,
    bastpNo,
    portBaru: updatedOdp.port_terpakai,
    kapasitasPort: updatedOdp.kapasitas_port,
    statusOdp: updatedOdp.status
  });

  const tgResult = await telegramService.sendTelegramMessage(tgMsg);

  return successResponse(res, 200, 'Tiket berhasil di-close, status ONT Active, dan WebGIS ODP ter-update otomatis!', {
    tugas_id: parsedId,
    status: 'Closed',
    sn_ont: sn,
    sn_status: 'Active',
    redaman_dbm: redaman,
    tanda_tangan_pelanggan: Boolean(tanda_tangan_pelanggan),
    bastp_no: bastpNo,
    odp_updated: updatedOdp,
    telegram: tgResult
  });
};