const supabase = require('../config/supabaseClient');

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
    return res.status(500).json({ message: 'Gagal mengambil data laporan', error: errTugas.message });
  }

  // Untuk tiap tugas, ambil juga rincian material yang terpakai
  const laporanLengkap = await Promise.all(
    tugasList.map(async (tugas) => {
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

  res.json({ laporan: laporanLengkap });
};

// Ambil laporan untuk 1 tugas spesifik (detail audit per tiket)
exports.getLaporanById = async (req, res) => {
  const { id } = req.params;

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
    .eq('id', id)
    .single();

  if (errTugas || !tugas) {
    return res.status(404).json({ message: 'Tugas tidak ditemukan' });
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
    .eq('tugas_id', id)
    .eq('status', 'Approved');

  res.json({
    laporan: {
      ...tugas,
      material_terpakai: permohonan || [],
    },
  });
};