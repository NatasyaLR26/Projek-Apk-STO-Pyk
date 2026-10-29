/**
 * ============================================================================
 * KONFIGURASI APLIKASI EXPRESS (sto-backend/src/app.js)
 * ============================================================================
 * Penjelasan Teknis Operasional:
 * File ini mengatur alur request HTTP, middleware keamanan/CORS, dan rute-rute API.
 * 
 * DAFTAR ENDPOINT API:
 * 1. GET  /                   -> Cek kesehatan server (Health Check)
 * 2. /api/auth                -> Login & Pendaftaran akun teknisi
 * 3. /api/tugas               -> Manajemen tiket tugas (buat tugas, klaim, selesai)
 * 4. /api/barang              -> Inventaris gudang (stok masuk, keluar, edit, hapus)
 * 5. /api/permohonan          -> Permohonan material teknisi & approval pimpinan
 * 6. /api/tracking            -> Pelacakan koordinat GPS teknisi real-time
 * 7. /api/laporan             -> Laporan rekapitulasi audit pekerjaan
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');

// Mengimpor modul rute (Routes)
const authRoutes = require('./routes/authRoutes');
const tugasRoutes = require('./routes/tugasRoutes');
const permohonanRoutes = require('./routes/permohonanRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const barangRoutes = require('./routes/barangRoutes');
const odpRoutes = require('./routes/odpRoutes');
const telegramRoutes = require('./routes/telegramRoutes');

// Inisialisasi aplikasi Express
const app = express();

// Middleware 1: CORS agar aplikasi frontend (React di port 5173) diizinkan mengakses API ini
app.use(cors());

// Middleware 2: JSON Parser agar backend bisa membaca body request format JSON
app.use(express.json());

// Rute Dasar: Pengecekan server hidup/aktif
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    pesan: 'Server API STO Telkom Akses Payakumbuh Aktif!',
    waktu: new Date().toISOString()
  });
});

// Mendaftarkan Rute-Rute API Resmi Sistem STO
app.use('/api/auth', authRoutes);               // Autentikasi akun & login
app.use('/api/tugas', tugasRoutes);             // Tiket pekerjaan lapangan
app.use('/api/barang', barangRoutes);           // Inventaris & stok gudang
app.use('/api/permohonan', permohonanRoutes);   // Permohonan material ke gudang
app.use('/api/odp', odpRoutes);                 // Pemetaan Titik ODP / Jaringan FO
app.use('/api/telegram', telegramRoutes);       // Integrasi Bot Telegram @sto_pyk_bot
app.use('/api/laporan', laporanRoutes);         // Berita acara & audit laporan

// Mengekspor objek app agar bisa dijalankan oleh server.js
module.exports = app;