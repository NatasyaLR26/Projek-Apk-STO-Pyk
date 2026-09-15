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