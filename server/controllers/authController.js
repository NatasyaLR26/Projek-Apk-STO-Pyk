const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nama_lengkap, role, email, password FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const user = result.rows[0];

    // Check plain text password or hashed password for flexibility
    const isMatch = (password === user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const payload = {
      id: user.id,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'sto_telkom_akses_jwt_secret_key_2026_payakumbuh',
      { expiresIn: '1d' }
    );

    return res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: payload
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
  }
};

const getTeknisiList = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nama_lengkap, email FROM users WHERE role = 'teknisi' ORDER BY nama_lengkap ASC"
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching teknisi list:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data teknisi.' });
  }
};

module.exports = {
  login,
  getTeknisiList
};
