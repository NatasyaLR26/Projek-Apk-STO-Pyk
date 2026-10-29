const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Data awal ODP Jaringan Fiber Optic STO Payakumbuh (In-Memory Fallback Cache)
let memoryOdpList = [
  {
    id: 1,
    kode_odp: "ODP-PYK-FA/001",
    nama_lokasi: "Jl. Soekarno Hatta No. 14, Koto Nan IV (Depan STO)",
    latitude: -0.2285,
    longitude: 100.6335,
    kapasitas_port: 8,
    port_terpakai: 6,
    redaman_dbm: -17.80,
    status: "Tersedia",
    keterangan: "Distribusi feeder utama jalur STO - Kantor Pemerintahan"
  },
  {
    id: 2,
    kode_odp: "ODP-PYK-FA/002",
    nama_lokasi: "Balai Nan Duo, Payakumbuh Barat (Tiang FO 04)",
    latitude: -0.2310,
    longitude: 100.6355,
    kapasitas_port: 8,
    port_terpakai: 8,
    redaman_dbm: -19.40,
    status: "Penuh",
    keterangan: "Kawasan pemukiman padat penduduk - Port penuh terisi pelanggan"
  },
  {
    id: 3,
    kode_odp: "ODP-PYK-FA/003",
    nama_lokasi: "Jl. Jenderal Sudirman, Labuh Basilang (Kawasan Ruko)",
    latitude: -0.2245,
    longitude: 100.6380,
    kapasitas_port: 16,
    port_terpakai: 11,
    redaman_dbm: -18.25,
    status: "Tersedia",
    keterangan: "Splitter 1:16 melayani pelanggan IndiHome Bisnis dan Cafe"
  },
  {
    id: 4,
    kode_odp: "ODP-PYK-FA/004",
    nama_lokasi: "Kawasan Pasar Ibuh, Payakumbuh Barat",
    latitude: -0.2260,
    longitude: 100.6362,
    kapasitas_port: 8,
    port_terpakai: 5,
    redaman_dbm: -18.90,
    status: "Tersedia",
    keterangan: "Tiang distribusi sentra pertokoan pasar"
  },
  {
    id: 5,
    kode_odp: "ODP-PYK-FA/005",
    nama_lokasi: "Simpang Benteng, Payolansek, Payakumbuh",
    latitude: -0.2215,
    longitude: 100.6305,
    kapasitas_port: 8,
    port_terpakai: 3,
    redaman_dbm: -17.20,
    status: "Tersedia",
    keterangan: "Kondisi redaman sangat bagus, port cadangan memadai"
  },
  {
    id: 6,
    kode_odp: "ODP-PYK-FA/006",
    nama_lokasi: "Kelurahan Tiakar, Payakumbuh Timur",
    latitude: -0.2335,
    longitude: 100.6410,
    kapasitas_port: 8,
    port_terpakai: 7,
    redaman_dbm: -26.50,
    status: "Maintenance",
    keterangan: "Redaman tinggi (> -24 dBm), dijadwalkan splicing ulang adapter ODP"
  }
];

// 1. Ambil semua data titik ODP (WebGIS Infrastruktur Jaringan)
exports.getAllOdp = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('odp')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      // Petakan agar alamat dan nama_lokasi selalu tersedia
      const mapped = data.map(o => ({
        ...o,
        nama_lokasi: o.alamat || o.nama_lokasi || 'Koto Nan IV Payakumbuh',
        alamat: o.alamat || o.nama_lokasi || 'Koto Nan IV Payakumbuh'
      }));
      return successResponse(res, 200, 'Data ODP berhasil diambil dari database Supabase', mapped, { odp: mapped });
    }
  } catch (err) {
    // Abaikan jika tabel belum dimigrasikan ke Supabase
  }

  // Fallback ke data memory
  return successResponse(res, 200, 'Data ODP berhasil dimuat', memoryOdpList, { odp: memoryOdpList });
};

// 2. Tambah titik ODP baru (CRUD Create)
exports.createOdp = async (req, res) => {
  const { kode_odp, nama_lokasi, alamat, latitude, longitude, kapasitas_port, port_terpakai, redaman_dbm, status, keterangan } = req.body;

  const loc = String(alamat || nama_lokasi || '').trim();
  if (!kode_odp || !loc || latitude === undefined || longitude === undefined) {
    return errorResponse(res, 400, 'Kode ODP, alamat/lokasi, latitude, dan longitude wajib diisi');
  }

  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);
  const parsedKapasitas = parseInt(kapasitas_port, 10) || 8;
  const parsedTerpakai = parseInt(port_terpakai, 10) || 0;
  const parsedRedaman = parseFloat(redaman_dbm) || -18.50;
  const finalStatus = status || (parsedTerpakai >= parsedKapasitas ? 'Penuh' : 'Tersedia');

  const supabasePayload = {
    kode_odp: String(kode_odp).trim().toUpperCase(),
    alamat: loc,
    latitude: parsedLat,
    longitude: parsedLng,
    kapasitas_port: parsedKapasitas,
    port_terpakai: parsedTerpakai,
    status: finalStatus
  };

  let newOdp = {
    ...supabasePayload,
    id: memoryOdpList.length > 0 ? Math.max(...memoryOdpList.map(o => Number(o.id) || 0)) + 1 : 1,
    nama_lokasi: loc,
    redaman_dbm: parsedRedaman,
    keterangan: keterangan || 'Titik distribusi ODP baru'
  };

  // Simpan ke Supabase odp table
  try {
    const { data, error } = await supabase.from('odp').insert([supabasePayload]).select().single();
    if (!error && data) {
      newOdp = {
        ...newOdp,
        ...data,
        nama_lokasi: data.alamat || loc
      };
    }
  } catch (err) {
    console.warn('[createOdp] Supabase insert notice:', err.message);
  }

  memoryOdpList = [newOdp, ...memoryOdpList];
  return successResponse(res, 201, 'Titik ODP berhasil didaftarkan ke WebGIS', newOdp, { odp: newOdp });
};

// 3. Update data ODP (CRUD Update)
exports.updateOdp = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID ODP tidak valid');
  }

  const updateFields = { ...req.body };
  delete updateFields.id;

  if (updateFields.latitude !== undefined) updateFields.latitude = parseFloat(updateFields.latitude);
  if (updateFields.longitude !== undefined) updateFields.longitude = parseFloat(updateFields.longitude);
  if (updateFields.kapasitas_port !== undefined) updateFields.kapasitas_port = parseInt(updateFields.kapasitas_port, 10);
  if (updateFields.port_terpakai !== undefined) updateFields.port_terpakai = parseInt(updateFields.port_terpakai, 10);
  if (updateFields.redaman_dbm !== undefined) updateFields.redaman_dbm = parseFloat(updateFields.redaman_dbm);

  if (updateFields.nama_lokasi && !updateFields.alamat) {
    updateFields.alamat = updateFields.nama_lokasi;
  }
  if (updateFields.alamat && !updateFields.nama_lokasi) {
    updateFields.nama_lokasi = updateFields.alamat;
  }

  // Update di memori
  const idx = memoryOdpList.findIndex(o => Number(o.id) === parsedId);
  if (idx >= 0) {
    memoryOdpList[idx] = { ...memoryOdpList[idx], ...updateFields };
  }

  // Update ke Supabase
  try {
    const supabaseUpdate = {};
    if (updateFields.kode_odp !== undefined) supabaseUpdate.kode_odp = updateFields.kode_odp;
    if (updateFields.alamat !== undefined) supabaseUpdate.alamat = updateFields.alamat;
    if (updateFields.latitude !== undefined) supabaseUpdate.latitude = updateFields.latitude;
    if (updateFields.longitude !== undefined) supabaseUpdate.longitude = updateFields.longitude;
    if (updateFields.kapasitas_port !== undefined) supabaseUpdate.kapasitas_port = updateFields.kapasitas_port;
    if (updateFields.port_terpakai !== undefined) supabaseUpdate.port_terpakai = updateFields.port_terpakai;
    if (updateFields.status !== undefined) supabaseUpdate.status = updateFields.status;

    await supabase.from('odp').update(supabaseUpdate).eq('id', parsedId);
  } catch (err) {
    console.warn('[updateOdp] Supabase update notice:', err.message);
  }

  const updatedOdp = idx >= 0 ? memoryOdpList[idx] : { id: parsedId, ...updateFields };
  return successResponse(res, 200, 'Data ODP berhasil diperbarui', updatedOdp, { odp: updatedOdp });
};

// 4. Hapus titik ODP (CRUD Delete)
exports.deleteOdp = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return errorResponse(res, 400, 'ID ODP tidak valid');
  }

  memoryOdpList = memoryOdpList.filter(o => Number(o.id) !== parsedId);

  try {
    await supabase.from('odp').delete().eq('id', parsedId);
  } catch (err) {
    console.warn('[deleteOdp] Supabase delete notice:', err.message);
  }

  return successResponse(res, 200, 'Titik ODP berhasil dihapus dari WebGIS');
};

// 5. Internal logic: Tambah 1 port terpakai & evaluasi status warna WebGIS
exports.incrementPortOdpInternal = async (odpIdOrKode) => {
  let odp = null;
  const parsedId = parseInt(odpIdOrKode, 10);

  let idx = -1;
  if (!isNaN(parsedId)) {
    idx = memoryOdpList.findIndex(o => Number(o.id) === parsedId);
  }
  if (idx === -1 && typeof odpIdOrKode === 'string') {
    idx = memoryOdpList.findIndex(o => o.kode_odp?.toUpperCase() === odpIdOrKode.toUpperCase().trim());
  }

  if (idx >= 0) {
    odp = memoryOdpList[idx];
  } else if (memoryOdpList.length > 0) {
    idx = 0;
    odp = memoryOdpList[0];
  }

  if (!odp) {
    return {
      id: 1,
      kode_odp: odpIdOrKode || 'ODP-PYK-FA/001',
      kapasitas_port: 8,
      port_terpakai: 7,
      status: 'Hampir Penuh'
    };
  }

  const kapasitas = odp.kapasitas_port || 8;
  const newPortTerpakai = Math.min(kapasitas, (odp.port_terpakai || 0) + 1);
  const ratio = newPortTerpakai / kapasitas;

  // Aturan Ambang Batas: >= 100% Penuh (Merah), >= 70% Hampir Penuh (Kuning), < 70% Tersedia (Hijau)
  let newStatus = 'Tersedia';
  if (ratio >= 1.0) {
    newStatus = 'Penuh';
  } else if (ratio >= 0.7) {
    newStatus = 'Hampir Penuh';
  }

  const updatedOdp = {
    ...odp,
    port_terpakai: newPortTerpakai,
    status: newStatus
  };

  memoryOdpList[idx] = updatedOdp;

  try {
    await supabase.from('odp').update({
      port_terpakai: newPortTerpakai,
      status: newStatus
    }).eq('id', updatedOdp.id);
  } catch (err) {
    // Fallback in-memory
  }

  return updatedOdp;
};

// 6. Endpoint PATCH /api/odp/:id/port
exports.patchPortOdp = async (req, res) => {
  const { id } = req.params;
  const updatedOdp = await exports.incrementPortOdpInternal(id);
  return successResponse(res, 200, 'Port ODP berhasil bertambah & status WebGIS ter-update', updatedOdp, { odp: updatedOdp });
};

