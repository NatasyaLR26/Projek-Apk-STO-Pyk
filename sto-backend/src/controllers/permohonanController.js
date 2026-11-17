const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const telegramService = require('../services/telegramService');

// 1. Ambil semua permohonan (dengan detail barang & relasi tugas)
exports.getAllPermohonan = async (req, res) => {
  const { data, error } = await supabase
    .from('permohonan')
    .select(`
      *,
      detail_permohonan (
        id,
        barang_id,
        jumlah_minta,
        barang:barang_id ( id, nama_barang, satuan, stok )
      ),
      tugas:tugas_id (
        id,
        jenis_kerja,
        lokasi,
        status,
        teknisi_id,
        teknisi:teknisi_id ( id, nama_lengkap )
      )
    `)
    .order('id', { ascending: false });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data permohonan material', error.message);
  }

  return successResponse(res, 200, 'Data permohonan material berhasil diambil', data, { permohonan: data });
};

// 2. Teknisi ajukan permohonan barang (mendukung batch multi-tiket & single ticket)
exports.createPermohonan = async (req, res) => {
  const { tugas_id, tugas_ids, barang } = req.body;

  // Kumpulkan seluruh target tugas ID dari payload (baik single tugas_id maupun array tugas_ids)
  const rawIds = Array.isArray(tugas_ids) && tugas_ids.length > 0 ? tugas_ids : (tugas_id ? [tugas_id] : []);
  const targetTugasIds = Array.from(new Set(rawIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n) && n > 0)));

  if (targetTugasIds.length === 0 || !barang || !Array.isArray(barang) || barang.length === 0) {
    return errorResponse(res, 400, 'tugas_id / tugas_ids dan barang wajib diisi');
  }

  const now = new Date().toISOString();
  const permohonanRows = targetTugasIds.map((tid) => ({
    tugas_id: tid,
    status: 'Pending',
    waktu_request: now,
  }));

  // Batch insert ke tabel permohonan untuk semua tiket yang dipilih
  const { data: createdPermohonans, error: errPermohonan } = await supabase
    .from('permohonan')
    .insert(permohonanRows)
    .select();

  if (errPermohonan || !createdPermohonans || createdPermohonans.length === 0) {
    return errorResponse(res, 500, 'Gagal membuat permohonan material', errPermohonan?.message);
  }

  // Insert detail barang untuk setiap permohonan tiket yang dibuat
  const detailRows = [];
  createdPermohonans.forEach((p) => {
    barang.forEach((item) => {
      detailRows.push({
        permohonan_id: p.id,
        barang_id: parseInt(item.barang_id, 10),
        jumlah_minta: parseInt(item.jumlah_minta, 10),
      });
    });
  });

  const { data: detail, error: errDetail } = await supabase
    .from('detail_permohonan')
    .insert(detailRows)
    .select();

  if (errDetail) {
    return errorResponse(res, 500, 'Gagal menyimpan detail barang', errDetail.message);
  }

  // Update status seluruh tugas terkait menjadi Progress dan tetapkan teknisi_id jika dikirim
  const taskUpdatePayload = { status: 'Progress' };
  if (req.body.teknisi_id) {
    const techId = parseInt(req.body.teknisi_id, 10);
    if (!isNaN(techId) && techId > 0) {
      taskUpdatePayload.teknisi_id = techId;
    }
  }
  await supabase
    .from('tugas')
    .update(taskUpdatePayload)
    .in('id', targetTugasIds);

  // Dispatch Notifikasi Pengajuan Barang Baru ke Telegram Group
  try {
    let namaBarangStr = '';
    try {
      const barangIds = barang.map(b => parseInt(b.barang_id, 10));
      const { data: bItems } = await supabase.from('barang').select('id, nama_barang, satuan').in('id', barangIds);
      if (bItems && bItems.length > 0) {
        namaBarangStr = barang.map(b => {
          const match = bItems.find(x => x.id === parseInt(b.barang_id, 10));
          return `${match ? match.nama_barang : 'Barang #' + b.barang_id} (${b.jumlah_minta} ${match ? match.satuan : 'pcs'})`;
        }).join(', ');
      }
    } catch { /* fallback */ }

    if (!namaBarangStr) {
      namaBarangStr = barang.map(b => `${b.jumlah_minta}x [Item #${b.barang_id}]`).join(', ');
    }

    const pemohonNama = req.body.teknisi_nama || req.body.nama || 'Teknisi Lapangan';
    const tiketLabel = targetTugasIds.length > 1
      ? `Batch ${targetTugasIds.length} Tiket (#${targetTugasIds.join(', #')})`
      : `Tiket #${targetTugasIds[0]}`;

    await telegramService.kirimKeGrup(`📦 <b>PENGAJUAN BARANG BARU (${tiketLabel})</b>\nBarang: ${telegramService.esc(namaBarangStr)}\nPemohon: ${telegramService.esc(pemohonNama)}`);
  } catch (tgErr) {
    console.warn('[Telegram Permohonan Notice]', tgErr.message);
  }

  return successResponse(res, 201, `Permohonan untuk ${targetTugasIds.length} tiket berhasil diajukan`, {
    permohonan: createdPermohonans[0],
    permohonanList: createdPermohonans,
    detail,
  });
};

// 3. Pimpinan lihat semua permohonan yang masih Pending
exports.getPermohonanPending = async (req, res) => {
  const { data, error } = await supabase
    .from('permohonan')
    .select(`
      *,
      detail_permohonan (
        id,
        barang_id,
        jumlah_minta,
        barang:barang_id ( id, nama_barang, satuan, stok )
      ),
      tugas:tugas_id (
        id,
        jenis_kerja,
        lokasi,
        teknisi_id,
        teknisi:teknisi_id ( id, nama_lengkap )
      )
    `)
    .eq('status', 'Pending')
    .order('id', { ascending: false });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data permohonan pending', error.message);
  }

  return successResponse(res, 200, 'Data permohonan pending berhasil diambil', data, { permohonan: data });
};

// 4. Pimpinan approve permohonan material
exports.approvePermohonan = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId)) {
    return errorResponse(res, 400, 'ID permohonan tidak valid');
  }

  const { data: permohonanUpdated, error: errUpdatePermohonan } = await supabase
    .from('permohonan')
    .update({ status: 'Approved' })
    .eq('id', parsedId)
    .select()
    .single();

  if (errUpdatePermohonan) {
    return errorResponse(res, 500, 'Gagal update status permohonan', errUpdatePermohonan.message);
  }

  return successResponse(res, 200, 'Permohonan material disetujui pimpinan', permohonanUpdated, {
    permohonan: permohonanUpdated,
  });
};

// 5. Pimpinan tolak permohonan material
exports.rejectPermohonan = async (req, res) => {
  const { id } = req.params;
  const { catatan } = req.body;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId)) {
    return errorResponse(res, 400, 'ID permohonan tidak valid');
  }

  const { data: permohonanUpdated, error: errUpdatePermohonan } = await supabase
    .from('permohonan')
    .update({ status: 'Rejected' })
    .eq('id', parsedId)
    .select()
    .single();

  if (errUpdatePermohonan) {
    return errorResponse(res, 500, 'Gagal menolak permohonan', errUpdatePermohonan.message);
  }

  const message = catatan ? `Permohonan material ditolak: ${catatan}` : 'Permohonan material ditolak';
  return successResponse(res, 200, message, permohonanUpdated, {
    permohonan: permohonanUpdated,
    catatan: catatan || null
  });
};

// 6. Gudang rilis barang fisik & potong stok otomatis
exports.releasePermohonan = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId)) {
    return errorResponse(res, 400, 'ID permohonan tidak valid');
  }

  // 1. Validasi status permohonan terlebih dahulu (Idempotency check: cegah double stock deduction)
  const { data: existingPermohonan, error: errFindPerm } = await supabase
    .from('permohonan')
    .select('id, status, tugas_id')
    .eq('id', parsedId)
    .single();

  if (errFindPerm || !existingPermohonan) {
    return errorResponse(res, 404, 'Permohonan tidak ditemukan');
  }

  if (existingPermohonan.status === 'Released') {
    return errorResponse(res, 400, 'Material untuk permohonan ini sudah pernah dirilis/diserahkan sebelumnya');
  }

  // Ambil detail item permohonan
  const { data: detail, error: errDetail } = await supabase
    .from('detail_permohonan')
    .select('barang_id, jumlah_minta')
    .eq('permohonan_id', parsedId);

  if (errDetail) {
    return errorResponse(res, 500, 'Gagal mengambil detail permohonan', errDetail.message);
  }

  if (!detail || detail.length === 0) {
    return errorResponse(res, 404, 'Detail permohonan tidak ditemukan');
  }

  // Cek ketersediaan stok tiap item
  for (const item of detail) {
    const { data: barang, error: errBarang } = await supabase
      .from('barang')
      .select('stok, nama_barang')
      .eq('id', item.barang_id)
      .single();

    if (errBarang || !barang) {
      return errorResponse(res, 404, `Barang ID ${item.barang_id} tidak ditemukan`);
    }

    if (barang.stok < item.jumlah_minta) {
      return errorResponse(
        res,
        400,
        `Stok gudang tidak mencukupi untuk ${barang.nama_barang} (Sisa: ${barang.stok}, Diminta: ${item.jumlah_minta})`
      );
    }
  }

  // Potong stok real di tabel barang
  for (const item of detail) {
    const { data: barang } = await supabase
      .from('barang')
      .select('stok')
      .eq('id', item.barang_id)
      .single();

    const stokBaru = Math.max(0, (barang?.stok || 0) - item.jumlah_minta);

    const { error: errUpdateStok } = await supabase
      .from('barang')
      .update({ stok: stokBaru })
      .eq('id', item.barang_id);

    if (errUpdateStok) {
      return errorResponse(res, 500, 'Gagal memotong stok barang', errUpdateStok.message);
    }
  }

  // Update status permohonan menjadi Released
  const { data: permohonanUpdated, error: errUpdatePermohonan } = await supabase
    .from('permohonan')
    .update({ status: 'Released' })
    .eq('id', parsedId)
    .select()
    .single();

  if (errUpdatePermohonan) {
    return errorResponse(res, 500, 'Gagal update status rilis permohonan', errUpdatePermohonan.message);
  }

  // FASE 3: Dispatch Notifikasi Rilis Barang & Binding SN ONT (Status: In-Transit) ke Telegram
  try {
    const snOnt = req.body.sn_ont || 'ZTEGC8B90112';
    const petugasGudang = req.body.petugas_gudang || 'Siti Rahmawati';

    let tugasData = { id: permohonanUpdated?.tugas_id || 1, pelanggan_nama: 'Pelanggan Telkom' };
    if (permohonanUpdated?.tugas_id) {
      try {
        const { data: tData } = await supabase.from('tugas').select('*').eq('id', permohonanUpdated.tugas_id).single();
        if (tData) tugasData = tData;
      } catch { /* fallback */ }
    }

    const tgMsg = telegramService.templateRilisBarang({
      tugas: tugasData,
      snOnt,
      petugasGudang
    });
    telegramService.sendTelegramMessage(tgMsg);
  } catch (tgErr) {
    console.warn('[Telegram Release Notice]', tgErr.message);
  }

  return successResponse(res, 200, 'Barang berhasil dirilis & stok gudang otomatis terpotong', permohonanUpdated, {
    permohonan: permohonanUpdated,
  });
};