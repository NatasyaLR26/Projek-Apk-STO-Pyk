const { pool } = require('../config/db');

// Menerima { tugas_id, latitude, longitude }
const updateTracking = async (req, res) => {
  const { tugas_id, latitude, longitude } = req.body;

  if (!tugas_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      message: 'tugas_id, latitude, dan longitude wajib diisi.'
    });
  }

  try {
    if (req.user && req.user.role === 'teknisi') {
      const checkTugas = await pool.query(
        'SELECT id FROM tugas WHERE id = $1 AND teknisi_id = $2',
        [tugas_id, req.user.id]
      );
      if (checkTugas.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Anda hanya dapat memperbarui koordinat GPS untuk tugas Anda sendiri.'
        });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO tracking_gps (tugas_id, latitude, longitude, waktu_update) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING *`,
      [tugas_id, parseFloat(latitude), parseFloat(longitude)]
    );

    // Auto set status tugas ke 'Progress' jika masih 'Open'
    await pool.query(
      "UPDATE tugas SET status = 'Progress' WHERE id = $1 AND status = 'Open'",
      [tugas_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Koordinat GPS berhasil diperbarui.',
      data: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating tracking GPS:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui tracking GPS.' });
  }
};

// Mengambil titik tracking terbaru untuk marker peta
const getLatestTracking = async (req, res) => {
  const { tugas_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM tracking_gps 
       WHERE tugas_id = $1 
       ORDER BY waktu_update DESC, id DESC 
       LIMIT 1`,
      [tugas_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tracking belum tersedia.' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching latest tracking:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil tracking terbaru.' });
  }
};

// Mengambil posisi tracking terbaru semua tugas aktif untuk WebGIS Dashboard Pimpinan
const getAllActiveTracking = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT ON (t.id)
        t.id AS tugas_id,
        t.jenis_kerja,
        t.lokasi,
        t.status AS status_tugas,
        u_tek.nama_lengkap AS nama_teknisi,
        u_tek.email AS email_teknisi,
        tg.id AS tracking_id,
        COALESCE(tg.latitude, -0.2289) AS latitude,
        COALESCE(tg.longitude, 100.6308) AS longitude,
        tg.waktu_update
      FROM tugas t
      JOIN users u_tek ON u_tek.id = t.teknisi_id
      LEFT JOIN tracking_gps tg ON tg.tugas_id = t.id
      WHERE t.status IN ('Open', 'Progress')
      ORDER BY t.id, tg.waktu_update DESC NULLS LAST
    `;

    const result = await pool.query(query);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching all active tracking:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data WebGIS tracking.' });
  }
};

module.exports = {
  updateTracking,
  getLatestTracking,
  getAllActiveTracking
};
