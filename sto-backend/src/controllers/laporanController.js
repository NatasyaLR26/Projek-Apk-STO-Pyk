const supabase = require('../config/supabaseClient');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Ambil semua data laporan audit (tugas yang sudah Done)
exports.getLaporan = async (req, res) => {
  const { data: tugasList, error: errTugas } = await supabase
    .from('tugas')
    .select(`
      id,
      jenis_kerja,
      lokasi,
      status,
      foto_bukti,
      teknisi:teknisi_id ( nama_lengkap ),
      pimpinan:pimpinan_id ( nama_lengkap )
    `)
    .eq('status', 'Done')
    .order('id', { ascending: false });

  if (errTugas) {
    return errorResponse(res, 500, 'Gagal mengambil data laporan', errTugas.message);
  }

  // Untuk tiap tugas, ambil juga rincian material yang terpakai
  const laporanLengkap = await Promise.all(
    (tugasList || []).map(async (tugas) => {
      const { data: permohonan } = await supabase
        .from('permohonan')
        .select(`
          id,
          status,
          waktu_request,
          detail_permohonan (
            jumlah_minta,
            barang:barang_id ( nama_barang, satuan )
          )
        `)
        .eq('tugas_id', tugas.id)
        .eq('status', 'Approved');

      return {
        ...tugas,
        material_terpakai: permohonan || [],
      };
    })
  );

  return successResponse(res, 200, 'Data laporan audit berhasil diambil', laporanLengkap, {
    laporan: laporanLengkap,
  });
};

// Ambil laporan untuk 1 tugas spesifik (detail audit per tiket)
exports.getLaporanById = async (req, res) => {
  const { id } = req.params;

  const parsedId = parseInt(id, 10);
  if (!id || isNaN(parsedId)) {
    return errorResponse(res, 400, 'ID tugas tidak valid');
  }

  const { data: tugas, error: errTugas } = await supabase
    .from('tugas')
    .select(`
      id,
      jenis_kerja,
      lokasi,
      status,
      foto_bukti,
      teknisi:teknisi_id ( nama_lengkap ),
      pimpinan:pimpinan_id ( nama_lengkap )
    `)
    .eq('id', parsedId)
    .single();

  if (errTugas || !tugas) {
    return errorResponse(res, 404, 'Tugas tidak ditemukan');
  }

  const { data: permohonan } = await supabase
    .from('permohonan')
    .select(`
      id,
      status,
      waktu_request,
      detail_permohonan (
        jumlah_minta,
        barang:barang_id ( nama_barang, satuan )
      )
    `)
    .eq('tugas_id', parsedId)
    .eq('status', 'Approved');

  const detailData = {
    ...tugas,
    material_terpakai: permohonan || [],
  };

  return successResponse(res, 200, 'Data laporan detail berhasil diambil', detailData, {
    laporan: detailData,
  });
};