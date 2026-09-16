const supabase = require('../config/supabaseClient');

// Ambil semua barang di gudang (untuk dropdown request material)
exports.getAllBarang = async (req, res) => {
  const { data, error } = await supabase
    .from('barang')
    .select('*')
    .order('nama_barang', { ascending: true });

  if (error) {
    return res.status(500).json({ message: 'Gagal mengambil data barang', error: error.message });
  }

  res.json({ barang: data });
};