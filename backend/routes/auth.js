const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// REGISTER - sementara buat bikin akun testing
router.post('/register', async (req, res) => {
  try {
    const { nik, nama, password, role } = req.body;

    if (!nik || !nama || !password || !role) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    if (!['teknisi', 'gudang', 'pimpinan'].includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (nik, nama, password, role) VALUES ($1, $2, $3, $4)',
      [nik, nama, hashedPassword, role]
    );

    res.json({ message: 'User berhasil dibuat' });
  } catch (err) {
    // kalau NIK sudah dipakai, Postgres akan kasih error duplicate key
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { nik, password } = req.body;

    if (!nik || !password) {
      return res.status(400).json({ message: 'NIK dan password wajib diisi' });
    }

    const result = await db.query('SELECT * FROM users WHERE nik = $1', [nik]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'NIK atau password salah' });
    }

    const user = result.rows[0];
    const cocok = await bcrypt.compare(password, user.password);
    if (!cocok) {
      return res.status(401).json({ message: 'NIK atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, nik: user.nik, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: { id: user.id, nama: user.nama, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
