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

// Teknisi upload foto bukti & selesaikan tugas
exports.selesaikanTugas = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'File foto wajib diupload' });
  }

  const fileName = `tugas-${id}-${Date.now()}.${req.file.originalname.split('.').pop()}`;

  const { error: errUpload } = await supabase.storage
    .from('bukti-foto')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
    });

  if (errUpload) {
    return res.status(500).json({ message: 'Gagal upload foto', error: errUpload.message });
  }

  const { data: publicUrlData } = supabase.storage
    .from('bukti-foto')
    .getPublicUrl(fileName);

  const fotoUrl = publicUrlData.publicUrl;

  const { data: tugasUpdated, error: errUpdate } = await supabase
    .from('tugas')
    .update({
      foto_bukti: fotoUrl,
      status: 'Done',
    })
    .eq('id', id)
    .select()
    .single();

  if (errUpdate) {
    return res.status(500).json({ message: 'Gagal update status tugas', error: errUpdate.message });
  }

  res.json({
    message: 'Tugas berhasil diselesaikan',
    tugas: tugasUpdated,
  });
};

// Pimpinan lihat semua tugas yang masih aktif (belum Done) - untuk WebGIS tracking
exports.getTugasAktif = async (req, res) => {
  const { data, error } = await supabase
    .from('tugas')
    .select(`
      id,
      jenis_kerja,
      lokasi,
      status,
      teknisi:teknisi_id ( id, nama_lengkap )
    `)
    .neq('status', 'Done')
    .order('id', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'Gagal mengambil data tugas aktif', error: error.message });
  }

  res.json({ tugas: data });
};