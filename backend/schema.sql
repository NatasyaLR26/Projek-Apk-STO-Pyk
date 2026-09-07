-- ============================================
-- Skema Database: PostgreSQL (Supabase)
-- Jalankan ini di Supabase Dashboard > SQL Editor > Run
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nik VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('teknisi', 'gudang', 'pimpinan')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material (
  id SERIAL PRIMARY KEY,
  nama_material VARCHAR(100) NOT NULL,
  satuan VARCHAR(20) NOT NULL,
  stok INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permohonan_barang (
  id SERIAL PRIMARY KEY,
  teknisi_id INT NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'disetujui', 'ditolak')),
  catatan VARCHAR(255),
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detail_permohonan (
  id SERIAL PRIMARY KEY,
  permohonan_id INT NOT NULL REFERENCES permohonan_barang(id),
  material_id INT NOT NULL REFERENCES material(id),
  jumlah INT NOT NULL
);

CREATE TABLE IF NOT EXISTS laporan_instalasi (
  id SERIAL PRIMARY KEY,
  permohonan_id INT REFERENCES permohonan_barang(id),
  teknisi_id INT NOT NULL REFERENCES users(id),
  nama_pelanggan VARCHAR(100) NOT NULL,
  alamat VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  status VARCHAR(20) DEFAULT 'proses' CHECK (status IN ('proses', 'selesai', 'kendala')),
  catatan_kendala VARCHAR(255),
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dokumentasi_foto (
  id SERIAL PRIMARY KEY,
  laporan_id INT NOT NULL REFERENCES laporan_instalasi(id),
  foto_url VARCHAR(255) NOT NULL,
  jenis_foto VARCHAR(20) DEFAULT 'sesudah' CHECK (jenis_foto IN ('sebelum', 'sesudah')),
  keterangan VARCHAR(255)
);

-- Contoh data material buat testing
INSERT INTO material (nama_material, satuan, stok) VALUES
('Kabel Drop Core', 'meter', 500),
('Modem ONT', 'pcs', 20),
('Konektor SC/APC', 'pcs', 100);
