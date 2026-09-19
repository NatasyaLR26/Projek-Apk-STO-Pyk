const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Pimpinan membuat tugas baru untuk teknisi (Bisa disiarkan ke pool terbuka dengan teknisi_id: null)
exports.createTugas = async (req, res) => {
  const { pimpinan_id, teknisi_id, jenis_kerja, lokasi, pelanggan_nama, pelanggan_telp, keterangan, catatan, status } = req.body;

  // validasi input dasar (teknisi_id opsional untuk pool terbuka)
  if (!pimpinan_id || !jenis_kerja || !lokasi) {
    return errorResponse(res, 400, 'Pimpinan ID, jenis pekerjaan, dan lokasi wajib diisi');
  }

  const parsedPimpinanId = parseInt(pimpinan_id, 10);
  const parsedTeknisiId = teknisi_id ? parseInt(teknisi_id, 10) : null;

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
  };

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

  if (error) {
    return errorResponse(res, 500, 'Gagal membuat tugas', error.message);
  }

  return successResponse(res, 201, 'Tugas berhasil dibuat dan disiarkan', data, { tugas: data });
};

// Teknisi mengklaim/mengambil tugas dari pool terbuka
exports.claimTugas = async (req, res) => {
  const { id } = req.params; // tugas_id
  const { teknisi_id } = req.body;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const parsedTeknisiId = parseInt(teknisi_id, 10);
  if (!teknisi_id || isNaN(parsedTeknisiId) || parsedTeknisiId <= 0) {
    return errorResponse(res, 400, 'Teknisi ID wajib disertakan dan harus berupa angka valid');
  }

  // Cek apakah tugas ada dan statusnya
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

  if (existingTugas.teknisi_id && existingTugas.teknisi_id !== parsedTeknisiId && existingTugas.status !== 'Open') {
    return errorResponse(res, 409, 'Tugas sudah diklaim oleh teknisi lain');
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

// Ambil daftar tugas yang masih terbuka (belum diambil teknisi)
exports.getOpenTugas = async (req, res) => {
  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .or('teknisi_id.is.null,status.eq.Open')
    .order('id', { ascending: false });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data tugas terbuka', error.message);
  }

  return successResponse(res, 200, 'Data tugas terbuka berhasil diambil', data, { tugas: data });
};

// Teknisi melihat daftar tugas miliknya
exports.getTugasByTeknisi = async (req, res) => {
  const { id } = req.params; // teknisi_id

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

// Teknisi upload foto bukti & selesaikan tugas
exports.selesaikanTugas = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  if (!req.file) {
    return errorResponse(res, 400, 'File foto wajib diupload');
  }

  const rawExt = req.file.originalname ? req.file.originalname.split('.').pop() : 'jpg';
  const ext = (rawExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const fileName = `tugas-${parsedId}-${Date.now()}.${ext}`;

  const { error: errUpload } = await supabase.storage
    .from('bukti-foto')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
    });

  if (errUpload) {
    return errorResponse(res, 500, 'Gagal upload foto', errUpload.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from('bukti-foto')
    .getPublicUrl(fileName);

  const fotoUrl = publicUrlData ? publicUrlData.publicUrl : '';

  const { data: tugasUpdated, error: errUpdate } = await supabase
    .from('tugas')
    .update({
      foto_bukti: fotoUrl,
      status: 'Done',
    })
    .eq('id', parsedId)
    .select()
    .single();

  if (errUpdate) {
    return errorResponse(res, 500, 'Gagal update status tugas', errUpdate.message);
  }

  return successResponse(res, 200, 'Tugas berhasil diselesaikan', tugasUpdated, { tugas: tugasUpdated });
};

// Pimpinan lihat semua tugas yang masih aktif (belum Done) - untuk WebGIS tracking
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