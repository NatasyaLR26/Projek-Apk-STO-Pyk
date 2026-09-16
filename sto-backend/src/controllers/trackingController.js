const supabase = require('../config/supabaseClient');

// Teknisi kirim update koordinat GPS (dipanggil berulang dari HP)
exports.updateTracking = async (req, res) => {
  const { tugas_id, latitude, longitude } = req.body;

  if (!tugas_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'tugas_id, latitude, dan longitude wajib diisi' });
  }

  const { data, error } = await supabase
    .from('tracking_gps')
    .insert([
      {
        tugas_id,
        latitude,
        longitude,
        waktu_update: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: 'Gagal menyimpan lokasi', error: error.message });
  }

  res.status(201).json({
    message: 'Lokasi berhasil diperbarui',
    tracking: data,
  });
};

// Pimpinan lihat lokasi terkini teknisi untuk satu tugas
exports.getTrackingByTugas = async (req, res) => {
  const { tugas_id } = req.params;

  // ambil 1 data tracking paling baru (terurut waktu_update descending)
  const { data, error } = await supabase
    .from('tracking_gps')
    .select('*')
    .eq('tugas_id', tugas_id)
    .order('waktu_update', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return res.status(404).json({ message: 'Belum ada data lokasi untuk tugas ini' });
  }

  res.json({ tracking: data });
};