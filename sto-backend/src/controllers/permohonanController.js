const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Teknisi ajukan permohonan barang (bisa lebih dari 1 jenis barang)
exports.createPermohonan = async (req, res) => {
  const { tugas_id, barang } = req.body;

  if (!tugas_id || !barang || !Array.isArray(barang) || barang.length === 0) {
    return errorResponse(res, 400, 'tugas_id dan barang wajib diisi');
  }

  const parsedTugasId = parseInt(tugas_id, 10);
  if (isNaN(parsedTugasId) || parsedTugasId <= 0) {
    return errorResponse(res, 400, 'Format tugas_id tidak valid');
  }

  const { data: permohonan, error: errPermohonan } = await supabase
    .from('permohonan')
    .insert([
      {
        tugas_id: parsedTugasId,
        status: 'Pending',
        waktu_request: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (errPermohonan) {
    return errorResponse(res, 500, 'Gagal membuat permohonan', errPermohonan.message);
  }

  const detailRows = barang.map((item) => ({
    permohonan_id: permohonan.id,
    barang_id: parseInt(item.barang_id, 10),
    jumlah_minta: parseInt(item.jumlah_minta, 10),
  }));

  const { data: detail, error: errDetail } = await supabase
    .from('detail_permohonan')
    .insert(detailRows)
    .select();

  if (errDetail) {
    return errorResponse(res, 500, 'Gagal menyimpan detail barang', errDetail.message);
  }

  return successResponse(res, 201, 'Permohonan berhasil diajukan', { permohonan, detail }, {
    permohonan,
    detail,
  });
};

// Pimpinan lihat semua permohonan yang masih Pending
exports.getPermohonanPending = async (req, res) => {
  const { data, error } = await supabase
    .from('permohonan')
    .select('*, detail_permohonan(*)')
    .eq('status', 'Pending');

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data permohonan pending', error.message);
  }

  return successResponse(res, 200, 'Data permohonan pending berhasil diambil', data, { permohonan: data });
};

// Pimpinan approve permohonan, sistem otomatis potong stok barang
exports.approvePermohonan = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId)) {
    return errorResponse(res, 400, 'ID permohonan tidak valid');
  }

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

  for (const item of detail) {
    const { data: barang, error: errBarang } = await supabase
      .from('barang')
      .select('stok, nama_barang')
      .eq('id', item.barang_id)
      .single();

    if (errBarang || !barang) {
      return errorResponse(res, 404, `Barang id ${item.barang_id} tidak ditemukan`);
    }

    if (barang.stok < item.jumlah_minta) {
      return errorResponse(
        res,
        400,
        `Stok tidak cukup untuk ${barang.nama_barang} (sisa: ${barang.stok}, diminta: ${item.jumlah_minta})`
      );
    }
  }

  for (const item of detail) {
    const { data: barang } = await supabase
      .from('barang')
      .select('stok')
      .eq('id', item.barang_id)
      .single();

    const stokBaru = barang.stok - item.jumlah_minta;

    const { error: errUpdateStok } = await supabase
      .from('barang')
      .update({ stok: stokBaru })
      .eq('id', item.barang_id);

    if (errUpdateStok) {
      return errorResponse(res, 500, 'Gagal memotong stok', errUpdateStok.message);
    }
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

  return successResponse(res, 200, 'Permohonan disetujui, stok berhasil diperbarui', permohonanUpdated, {
    permohonan: permohonanUpdated,
  });
};