const supabase = require('../config/supabaseClient');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(404).json({ message: 'Email tidak ditemukan' });
  }

  if (user.password !== password) {
    return res.status(401).json({ message: 'Password salah' });
  }

  res.json({
    message: 'Login berhasil',
    user: {
      id: user.id,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      email: user.email,
    },
  });
};

// Ambil daftar user dengan role teknisi (untuk dropdown pilih teknisi)
exports.getTeknisiList = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, nama_lengkap')
    .eq('role', 'teknisi');

  if (error) {
    return res.status(500).json({ message: 'Gagal mengambil daftar teknisi', error: error.message });
  }

  res.json({ teknisi: data });
};