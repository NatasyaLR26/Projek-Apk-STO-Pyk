const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const materialRoutes = require('./routes/material');
const { verifyToken, authorizeRoles } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Route buat mastiin server & database (Supabase) nyambung
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS waktu_sekarang');
    res.json({ status: 'ok', message: 'Database connected', waktu_sekarang: result.rows[0].waktu_sekarang });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/material', materialRoutes);

// CONTOH route yang diproteksi - buat testing middleware aja
// Semua role yang sudah login boleh akses ini
app.get('/api/profile', verifyToken, (req, res) => {
  res.json({ message: 'Berhasil akses data pribadi', user: req.user });
});

// CONTOH route yang cuma boleh diakses pimpinan
app.get('/api/only-pimpinan', verifyToken, authorizeRoles('pimpinan'), (req, res) => {
  res.json({ message: 'Selamat datang, Pimpinan!', user: req.user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
