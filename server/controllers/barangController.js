const { pool } = require('../config/db');

const getBarang = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM barang ORDER BY id ASC');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching barang:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data barang.' });
  }
};

const createBarang = async (req, res) => {
  const { nama_barang, stok, satuan } = req.body;

  if (!nama_barang || stok === undefined || !satuan) {
    return res.status(400).json({
      success: false,
      message: 'nama_barang, stok, dan satuan wajib diisi.'
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO barang (nama_barang, stok, satuan) VALUES ($1, $2, $3) RETURNING *',
      [nama_barang.trim(), Number(stok), satuan.trim()]
    );
    return res.status(201).json({
      success: true,
      message: 'Barang berhasil ditambahkan.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating barang:', err);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan barang.' });
  }
};

const updateBarang = async (req, res) => {
  const { id } = req.params;
  const { nama_barang, stok, satuan } = req.body;

  try {
    const result = await pool.query(
      'UPDATE barang SET nama_barang = COALESCE($1, nama_barang), stok = COALESCE($2, stok), satuan = COALESCE($3, satuan) WHERE id = $4 RETURNING *',
      [
        nama_barang ? nama_barang.trim() : null,
        stok !== undefined ? Number(stok) : null,
        satuan ? satuan.trim() : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Barang berhasil diperbarui.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating barang:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui barang.' });
  }
};

const deleteBarang = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM barang WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Barang berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting barang:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus barang. Mungkin barang terkait dengan permohonan material.'
    });
  }
};

module.exports = {
  getBarang,
  createBarang,
  updateBarang,
  deleteBarang
};
