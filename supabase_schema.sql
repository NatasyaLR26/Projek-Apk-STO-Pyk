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


-- 6. TABEL TRACKING GPS (TELEMETRI KOORDINAT LAPANGAN)
CREATE TABLE IF NOT EXISTS tracking_gps (
    id BIGSERIAL PRIMARY KEY,
    tugas_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    waktu_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_tracking_tugas
        FOREIGN KEY (tugas_id)
        REFERENCES tugas(id)
        ON DELETE CASCADE
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
