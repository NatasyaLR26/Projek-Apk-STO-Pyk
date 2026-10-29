-- =========================================================================
-- DATABASE SISTEM MONITORING / PENGELOLAAN TUGAS STO PAYAKUMBUH (STO-PYK)
-- Skema Resmi 100% Sinkron dengan Database Supabase Anda
-- =========================================================================

-- 1. TABEL USERS (PIMPINAN, TEKNISI, GUDANG)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('pimpinan', 'teknisi', 'gudang')),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);


-- 2. TABEL TUGAS
CREATE TABLE IF NOT EXISTS tugas (
    id BIGSERIAL PRIMARY KEY,
    pimpinan_id BIGINT NOT NULL,
    teknisi_id BIGINT,
    jenis_kerja VARCHAR(100) NOT NULL,
    lokasi TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'menunggu',
    foto_bukti TEXT,

    CONSTRAINT fk_tugas_pimpinan
        FOREIGN KEY (pimpinan_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tugas_teknisi
        FOREIGN KEY (teknisi_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- PENTING UNTUK FITUR TIKET TERBUKA (OPEN POOL):
-- Jika tabel tugas Anda sebelumnya dibuat dengan 'teknisi_id NOT NULL',
-- jalankan perintah SQL satu baris ini di Supabase SQL Editor agar Pimpinan
-- bisa menyiarkan tiket tanpa harus menunjuk teknisi terlebih dahulu:
-- ALTER TABLE tugas ALTER COLUMN teknisi_id DROP NOT NULL;


-- 3. TABEL BARANG (INVENTARIS LOGISTIK GUDANG)
CREATE TABLE IF NOT EXISTS barang (
    id BIGSERIAL PRIMARY KEY,
    nama_barang VARCHAR(100) NOT NULL,
    stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
    satuan VARCHAR(30) NOT NULL
);


-- 4. TABEL PERMOHONAN (PENGAJUAN MATERIAL TEKNISI KE GUDANG)
CREATE TABLE IF NOT EXISTS permohonan (
    id BIGSERIAL PRIMARY KEY,
    tugas_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'menunggu',
    waktu_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_permohonan_tugas
        FOREIGN KEY (tugas_id)
        REFERENCES tugas(id)
        ON DELETE CASCADE
);


-- 5. TABEL DETAIL PERMOHONAN (RINCIAN ITEM & JUMLAH MINTA)
CREATE TABLE IF NOT EXISTS detail_permohonan (
    id BIGSERIAL PRIMARY KEY,
    permohonan_id BIGINT NOT NULL,
    barang_id BIGINT NOT NULL,
    jumlah_minta INTEGER NOT NULL CHECK (jumlah_minta > 0),

    CONSTRAINT fk_detail_permohonan
        FOREIGN KEY (permohonan_id)
        REFERENCES permohonan(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_detail_barang
        FOREIGN KEY (barang_id)
        REFERENCES barang(id)
        ON DELETE CASCADE
);


-- 6. TABEL ODP (OPTICAL DISTRIBUTION POINT - INFRASTRUKTUR WEBGIS FIBER OPTIC)
CREATE TABLE IF NOT EXISTS odp (
    id BIGSERIAL PRIMARY KEY,
    kode_odp VARCHAR(50) UNIQUE NOT NULL,
    nama_lokasi TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    kapasitas_port INTEGER NOT NULL DEFAULT 8,
    port_terpakai INTEGER NOT NULL DEFAULT 0,
    redaman_dbm DECIMAL(5, 2) DEFAULT -18.50,
    status VARCHAR(30) NOT NULL DEFAULT 'Tersedia', -- 'Tersedia', 'Penuh', 'Maintenance'
    keterangan TEXT
);


-- =========================================================================
-- DATA AWAL (SEED DATA REAL STO PAYAKUMBUH)
-- =========================================================================

-- Data User Awal:
INSERT INTO users (nama_lengkap, role, email, password) VALUES
('Ir. Bambang Sudirman, M.T.', 'pimpinan', 'pimpinan@telkomakses.co.id', 'password123'),
('Ahmad Fadli', 'teknisi', 'fadli.teknisi@telkomakses.co.id', 'password123'),
('Budi Santoso', 'teknisi', 'budi.teknisi@telkomakses.co.id', 'password123'),
('Siti Rahmawati', 'gudang', 'gudang@telkomakses.co.id', 'password123')
ON CONFLICT (email) DO NOTHING;

-- Data Barang Awal (Sesuai database STO-PYK):
INSERT INTO barang (nama_barang, stok, satuan) VALUES
('Kabel FO Dropcore', 105, 'roll'),
('Modem ONT ZTE', 11, 'pcs'),
('Roset Fiber Optic', 50, 'pcs'),
('Patch Cord SC-UPC 2M', 80, 'pcs'),
('Splitter PLC 1:8 SC/UPC', 15, 'pcs'),
('Protection Sleeve 60mm', 200, 'pcs')
ON CONFLICT DO NOTHING;

-- Data ODP Awal (Infrastruktur Jaringan Fiber Optic STO Payakumbuh):
INSERT INTO odp (kode_odp, nama_lokasi, latitude, longitude, kapasitas_port, port_terpakai, redaman_dbm, status, keterangan) VALUES
('ODP-PYK-FA/001', 'Jl. Soekarno Hatta No. 14, Koto Nan IV (Depan STO)', -0.2285, 100.6335, 8, 6, -17.80, 'Tersedia', 'Distribusi feeder utama jalur STO - Kantor Pemerintahan'),
('ODP-PYK-FA/002', 'Balai Nan Duo, Payakumbuh Barat (Tiang FO 04)', -0.2310, 100.6355, 8, 8, -19.40, 'Penuh', 'Kawasan pemukiman padat penduduk - Port penuh terisi pelanggan'),
('ODP-PYK-FA/003', 'Jl. Jenderal Sudirman, Labuh Basilang (Kawasan Ruko)', -0.2245, 100.6380, 16, 11, -18.25, 'Tersedia', 'Splitter 1:16 melayani pelanggan IndiHome Bisnis dan Cafe'),
('ODP-PYK-FA/004', 'Kawasan Pasar Ibuh, Payakumbuh Barat', -0.2260, 100.6362, 8, 5, -18.90, 'Tersedia', 'Tiang distribusi sentra pertokoan pasar'),
('ODP-PYK-FA/005', 'Simpang Benteng, Payolansek, Payakumbuh', -0.2215, 100.6305, 8, 3, -17.20, 'Tersedia', 'Kondisi redaman sangat bagus, port cadangan memadai'),
('ODP-PYK-FA/006', 'Kelurahan Tiakar, Payakumbuh Timur', -0.2335, 100.6410, 8, 7, -26.50, 'Maintenance', 'Redaman tinggi (> -24 dBm), dijadwalkan perbaikan adapter ODP')
ON CONFLICT (kode_odp) DO NOTHING;

