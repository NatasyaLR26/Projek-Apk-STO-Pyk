// Kamus Data & Initial Seed Data sesuai Bab IV Perancangan Sistem STO Telkom Akses

export const initialUsers = [
  {
    id: 1,
    nama_lengkap: "Ari Pimpinan",
    role: "pimpinan",
    email: "pimpinan@sto.co.id",
    password: "123456",
    jabatan: "Manager STO Wilayah",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: 2,
    nama_lengkap: "Ari Teknisi",
    role: "teknisi",
    email: "teknisi@sto.co.id",
    password: "123456",
    jabatan: "Teknisi Lapangan STO",
    phone: "0812-8921-3341",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: 3,
    nama_lengkap: "Ari Gudang",
    role: "gudang",
    email: "gudang@sto.co.id",
    password: "123456",
    jabatan: "Staff Logistik & Inventaris",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: 4,
    nama_lengkap: "Ir. Bambang Sudirman, M.T.",
    role: "pimpinan",
    email: "pimpinan@telkomakses.co.id",
    password: "password123",
    jabatan: "Senior Advisor STO",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: 5,
    nama_lengkap: "Ahmad Fadli",
    role: "teknisi",
    email: "fadli.teknisi@telkomakses.co.id",
    password: "password123",
    jabatan: "Teknisi Lapangan Senior",
    phone: "0812-8921-3341",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: 6,
    nama_lengkap: "Budi Santoso",
    role: "teknisi",
    email: "budi.teknisi@telkomakses.co.id",
    password: "password123",
    jabatan: "Teknisi Lapangan Junior",
    phone: "0813-7712-9902",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: 7,
    nama_lengkap: "Siti Rahmawati",
    role: "gudang",
    email: "gudang@telkomakses.co.id",
    password: "password123",
    jabatan: "Staff Logistik & Inventaris",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
  }
];

export const initialBarang = [
  {
    id: 1,
    nama_barang: "Kabel FO Drop Core 1 Core",
    stok: 1250,
    satuan: "meter",
    kode: "MAT-DC-01",
    kategori: "Kabel & Serat Optik"
  },
  {
    id: 2,
    nama_barang: "Modem ONT ZTE F609 GPON",
    stok: 48,
    satuan: "pcs",
    kode: "EQP-ONT-ZTE",
    kategori: "Perangkat Aktif"
  },
  {
    id: 3,
    nama_barang: "Roset Fiber Optic 1 Port",
    stok: 120,
    satuan: "pcs",
    kode: "ACC-ROS-01",
    kategori: "Aksesoris Indoor"
  },
  {
    id: 4,
    nama_barang: "Patch Cord SC-UPC 2M Simplex",
    stok: 215,
    satuan: "pcs",
    kode: "ACC-PC-SC2M",
    kategori: "Aksesoris Indoor"
  },
  {
    id: 5,
    nama_barang: "Optical Termination Box (OTB) 24 Core",
    stok: 14,
    satuan: "unit",
    kode: "EQP-OTB-24",
    kategori: "Perangkat Pasif"
  },
  {
    id: 6,
    nama_barang: "Splitter PLC 1:8 SC/UPC Box Type",
    stok: 35,
    satuan: "pcs",
    kode: "PAS-SPL-18",
    kategori: "Perangkat Pasif"
  },
  {
    id: 7,
    nama_barang: "Protection Sleeve Splicing 60mm",
    stok: 650,
    satuan: "pcs",
    kode: "ACC-SLV-60",
    kategori: "Consumable"
  },
  {
    id: 8,
    nama_barang: "Fast Connector SC-UPC Quick",
    stok: 310,
    satuan: "pcs",
    kode: "ACC-FC-SC",
    kategori: "Aksesoris"
  }
];

export const initialTugas = [
  {
    id: 101,
    nomor_tiket: "TKT-PYK-2026-001",
    pimpinan_id: 1,
    teknisi_id: 2,
    jenis_kerja: "Pasang Baru",
    lokasi: "Jl. Soekarno Hatta No. 45, Koto Nan IV, Payakumbuh Barat",
    pelanggan_nama: "Bpk. Hendra Wijaya",
    pelanggan_telp: "0812-7711-2233",
    status: "Progress",
    keterangan: "Pemasangan Baru IndiHome Paket 100 Mbps + Indibiz. Penarikan kabel FO dari ODP-PYK-08 tiang 3.",
    target_lat: -0.2272,
    target_lng: 100.6318,
    foto_bukti: null,
    waktu_buat: "2026-09-17 08:30"
  },
  {
    id: 102,
    nomor_tiket: "TKT-PYK-2026-002",
    pimpinan_id: 1,
    teknisi_id: 2,
    jenis_kerja: "Gangguan",
    lokasi: "Balai Nan Duo, Koto Nan IV, Payakumbuh Barat",
    pelanggan_nama: "Ibu Nurhayati",
    pelanggan_telp: "0813-8822-4455",
    status: "Open",
    keterangan: "Laporan LOS (Red blink). Redaman optik melebihi -32 dBm, indikasi kabel putus tertimpa dahan pohon.",
    target_lat: -0.2310,
    target_lng: 100.6355,
    foto_bukti: null,
    waktu_buat: "2026-09-17 09:15"
  },
  {
    id: 103,
    nomor_tiket: "TKT-PYK-2026-003",
    pimpinan_id: 1,
    teknisi_id: 3,
    jenis_kerja: "ODP",
    lokasi: "Jl. Jenderal Sudirman, Labuh Basilang, Payakumbuh",
    pelanggan_nama: "Titik ODP-PYK-14 (Kawasan Pertokoan)",
    pelanggan_telp: "0821-9933-5566",
    status: "Done",
    keterangan: "Maintenance ODP & perapihan port splitter 1:8 yang longgar. Redaman kembali normal (-18.42 dBm).",
    target_lat: -0.2245,
    target_lng: 100.6380,
    foto_bukti: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    waktu_buat: "2026-09-16 13:00",
    waktu_selesai: "2026-09-16 16:30"
  },
  {
    id: 104,
    nomor_tiket: "TKT-PYK-2026-004",
    pimpinan_id: 1,
    teknisi_id: 3,
    jenis_kerja: "Pasang Baru",
    lokasi: "Kawasan Pasar Ibuh, Payakumbuh Barat",
    pelanggan_nama: "Kedai Kopi Nan Duo",
    pelanggan_telp: "0812-9988-1234",
    status: "Done",
    keterangan: "Instalasi IndiHome Bisnis 200 Mbps selesai dipasang dan lolos tes ping/latency stabil 4ms.",
    target_lat: -0.2260,
    target_lng: 100.6362,
    foto_bukti: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80",
    waktu_buat: "2026-09-15 10:00",
    waktu_selesai: "2026-09-15 14:15"
  }
];

export const initialPermohonan = [
  {
    id: 501,
    tugas_id: 101,
    status: "Approved",
    waktu_request: "2026-09-17 08:45",
    catatan_teknisi: "Kebutuhan penarikan kabel drop core sepanjang 150m dan ONT baru"
  },
  {
    id: 502,
    tugas_id: 102,
    status: "Pending",
    waktu_request: "2026-09-17 09:30",
    catatan_teknisi: "Pergantian drop core putus dan protection sleeve"
  },
  {
    id: 503,
    tugas_id: 103,
    status: "Released",
    waktu_request: "2026-09-16 13:10",
    catatan_teknisi: "Splitter pengganti untuk ODP dan protection sleeve"
  },
  {
    id: 504,
    tugas_id: 104,
    status: "Released",
    waktu_request: "2026-09-15 10:15",
    catatan_teknisi: "Material pasang baru lengkap paket cafe"
  }
];

export const initialDetailPermohonan = [
  // Detail untuk Permohonan 501 (Tugas 101)
  { id: 1, permohonan_id: 501, barang_id: 1, jumlah_minta: 150 }, // Kabel FO Drop Core 150m
  { id: 2, permohonan_id: 501, barang_id: 2, jumlah_minta: 1 },   // Modem ZTE 1 pcs
  { id: 3, permohonan_id: 501, barang_id: 3, jumlah_minta: 1 },   // Roset 1 pcs
  { id: 4, permohonan_id: 501, barang_id: 4, jumlah_minta: 1 },   // Patch cord 1 pcs

  // Detail untuk Permohonan 502 (Tugas 102) - Pending Approval
  { id: 5, permohonan_id: 502, barang_id: 1, jumlah_minta: 100 },  // Kabel FO Drop Core 100m
  { id: 6, permohonan_id: 502, barang_id: 7, jumlah_minta: 6 },    // Protection sleeve 6 pcs
  { id: 7, permohonan_id: 502, barang_id: 8, jumlah_minta: 4 },    // Fast connector 4 pcs

  // Detail untuk Permohonan 503 (Tugas 103) - Released
  { id: 8, permohonan_id: 503, barang_id: 6, jumlah_minta: 1 },   // Splitter 1:8 1 pcs
  { id: 9, permohonan_id: 503, barang_id: 7, jumlah_minta: 8 },   // Protection sleeve 8 pcs

  // Detail untuk Permohonan 504 (Tugas 104) - Released
  { id: 10, permohonan_id: 504, barang_id: 1, jumlah_minta: 100 }, // Kabel FO 100m
  { id: 11, permohonan_id: 504, barang_id: 2, jumlah_minta: 1 },  // Modem ZTE 1 pcs
  { id: 12, permohonan_id: 504, barang_id: 3, jumlah_minta: 1 }   // Roset 1 pcs
];

// Kantor Pusat STO Telkom Akses Payakumbuh - Koto Nan IV (Anchor Point)
export const STO_COORDINATES = {
  name: "STO Telkom Payakumbuh (Koto Nan IV)",
  lat: -0.2285,
  lng: 100.6335,
  alamat: "Jl. Soekarno Hatta No. 12, Koto Nan IV, Payakumbuh Barat, Kota Payakumbuh, Sumatera Barat 26224"
};

export const initialTrackingGps = [
  {
    id: 1,
    tugas_id: 101,
    teknisi_id: 2,
    latitude: -0.2278,
    longitude: 100.6322,
    waktu_update: "2026-09-17 10:45",
    akurasi: "3 meter",
    kecepatan: "28 km/jam (Menuju Lokasi Pelanggan Koto Nan IV)",
    baterai: 84,
    is_active: true
  },
  {
    id: 2,
    tugas_id: 102,
    teknisi_id: 3,
    latitude: -0.2295,
    longitude: 100.6348,
    waktu_update: "2026-09-17 10:50",
    akurasi: "4 meter",
    kecepatan: "Sedang Bekerja Splicing di Balai Nan Duo",
    baterai: 95,
    is_active: true
  }
];

