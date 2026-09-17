const supabase = require('../config/supabaseClient');

// Pimpinan membuat tugas baru untuk teknisi (Bisa disiarkan ke pool terbuka dengan teknisi_id: null)
exports.createTugas = async (req, res) => {
  const { pimpinan_id, teknisi_id, jenis_kerja, lokasi, pelanggan_nama, pelanggan_telp, keterangan, catatan, status } = req.body;

  // validasi input dasar (teknisi_id opsional untuk pool terbuka)
  if (!pimpinan_id || !jenis_kerja || !lokasi) {
    return res.status(400).json({ message: 'Pimpinan ID, jenis pekerjaan, dan lokasi wajib diisi' });
  }

  const { data, error } = await supabase
    .from('tugas')
    .insert([
      {
        pimpinan_id,
        teknisi_id: teknisi_id || null,
        jenis_kerja,
        lokasi,
        pelanggan_nama: pelanggan_nama || 'Pelanggan STO',
        pelanggan_telp: pelanggan_telp || '',
        catatan: keterangan || catatan || '',
        status: status || 'Open', // status awal selalu Open jika pool terbuka
      },
    ])
    .select() // biar data yang baru dibuat ikut dikembalikan
    .single();

  if (error) {
    return res.status(500).json({ message: 'Gagal membuat tugas', error: error.message });
  }

  res.status(201).json({
    message: 'Tugas berhasil dibuat dan disiarkan',
    tugas: data,
  });
};

// Teknisi mengklaim/mengambil tugas dari pool terbuka
exports.claimTugas = async (req, res) => {
  const { id } = req.params; // tugas_id
  const { teknisi_id } = req.body;

  if (!teknisi_id) {
    return res.status(400).json({ message: 'Teknisi ID wajib disertakan' });
  }

  const { data, error } = await supabase
    .from('tugas')
    .update({
      teknisi_id: Number(teknisi_id),
      status: 'Progress',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: 'Gagal mengklaim tugas', error: error.message });
  }

  res.json({
    message: 'Tugas berhasil diambil oleh teknisi',
    tugas: data,
  });
};

// Ambil daftar tugas yang masih terbuka (belum diambil teknisi)
exports.getOpenTugas = async (req, res) => {
  const { data, error } = await supabase
    .from('tugas')
    .select('*')
    .or('teknisi_id.is.null,status.eq.Open')
    .order('id', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'Gagal mengambil data tugas terbuka', error: error.message });
  }

  res.json({ tugas: data });
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