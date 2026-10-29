const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const telegramService = require('../services/telegramService');

// 1. Ambil semua barang di inventaris gudang
exports.getAllBarang = async (req, res) => {
  const { data, error } = await supabase
    .from('barang')
    .select('*')
    .order('nama_barang', { ascending: true });

  if (error) {
    return errorResponse(res, 500, 'Gagal mengambil data barang', error.message);
  }

  return successResponse(res, 200, 'Data barang berhasil diambil', data, { barang: data });
};

// 2. Tambah master barang baru ke gudang (CRUD Create)
exports.createBarang = async (req, res) => {
  const { nama_barang, stok, satuan } = req.body;

  if (!nama_barang || stok === undefined || !satuan) {
    return errorResponse(res, 400, 'Nama barang, stok, dan satuan wajib diisi');
  }

  const parsedStok = parseInt(stok, 10);
  if (isNaN(parsedStok) || parsedStok < 0) {
    return errorResponse(res, 400, 'Stok harus berupa angka bilangan bulat non-negatif');
  }

  const insertPayload = {
    nama_barang: String(nama_barang).trim(),
    stok: parsedStok,
    satuan: String(satuan).trim()
  };

  const { data, error } = await supabase
    .from('barang')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    return errorResponse(res, 500, 'Gagal menambahkan barang baru', error.message);
  }

  // Broadcast notifikasi penambahan inventaris barang baru ke Telegram Group
  try {
    await telegramService.kirimKeGrup(`📦 <b>PENGAJUAN BARANG BARU</b>\nBarang: ${telegramService.esc(data.nama_barang)} (${data.stok} ${telegramService.esc(data.satuan)})\nPemohon: Petugas Gudang`);
  } catch (tgErr) {
    console.warn('[Telegram New Item Notice]', tgErr.message);
  }

  return successResponse(res, 201, 'Barang baru berhasil ditambahkan ke inventaris gudang', data, { barang: data });
};

// 3. Update data master barang (CRUD Update)
exports.updateBarang = async (req, res) => {
  const { id } = req.params;
  const { nama_barang, stok, satuan } = req.body;

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID barang tidak valid');
  }

  const updatePayload = {};
  if (nama_barang !== undefined) updatePayload.nama_barang = String(nama_barang).trim();
  if (stok !== undefined) {
    const parsedStok = parseInt(stok, 10);
    if (isNaN(parsedStok) || parsedStok < 0) {
      return errorResponse(res, 400, 'Stok harus berupa angka non-negatif');
    }
    updatePayload.stok = parsedStok;
  }
  if (satuan !== undefined) updatePayload.satuan = String(satuan).trim();

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse(res, 400, 'Tidak ada data barang yang diperbarui');
  }

  const { data, error } = await supabase
    .from('barang')
    .update(updatePayload)
    .eq('id', parsedId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 500, 'Gagal memperbarui data barang', error.message);
  }

  return successResponse(res, 200, 'Data barang berhasil diperbarui', data, { barang: data });
};

// 4. Tambah stok masuk / restock pengadaan material
exports.tambahStok = async (req, res) => {
  const { id } = req.params;
  const { jumlah_tambah } = req.body;

  const parsedId = parseInt(id, 10);
  const parsedJumlah = parseInt(jumlah_tambah, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID barang tidak valid');
  }

  if (isNaN(parsedJumlah) || parsedJumlah <= 0) {
    return errorResponse(res, 400, 'Jumlah penambahan stok harus lebih dari 0');
  }

  // Ambil stok saat ini
  const { data: currentItem, error: errGet } = await supabase
    .from('barang')
    .select('stok, nama_barang, satuan')
    .eq('id', parsedId)
    .single();

  if (errGet || !currentItem) {
    return errorResponse(res, 404, 'Barang tidak ditemukan di inventaris');
  }

  const stokBaru = Number(currentItem.stok) + parsedJumlah;

  const { data, error } = await supabase
    .from('barang')
    .update({ stok: stokBaru })
    .eq('id', parsedId)
    .select()
    .single();

  if (error) {
    return errorResponse(res, 500, 'Gagal menambah stok barang', error.message);
  }

  return successResponse(res, 200, `Stok ${currentItem.nama_barang} berhasil ditambah +${parsedJumlah} ${currentItem.satuan}`, data, { barang: data });
};

// 5. Hapus master barang dari gudang (CRUD Delete)
exports.deleteBarang = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID barang tidak valid');
  }

  const { data, error } = await supabase
    .from('barang')
    .delete()
    .eq('id', parsedId)
    .select();

  if (error) {
    return errorResponse(res, 500, 'Gagal menghapus barang', error.message);
  }

  return successResponse(res, 200, 'Barang berhasil dihapus dari inventaris gudang', data);
};

// ============================================================================
// MANAJEMEN PELACAKAN SERIAL NUMBER (SN) ONT SESUAI SOP GUDANG STO TELKOM
// Status Siklus: 'Di Gudang' -> 'In-Transit' (Dibawa Teknisi) -> 'Terpasang'
// ============================================================================

let memorySerialNumbers = [
  {
    id: 1,
    sn: 'ZTEGC8B90101',
    model: 'Modem ONT ZTE F670L Dual Band',
    status: 'Terpasang',
    lokasi: 'Jl. Sudirman No. 45, Payakumbuh',
    tugas_id: 3,
    bastp_no: 'BASTP/TA-PYK/2026/0003',
    pelanggan: 'Pelanggan STO',
    waktu: '2026-09-17 11:20'
  },
  {
    id: 2,
    sn: 'ZTEGC8B90102',
    model: 'Modem ONT ZTE F670L Dual Band',
    status: 'Terpasang',
    lokasi: 'Jl. Bangau, Payakumbuh Utara',
    tugas_id: 4,
    bastp_no: 'BASTP/TA-PYK/2026/0004',
    pelanggan: 'Pelanggan STO',
    waktu: '2026-09-17 14:45'
  },
  {
    id: 3,
    sn: 'ZTEGC8B90112',
    model: 'Modem ONT ZTE F670L Dual Band',
    status: 'In-Transit',
    lokasi: 'Koto Nan IV (Menuju Lokasi Pelanggan)',
    tugas_id: 6,
    teknisi: 'Ahmad Fadli',
    waktu: '2026-09-19 08:30'
  },
  {
    id: 4,
    sn: 'ZTEGC8B90201',
    model: 'Modem ONT ZTE F670L Dual Band',
    status: 'Di Gudang',
    lokasi: 'Rak Logistik Sentral STO Payakumbuh',
    tugas_id: null,
    waktu: '2026-10-20 09:00'
  },
  {
    id: 5,
    sn: 'ZTEGC8B90202',
    model: 'Modem ONT ZTE F670L Dual Band',
    status: 'Di Gudang',
    lokasi: 'Rak Logistik Sentral STO Payakumbuh',
    tugas_id: null,
    waktu: '2026-10-20 09:00'
  },
  {
    id: 6,
    sn: 'HWTC78A12301',
    model: 'Modem ONT Huawei HG8245H5',
    status: 'Di Gudang',
    lokasi: 'Rak Logistik Sentral STO Payakumbuh',
    tugas_id: null,
    waktu: '2026-10-22 10:15'
  },
  {
    id: 7,
    sn: 'FHTT99B45601',
    model: 'Modem ONT Fiberhome AN5506-04-FG',
    status: 'Di Gudang',
    lokasi: 'Rak Logistik Sentral STO Payakumbuh',
    tugas_id: null,
    waktu: '2026-10-24 14:00'
  }
];

// 6. Ambil semua serial number ONT (dukung filter status dan search)
exports.getAllSerialNumbers = async (req, res) => {
  const { status, sn } = req.query;

  let result = [...memorySerialNumbers];

  if (status && status !== 'all') {
    result = result.filter(item => item.status?.toLowerCase() === status.toLowerCase());
  }

  if (sn) {
    result = result.filter(item => item.sn?.toLowerCase().includes(sn.toLowerCase()));
  }

  return successResponse(res, 200, 'Daftar Serial Number ONT berhasil diambil', result, {
    seri: result,
    total: result.length,
    di_gudang: result.filter(s => s.status === 'Di Gudang').length,
    in_transit: result.filter(s => s.status === 'In-Transit').length,
    terpasang: result.filter(s => s.status === 'Terpasang').length
  });
};

// 7. Registrasi Serial Number Baru saat barang masuk / restock di Gudang
exports.registerSerialNumbers = async (req, res) => {
  const { model, serial_numbers, barang_id } = req.body;

  if (!serial_numbers || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
    return errorResponse(res, 400, 'Daftar serial_numbers wajib diisi (berupa array)');
  }

  const modelName = model || 'Modem ONT ZTE F670L Dual Band';
  const now = new Date().toLocaleString('id-ID');
  const added = [];

  for (const snRaw of serial_numbers) {
    const cleanSn = String(snRaw).trim().toUpperCase();
    if (!cleanSn) continue;

    // Cek duplikasi
    const exists = memorySerialNumbers.some(s => s.sn === cleanSn);
    if (!exists) {
      const newEntry = {
        id: memorySerialNumbers.length + 1,
        sn: cleanSn,
        model: modelName,
        status: 'Di Gudang',
        lokasi: 'Rak Logistik Sentral STO Payakumbuh',
        tugas_id: null,
        waktu: now
      };
      memorySerialNumbers.unshift(newEntry);
      added.push(newEntry);
    }
  }

  return successResponse(res, 201, `${added.length} Serial Number ONT berhasil didaftarkan ke Gudang (Status: Di Gudang)`, added, {
    added_count: added.length,
    items: added
  });
};

// 8. Update status Serial Number (misal: saat rilis barang / closing tiket)
exports.updateSerialNumberStatus = async (req, res) => {
  const { sn } = req.params;
  const { status, lokasi, tugas_id, pelanggan, bastp_no, teknisi } = req.body;

  const cleanSn = String(sn).trim().toUpperCase();
  const idx = memorySerialNumbers.findIndex(s => s.sn === cleanSn);

  if (idx === -1) {
    return errorResponse(res, 404, `Serial Number ${cleanSn} tidak ditemukan`);
  }

  if (status) memorySerialNumbers[idx].status = status;
  if (lokasi) memorySerialNumbers[idx].lokasi = lokasi;
  if (tugas_id !== undefined) memorySerialNumbers[idx].tugas_id = tugas_id;
  if (pelanggan) memorySerialNumbers[idx].pelanggan = pelanggan;
  if (bastp_no) memorySerialNumbers[idx].bastp_no = bastp_no;
  if (teknisi) memorySerialNumbers[idx].teknisi = teknisi;
  memorySerialNumbers[idx].waktu = new Date().toLocaleString('id-ID');

  return successResponse(res, 200, `Status SN ${cleanSn} berhasil diperbarui menjadi ${memorySerialNumbers[idx].status}`, memorySerialNumbers[idx]);
};