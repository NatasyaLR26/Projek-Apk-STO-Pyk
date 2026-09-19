const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Ambil semua barang di gudang (untuk dropdown request material)
exports.getAllBarang = async (req, res) => {
  const { data, error } = await supabase
    .from('barang')
    .select('*')
    .order('nama_barang', { ascending: true });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data barang', error.message);
  }

  return successResponse(res, 200, 'Data barang berhasil diambil', data, { barang: data });
};