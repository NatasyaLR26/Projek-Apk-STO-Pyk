const { pool } = require('../config/db');

// Teknisi mengajukan permohonan material beserta detailnya
const createPermohonan = async (req, res) => {
  const { tugas_id, items } = req.body;

  if (!tugas_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'tugas_id dan minimal satu item barang wajib diisi.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Verify tugas belongs to this technician
    if (req.user.role === 'teknisi') {
      const checkTugas = await client.query(
        'SELECT id FROM tugas WHERE id = $1 AND teknisi_id = $2',
        [tugas_id, req.user.id]
      );
      if (checkTugas.rows.length === 0) {
        throw new Error('Anda hanya dapat mengajukan material untuk tiket tugas yang ditugaskan kepada Anda.');
      }
    }

    // 1. Insert permohonan header
    const permohonanRes = await client.query(
      `INSERT INTO permohonan (tugas_id, status, waktu_request) 
       VALUES ($1, 'Pending', NOW()) 
       RETURNING *`,
      [tugas_id]
    );
    const permohonan = permohonanRes.rows[0];

    // 2. Insert detail_permohonan items
    for (const item of items) {
      if (!item.barang_id || !item.jumlah_minta || Number(item.jumlah_minta) <= 0) {
        throw new Error('Barang dan jumlah permintaan minimal 1 harus valid.');
      }
      await client.query(
        `INSERT INTO detail_permohonan (permohonan_id, barang_id, jumlah_minta) 
         VALUES ($1, $2, $3)`,
        [permohonan.id, item.barang_id, Number(item.jumlah_minta)]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: 'Permohonan material berhasil diajukan.',
      data: permohonan
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating permohonan:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal membuat permohonan material.'
    });
  } finally {
    client.release();
  }
};

// Ambil daftar permohonan (dengan detail item dan relasi tugas)
const getPermohonan = async (req, res) => {
  try {
    const { status } = req.query;
    let queryText = `
      SELECT 
        p.id,
        p.tugas_id,
        p.status,
        p.waktu_request,
        t.jenis_kerja,
        t.lokasi,
        t.status AS status_tugas,
        u_tek.nama_lengkap AS nama_teknisi,
        u_tek.email AS email_teknisi,
        u_pim.nama_lengkap AS nama_pimpinan,
        (
          SELECT json_agg(
            json_build_object(
              'detail_id', dp.id,
              'barang_id', dp.barang_id,
              'nama_barang', b.nama_barang,
              'stok_gudang', b.stok,
              'satuan', b.satuan,
              'jumlah_minta', dp.jumlah_minta
            )
          )
          FROM detail_permohonan dp
          JOIN barang b ON b.id = dp.barang_id
          WHERE dp.permohonan_id = p.id
        ) AS items
      FROM permohonan p
      JOIN tugas t ON t.id = p.tugas_id
      LEFT JOIN users u_tek ON u_tek.id = t.teknisi_id
      LEFT JOIN users u_pim ON u_pim.id = t.pimpinan_id
    `;

    const params = [];
    if (status) {
      queryText += ' WHERE p.status = $1';
      params.push(status);
    }
    queryText += ' ORDER BY p.id DESC';

    const result = await pool.query(queryText, params);
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching permohonan:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil permohonan.' });
  }
};

// Pimpinan menyetujui request material
const approvePermohonan = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE permohonan SET status = 'Approved' WHERE id = $1 AND status = 'Pending' RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Permohonan tidak ditemukan atau bukan berstatus Pending.'
      });
    }

    return res.json({
      success: true,
      message: 'Permohonan material disetujui.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error approving permohonan:', err);
    return res.status(500).json({ success: false, message: 'Gagal menyetujui permohonan.' });
  }
};

// Gudang menyerahkan barang & otomatis potong barang.stok secara ACID
const releasePermohonan = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock permohonan row for update
    const permohonanRes = await client.query(
      'SELECT id, tugas_id, status FROM permohonan WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (permohonanRes.rows.length === 0) {
      throw new Error('Permohonan material tidak ditemukan.');
    }

    const permohonan = permohonanRes.rows[0];

    if (permohonan.status === 'Released') {
      throw new Error('Permohonan ini sudah diserahkan sebelumnya.');
    }

    if (permohonan.status !== 'Approved') {
      throw new Error('Permohonan harus berstatus Approved oleh pimpinan sebelum dapat diserahkan.');
    }

    // 2. Fetch requested items
    const detailsRes = await client.query(
      `SELECT dp.id, dp.barang_id, dp.jumlah_minta, b.nama_barang, b.stok, b.satuan
       FROM detail_permohonan dp
       JOIN barang b ON b.id = dp.barang_id
       WHERE dp.permohonan_id = $1`,
      [id]
    );

    const items = detailsRes.rows;
    if (items.length === 0) {
      throw new Error('Permohonan tidak memiliki item barang yang valid.');
    }

    // 3. Check stock sufficiency and deduct with row locking
    for (const item of items) {
      const stockRes = await client.query(
        'SELECT id, nama_barang, stok FROM barang WHERE id = $1 FOR UPDATE',
        [item.barang_id]
      );

      if (stockRes.rows.length === 0) {
        throw new Error(`Barang '${item.nama_barang}' tidak ditemukan di gudang.`);
      }

      const currentStock = stockRes.rows[0].stok;
      if (currentStock < item.jumlah_minta) {
        throw new Error(
          `Stok tidak mencukupi untuk '${item.nama_barang}'. Tersedia: ${currentStock}, Diminta: ${item.jumlah_minta}`
        );
      }

      // Potong stok
      await client.query(
        'UPDATE barang SET stok = stok - $1 WHERE id = $2',
        [item.jumlah_minta, item.barang_id]
      );
    }

    // 4. Update status permohonan to 'Released'
    const updateRes = await client.query(
      "UPDATE permohonan SET status = 'Released' WHERE id = $1 RETURNING *",
      [id]
    );

    // 5. Commit ACID transaction
    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Barang berhasil diserahkan dan stok gudang otomatis terpotong (ACID Transaction).',
      data: updateRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error releasing permohonan:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Gagal menyerahkan barang.'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createPermohonan,
  getPermohonan,
  approvePermohonan,
  releasePermohonan
};
