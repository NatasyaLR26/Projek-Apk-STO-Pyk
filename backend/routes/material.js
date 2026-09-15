const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// GET semua material - semua role yang sudah login boleh lihat
// (teknisi perlu lihat ini buat tau apa aja yang bisa diminta)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM material ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET satu material spesifik by id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM material WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Material tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST tambah material baru - CUMA role gudang yang boleh
router.post('/', verifyToken, authorizeRoles('gudang'), async (req, res) => {
  try {
    const { nama_material, satuan, stok } = req.body;
    if (!nama_material || !satuan) {
      return res.status(400).json({ message: 'nama_material dan satuan wajib diisi' });
    }
    const result = await db.query(
      'INSERT INTO material (nama_material, satuan, stok) VALUES ($1, $2, $3) RETURNING *',
      [nama_material, satuan, stok || 0]
    );
    res.json({ message: 'Material berhasil ditambahkan', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update material (nama/satuan/stok) - CUMA role gudang
router.put('/:id', verifyToken, authorizeRoles('gudang'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_material, satuan, stok } = req.body;

    const cek = await db.query('SELECT * FROM material WHERE id = $1', [id]);
    if (cek.rows.length === 0) {
      return res.status(404).json({ message: 'Material tidak ditemukan' });
    }

    const result = await db.query(
      'UPDATE material SET nama_material = $1, satuan = $2, stok = $3 WHERE id = $4 RETURNING *',
      [
        nama_material || cek.rows[0].nama_material,
        satuan || cek.rows[0].satuan,
        stok !== undefined ? stok : cek.rows[0].stok,
        id,
      ]
    );
    res.json({ message: 'Material berhasil diupdate', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE material - CUMA role gudang
router.delete('/:id', verifyToken, authorizeRoles('gudang'), async (req, res) => {
  try {
    const { id } = req.params;
    const cek = await db.query('SELECT * FROM material WHERE id = $1', [id]);
    if (cek.rows.length === 0) {
      return res.status(404).json({ message: 'Material tidak ditemukan' });
    }
    await db.query('DELETE FROM material WHERE id = $1', [id]);
    res.json({ message: 'Material berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
