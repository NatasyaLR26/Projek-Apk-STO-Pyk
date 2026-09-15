const supabase = require('../config/supabaseClient');

// Pimpinan membuat tugas baru untuk teknisi
exports.createTugas = async (req, res) => {
  const { pimpinan_id, teknisi_id, jenis_kerja, lokasi } = req.body;

  // validasi input dasar
  if (!pimpinan_id || !teknisi_id || !jenis_kerja || !lokasi) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  const { data, error } = await supabase
    .from('tugas')
    .insert([
      {
        pimpinan_id,
        teknisi_id,
        jenis_kerja,
        lokasi,
        status: 'Open', // status awal selalu Open
      },
    ])
    .select() // biar data yang baru dibuat ikut dikembalikan
    .single();

  if (error) {
    return res.status(500).json({ message: 'Gagal membuat tugas', error: error.message });
  }

  res.status(201).json({
    message: 'Tugas berhasil dibuat',
    tugas: data,
  });
};

// Teknisi melihat daftar tugas miliknya
exports.getTugasByTeknisi = async (req, res) => {
  const { id } = req.params; // teknisi_id

  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .eq('teknisi_id', id)
    .order('id', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'Gagal mengambil data tugas', error: error.message });
  }

  res.json({ tugas: data });
};