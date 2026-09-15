# Backend Starter - STO Payakumbuh (versi Supabase)

## Langkah menjalankan (urut, jangan diloncat)

### 1. Buat project di Supabase
- Buka https://supabase.com, sign up/login (bisa pakai akun GitHub/Google)
- Klik "New Project"
- Isi nama project, pilih region terdekat (Singapore biasanya paling cepat dari Indonesia)
- Buat password database yang KUAT dan **CATAT/SIMPAN** — ini beda dari password login Supabase kamu
- Tunggu ±2 menit sampai project selesai dibuat

### 2. Ambil connection string
- Di dashboard project, klik ikon gear (Project Settings) > "Database"
- Cari bagian "Connection string" > pilih tab "URI"
- Copy string-nya, formatnya kira-kira:
  ```
  postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
  ```
- Ganti `[YOUR-PASSWORD]` dengan password database yang kamu catat tadi

### 3. Siapkan file .env
- Copy `.env.example` jadi file baru bernama `.env`
- Tempel connection string tadi ke `DATABASE_URL`

### 4. Jalankan schema database
- Di dashboard Supabase, klik menu "SQL Editor" di sidebar kiri
- Klik "New query"
- Buka file `schema.sql` dari folder ini, copy semua isinya, paste ke SQL Editor
- Klik "Run" (atau Ctrl+Enter)
- Kalau berhasil, cek menu "Table Editor" — harusnya muncul 6 tabel: users, material, permohonan_barang, detail_permohonan, laporan_instalasi, dokumentasi_foto

### 5. Install dependency
Buka terminal di folder `backend-starter`, jalankan:
```
npm install express pg dotenv cors jsonwebtoken bcryptjs
```
(Kalau sebelumnya sempat install `mysql2`, boleh dihapus: `npm uninstall mysql2` — tidak dipakai lagi.)

### 6. Jalankan server
```
node server.js
```
Kalau berhasil, muncul: `Server jalan di http://localhost:5000`

### 7. Test pakai Postman
**a) Cek koneksi database**
- GET `http://localhost:5000/api/test-db`
- Harusnya muncul: `{"status":"ok","message":"Database connected","waktu_sekarang":"..."}`

**b) Register user baru**
- POST `http://localhost:5000/api/auth/register`
- Body (raw, JSON):
```json
{
  "nik": "budi001",
  "nama": "Budi Santoso",
  "password": "rahasia123",
  "role": "teknisi"
}
```

**c) Login**
- POST `http://localhost:5000/api/auth/login`
- Body (raw, JSON):
```json
{
  "nik": "budi001",
  "password": "rahasia123"
}
```

## Struktur folder
```
backend-starter/
├── routes/
│   └── auth.js       -> endpoint register & login
├── db.js              -> koneksi ke Supabase (PostgreSQL)
├── server.js          -> file utama, jalankan ini
├── schema.sql          -> struktur tabel (jalankan di SQL Editor Supabase)
├── .env.example         -> contoh isi .env (copy jadi .env)
└── package.json          -> muncul otomatis setelah npm init
```

## Langkah selanjutnya
Setelah login & register jalan lancar, lanjut bikin endpoint baru sesuai fokus kamu:
- **Logika transaksi**: `routes/material.js`, `routes/permohonan.js`
- **Security & upload file**: middleware cek token/role, endpoint upload foto (bisa pakai Supabase Storage langsung, tidak perlu `multer` + server sendiri)
- **Laporan instalasi**: `routes/laporan.js`
