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

## Tech Stack

- **Backend:** Node.js, Express.js, Supabase (PostgreSQL)
- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios
- **WebGIS:** Leaflet.js + OpenStreetMap
- **Storage:** Supabase Storage (upload foto bukti kerja)

## Role Pengguna

- **Pimpinan** — buat tugas, approve permohonan material, lihat live tracking & laporan audit
- **Teknisi** — terima tugas, ajukan permohonan material, upload bukti foto selesai
- **Gudang** — kelola inventaris material

## Akun Testing

| Role | Email | Password |
|---|---|---|
| Pimpinan | pimpinan@sto.co.id | 123456 |
| Teknisi | teknisi@sto.co.id | 123456 |
| Gudang | gudang@sto.co.id | 123456 |
