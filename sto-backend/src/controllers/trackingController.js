const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Teknisi kirim update koordinat GPS (dipanggil berulang dari HP)
exports.updateTracking = async (req, res) => {
  const { tugas_id, latitude, longitude } = req.body;

  if (!tugas_id || latitude === undefined || longitude === undefined) {
    return errorResponse(res, 400, 'tugas_id, latitude, dan longitude wajib diisi');
  }

  const parsedTugasId = parseInt(tugas_id, 10);
  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);

  if (isNaN(parsedTugasId) || isNaN(parsedLat) || isNaN(parsedLng)) {
    return errorResponse(res, 400, 'Format tugas_id, latitude, atau longitude tidak valid');
  }

  const { data, error } = await supabase
    .from('tracking_gps')
    .insert([
      {
        tugas_id: parsedTugasId,
        latitude: parsedLat,
        longitude: parsedLng,
        waktu_update: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    return errorResponse(res, 500, 'Gagal menyimpan lokasi', error.message);
  }

  return successResponse(res, 201, 'Lokasi berhasil diperbarui', data, { tracking: data });
};

// Pimpinan lihat lokasi terkini teknisi untuk satu tugas
exports.getTrackingByTugas = async (req, res) => {
  const { tugas_id } = req.params;

  const parsedTugasId = parseInt(tugas_id, 10);
  if (!tugas_id || isNaN(parsedTugasId)) {
    return errorResponse(res, 400, 'Format tugas_id tidak valid');
  }

  // ambil 1 data tracking paling baru (terurut waktu_update descending)
  const { data, error } = await supabase
    .from('tracking_gps')
    .select('*')
    .eq('tugas_id', parsedTugasId)
    .order('waktu_update', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return errorResponse(res, 404, 'Belum ada data lokasi untuk tugas ini');
  }

  return successResponse(res, 200, 'Data tracking berhasil diambil', data, { tracking: data });
};