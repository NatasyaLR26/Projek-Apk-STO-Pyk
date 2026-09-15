const supabase = require('../config/supabaseClient');

// Teknisi ajukan permohonan barang (bisa lebih dari 1 jenis barang)
exports.createPermohonan = async (req, res) => {
  const { tugas_id, barang } = req.body;
  // barang = array, contoh: [{ barang_id: 1, jumlah_minta: 15 }, { barang_id: 2, jumlah_minta: 1 }]

  if (!tugas_id || !barang || barang.length === 0) {
    return res.status(400).json({ message: 'tugas_id dan barang wajib diisi' });
  }

  // 1. Insert ke tabel permohonan (header)
  const { data: permohonan, error: errPermohonan } = await supabase
    .from('permohonan')
    .insert([
      {
        tugas_id,
        status: 'Pending',
        waktu_request: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (errPermohonan) {
    return res.status(500).json({ message: 'Gagal membuat permohonan', error: errPermohonan.message });
  }

  // 2. Insert rincian barang ke detail_permohonan
  const detailRows = barang.map((item) => ({
    permohonan_id: permohonan.id,
    barang_id: item.barang_id,
    jumlah_minta: item.jumlah_minta,
  }));

  const { data: detail, error: errDetail } = await supabase
    .from('detail_permohonan')
    .insert(detailRows)
    .select();

  if (errDetail) {
    return res.status(500).json({ message: 'Gagal menyimpan detail barang', error: errDetail.message });
  }

  res.status(201).json({
    message: 'Permohonan berhasil diajukan',
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
    return res.status(500).json({ message: 'Gagal mengambil data', error: error.message });
  }

  res.json({ permohonan: data });
};