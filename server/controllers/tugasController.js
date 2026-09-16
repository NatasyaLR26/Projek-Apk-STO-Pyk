const { pool } = require('../config/db');

const createTugas = async (req, res) => {
  const { teknisi_id, jenis_kerja, lokasi } = req.body;
  const pimpinan_id = req.user.id;

  if (!teknisi_id || !jenis_kerja || !lokasi) {
    return res.status(400).json({
      success: false,
      message: 'teknisi_id, jenis_kerja, dan lokasi wajib diisi.'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tugas (pimpinan_id, teknisi_id, jenis_kerja, lokasi, status) 
       VALUES ($1, $2, $3, $4, 'Open') 
       RETURNING *`,
      [pimpinan_id, teknisi_id, jenis_kerja, lokasi]
    );

    // Initial GPS location nearby Payakumbuh STO if needed for WebGIS display
    const newTugas = result.rows[0];
    await pool.query(
      `INSERT INTO tracking_gps (tugas_id, latitude, longitude) 
       VALUES ($1, -0.2289, 100.6308)`,
      [newTugas.id]
    );

    return res.status(201).json({
      success: true,
      message: 'Tiket tugas berhasil dibuat.',
      data: newTugas
    });
  } catch (err) {
    console.error('Error creating tugas:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat tugas.' });
  }
};

const getTugas = async (req, res) => {
  try {
    const { role, id } = req.user;
    let queryText = `
      SELECT 
        t.id,
        t.jenis_kerja,
        t.lokasi,
        t.status,
        t.foto_bukti,
        t.pimpinan_id,
        u_pimpinan.nama_lengkap AS nama_pimpinan,
        t.teknisi_id,
        u_teknisi.nama_lengkap AS nama_teknisi,
        u_teknisi.email AS email_teknisi,
        (
          SELECT json_build_object(
            'latitude', tg.latitude,
            'longitude', tg.longitude,
            'waktu_update', tg.waktu_update
          )
          FROM tracking_gps tg
          WHERE tg.tugas_id = t.id
          ORDER BY tg.id DESC
          LIMIT 1
        ) AS latest_tracking,
        (
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'status', p.status,
              'waktu_request', p.waktu_request,
              'items', (
                SELECT json_agg(
                  json_build_object(
                    'detail_id', dp.id,
                    'barang_id', dp.barang_id,
                    'nama_barang', b.nama_barang,
                    'jumlah_minta', dp.jumlah_minta,
                    'satuan', b.satuan
                  )
                )
                FROM detail_permohonan dp
                JOIN barang b ON b.id = dp.barang_id
                WHERE dp.permohonan_id = p.id
              )
            )
          )
          FROM permohonan p
          WHERE p.tugas_id = t.id
        ) AS permohonan_list
      FROM tugas t
      LEFT JOIN users u_pimpinan ON u_pimpinan.id = t.pimpinan_id
      LEFT JOIN users u_teknisi ON u_teknisi.id = t.teknisi_id
    `;

    let params = [];
    if (role === 'teknisi') {
      queryText += ' WHERE t.teknisi_id = $1 ORDER BY t.id DESC';
      params.push(id);
    } else {
      queryText += ' ORDER BY t.id DESC';
    }

    const result = await pool.query(queryText, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching tugas:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data tugas.' });
  }
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, foto_bukti } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status wajib ditentukan.' });
  }

  try {
    const { role, id: userId } = req.user;
    let queryText = 'UPDATE tugas SET status = $1';
    const params = [status];

    if (foto_bukti !== undefined) {
      params.push(foto_bukti);
      queryText += `, foto_bukti = $${params.length}`;
    }

    params.push(id);
    queryText += ` WHERE id = $${params.length}`;

    // If technician, ensure they can only update their own assigned task
    if (role === 'teknisi') {
      params.push(userId);
      queryText += ` AND teknisi_id = $${params.length}`;
    }

    queryText += ' RETURNING *';

    const result = await pool.query(queryText, params);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tugas tidak ditemukan atau Anda tidak memiliki akses untuk tugas ini.'
      });
    }

    return res.json({
      success: true,
      message: 'Status tugas berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating tugas status:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui status tugas.' });
  }
};

module.exports = {
  createTugas,
  getTugas,
  updateStatus
};
