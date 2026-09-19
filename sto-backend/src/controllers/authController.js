const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 400, 'Email dan password wajib diisi');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email.trim())
    .single();

  if (error || !user) {
    return errorResponse(res, 404, 'Email tidak ditemukan');
  }

  if (user.password !== password) {
    return errorResponse(res, 401, 'Password salah');
  }

  const userData = {
    id: user.id,
    nama_lengkap: user.nama_lengkap,
    role: user.role,
    email: user.email,
  };

  return successResponse(res, 200, 'Login berhasil', { user: userData }, { user: userData });
};

// Ambil daftar user dengan role teknisi (untuk dropdown pilih teknisi)
exports.getTeknisiList = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, nama_lengkap')
    .eq('role', 'teknisi');

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil daftar teknisi', error.message);
  }

  return successResponse(res, 200, 'Daftar teknisi berhasil diambil', data, { teknisi: data });
};