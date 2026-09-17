const supabase = require('../config/supabaseClient');

// Teknisi ajukan permohonan barang (bisa lebih dari 1 jenis barang)
exports.createPermohonan = async (req, res) => {
  const { tugas_id, barang } = req.body;

  if (!tugas_id || !barang || barang.length === 0) {
    return res.status(400).json({ message: 'tugas_id dan barang wajib diisi' });
  }

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
}; // <<< INI baris terakhir fungsi getPermohonanPending

// ========== TAMBAHIN MULAI DARI SINI ==========

// Pimpinan approve permohonan, sistem otomatis potong stok barang
exports.approvePermohonan = async (req, res) => {
  const { id } = req.params;

  const { data: detail, error: errDetail } = await supabase
    .from('detail_permohonan')
    .select('barang_id, jumlah_minta')
    .eq('permohonan_id', id);

  if (errDetail) {
    return res.status(500).json({ message: 'Gagal mengambil detail permohonan', error: errDetail.message });
  }

  if (!detail || detail.length === 0) {
    return res.status(404).json({ message: 'Detail permohonan tidak ditemukan' });
  }

  for (const item of detail) {
    const { data: barang, error: errBarang } = await supabase
      .from('barang')
      .select('stok, nama_barang')
      .eq('id', item.barang_id)
      .single();

    if (errBarang || !barang) {
      return res.status(404).json({ message: `Barang id ${item.barang_id} tidak ditemukan` });
    }

    if (barang.stok < item.jumlah_minta) {
      return res.status(400).json({
        message: `Stok tidak cukup untuk ${barang.nama_barang} (sisa: ${barang.stok}, diminta: ${item.jumlah_minta})`,
      });
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
      return res.status(500).json({ message: 'Gagal memotong stok', error: errUpdateStok.message });
    }
  }

  const { data: permohonanUpdated, error: errUpdatePermohonan } = await supabase
    .from('permohonan')
    .update({ status: 'Approved' })
    .eq('id', id)
    .select()
    .single();

  if (errUpdatePermohonan) {
    return res.status(500).json({ message: 'Gagal update status permohonan', error: errUpdatePermohonan.message });
  }

  res.json({
    message: 'Permohonan disetujui, stok berhasil diperbarui',
    permohonan: permohonanUpdated,
  });
};