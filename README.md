# Perancangan Sistem Informasi Manajemen Teknisi dan Inventaris Gudang Berbasis WebGIS
## STO Telkom Akses

Project Kerja Praktek (KP) — Sekolah Tinggi Teknologi Payakumbuh

**Tim:** Ari Suandi Putra, Margi Pangestu, Natasya Lutfyah Ramadhan, Raihan Alhamidy, Restui Zai

---

## Struktur Project

```
Projek-Apk-STO-Pyk/
├── sto-backend/     → Node.js (Express) + Supabase (PostgreSQL)
└── sto-frontend/    → React (Vite) + Tailwind CSS
```

> **Penting:** Semua kode backend masuk ke folder `sto-backend/`, semua kode frontend masuk ke folder `sto-frontend/`. Jangan bikin folder baru sembarangan di root — kalau bingung, tanya dulu sebelum push.

---

## Cara Setup di Laptop Masing-Masing

### 1. Clone repo (sekali aja)
```bash
git clone https://github.com/NatasyaLR26/Projek-Apk-STO-Pyk.git
cd Projek-Apk-STO-Pyk
```

### 2. Install dependency
```bash
cd sto-backend
npm install

cd ../sto-frontend
npm install
```

### 3. Minta file `.env`
File `.env` (isinya kunci Supabase) **tidak ikut ke-push** ke GitHub, demi keamanan. Minta file ini langsung ke Natasya (chat, bukan lewat GitHub), taruh di `sto-backend/.env`.

### 4. Jalankan project
Buka 2 terminal terpisah:

**Terminal 1 — backend:**
```bash
cd sto-backend
npm run dev
```
Jalan di `http://localhost:5000`

**Terminal 2 — frontend:**
```bash
cd sto-frontend
npm run dev
```
Jalan di `http://localhost:5173`

---

## Cara Push Perubahan

1. **Sebelum mulai kerja**, tarik dulu perubahan terbaru:
```bash
git pull origin main
```

2. **Setelah selesai kerja**, commit & push:
```bash
git add -A
git commit -m "tulis di sini kamu ngerjain apa"
git push origin main
```

---

## 4. Alur Kerja Operasional (SOP Sistem)

Berikut adalah diagram alur kerja operasional end-to-end yang mengintegrasikan Pimpinan STO, Teknisi Lapangan, Admin Gudang, Server Backend & WebGIS API, serta Supabase PostgreSQL:

```mermaid
sequenceDiagram
    autonumber
    actor Pimpinan as Pimpinan STO
    actor Teknisi as Teknisi Lapangan
    actor Gudang as Admin Gudang
    participant Server as Server & WebGIS API
    participant DB as Supabase PostgreSQL

    Pimpinan->>Server: Buat Tiket Tugas Baru (Jenis Kerja, Teknisi, Lokasi)
    Server->>DB: INSERT into tugas & tracking_gps awal
    Teknisi->>Server: Buka Tugas Aktif & Ajukan Permohonan Material (Formik FieldArray)
    Server->>DB: INSERT into permohonan & detail_permohonan (Status: Pending)
    Pimpinan->>Server: Otorisasi & Setujui Permohonan (Status: Approved)
    Server->>DB: UPDATE permohonan SET status = 'Approved'
    Gudang->>Server: Rilis Barang & Potong Stok (Status: Released)
    Note over Server,DB: Menjalankan ACID Transaction (BEGIN ... FOR UPDATE ... COMMIT)
    Server->>DB: UPDATE barang SET stok = stok - minta
    Teknisi->>Server: Kirim Titik Koordinat GPS (Live Tracking)
    Server->>DB: INSERT into tracking_gps
    Pimpinan->>Server: Pantau Pergerakan Teknisi di Peta WebGIS Leaflet
    Teknisi->>Server: Selesaikan Pekerjaan & Upload Foto Bukti (Status: Done)
    Server->>DB: UPDATE tugas SET status = 'Done', foto_bukti = URL
    Pimpinan->>Server: Cetak Laporan Audit Resmi (Format PDF Cetak Telkom)
```

### Rincian Tahapan SOP:
| No | Tahap / Aksi | Pelaku | Deskripsi Teknis |
|:--:|---|---|---|
| **1** | **Buat Tiket Tugas Baru** | Pimpinan STO | Pimpinan menerbitkan tiket pengerjaan (Pasang Baru / Gangguan / Maintenance) lengkap dengan lokasi pelanggan dan penugasan teknisi (atau ke pool terbuka). |
| **2** | **Inisialisasi Database** | Server API | Server mencatat data penugasan ke tabel `tugas` dan menetapkan titik awal di `tracking_gps`. |
| **3** | **Buka Tugas & Ajukan Material** | Teknisi Lapangan | Teknisi membuka tiket tugas miliknya dan menyusun daftar material (kabel drop core, ONT, roset, fast connector, dll.) menggunakan form dinamis. |
| **4** | **Pencatatan Permohonan** | Server API | Data permohonan dicatat ke tabel `permohonan` dengan status `Pending` dan item ke tabel `detail_permohonan`. |
| **5** | **Otorisasi & Approval** | Pimpinan STO | Pimpinan mengevaluasi dan memberikan otorisasi persetujuan pengeluaran logistik. |
| **6** | **Update Status Persetujuan** | Server API | Status permohonan diperbarui di Supabase PostgreSQL menjadi `Approved`. |
| **7** | **Rilis Barang Gudang** | Admin Gudang | Petugas gudang memverifikasi persetujuan, menyiapkan fisik barang, dan menekan konfirmasi pengeluaran material (`Released`). |
| **8** | **ACID Transaction Stok** | Server & Database | Sistem mengeksekusi pemotongan kuantitas stok otomatis pada tabel `barang` secara atomik (`stok = stok - minta`) untuk menjamin integritas data inventaris. |
| **9** | **Kirim Titik GPS** | Teknisi Lapangan | Perangkat teknisi secara periodik menyiarkan telemetri koordinat GPS latitude & longitude saat bergerak ke lokasi. |
| **10** | **Perekaman Telemetri** | Server API | Server menyimpan histori jejak pergerakan teknisi ke tabel `tracking_gps`. |
| **11** | **Live Tracking WebGIS** | Pimpinan STO | Pimpinan memantau pergerakan armada teknisi secara real-time di atas peta interaktif WebGIS berbasis Leaflet.js. |
| **12** | **Closing & Rekonsiliasi Material** | Teknisi Lapangan | Teknisi mengisi formulir closing: Serial Number (SN ONT), ODP ID, Port, Redaman optik (OPM dBm), serta menghitung Dropcore terpasang vs sisa retur. Material resmi berstatus **TERPASANG DI PELANGGAN (CONSUMED)**. |
| **13** | **Penerbitan BASTP Digital** | Sistem & Supabase | Sistem menerbitkan Dokumen Berita Acara Serah Terima Pekerjaan (BASTP) digital resmi lengkap dengan kop Telkom Akses, parameter teknis QC, dan tanda tangan digital. |
| **14** | **Cetak Laporan Audit Resmi** | Pimpinan & Gudang | Pimpinan dan Bagian Gudang dapat memverifikasi audit material terpasang di lapangan dan mencetak BASTP untuk pertanggungjawaban operasional. |

---

## Fitur Unggulan Terbaru

1. **Rekonsiliasi Material Lapangan Nyata (Standar IndiHome / Telkom Akses WFM)**:
   - Barang tidak hanya terpotong saat keluar dari rak gudang.
   - Saat teknisi closing pekerjaan, perangkat Modem ONT (Serial Number/Barcode) dan kabel Dropcore secara resmi dinyatakan **TERPASANG DI PELANGGAN (CONSUMED)** sehingga hilang/berkurang permanen dari inventaris aktif perusahaan karena menjadi CPE pelanggan.
   - Sisa kabel yang tidak terpakai (retur) otomatis dikembalikan ke inventaris gudang.
   - Dilengkapi pengukuran kualitas sinyal optik (Redaman dBm standar Telkom: -16 s/d -24 dBm).

2. **Kustomisasi Logo Aplikasi**:
   - Logo Telkom Akses dapat disesuaikan dengan mudah.
   - Buka file `sto-frontend/src/components/BrandLogo.jsx`, isi variabel `DEFAULT_PLACEHOLDER_LOGO = "URL_LOGO_ANDA"` atau masukkan prop `logoUrl="URL_LOGO"`.
   - Jika kosong atau gambar gagal dimuat, sistem otomatis menampilkan lambang vektor SVG Hexagon Fiber Shield Telkom Akses berteknologi tinggi.

3. **Struktur Folder Bersih & Rapi**:
   - `sto-backend/` : Server API Express.js & koneksi Supabase PostgreSQL.
   - `sto-frontend/` : Aplikasi web React Vite, Tailwind CSS, Leaflet WebGIS.
   - Bebas file duplikat / file dummy tidak terpakai.

---

## Tech Stack

- **Backend:** Node.js, Express.js, Supabase (PostgreSQL)
- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios
- **WebGIS:** Leaflet.js + OpenStreetMap (Payakumbuh Koto Nan IV)
- **Database:** Supabase Cloud PostgreSQL Real-Time

## Role Pengguna

- **Pimpinan** — Buat & siarkan tiket tugas, approve permohonan material, pantau live tracking WebGIS, audit laporan BASTP
- **Teknisi** — Ambil/klaim tiket dari pool terbuka, ajukan material, lacak GPS lapangan, closing pekerjaan, rekonsiliasi material & terbitkan BASTP
- **Gudang** — Kelola inventaris master barang, rilis barang fisik ke teknisi (potong stok otomatis), audit material terpasang di pelanggan

## Akun Login Real di Supabase

| Role | Email | Password |
|---|---|---|
| Pimpinan | pimpinan@sto.co.id | 123456 |
| Teknisi | teknisi@sto.co.id | 123456 |
| Gudang | gudang@sto.co.id | 123456 |

