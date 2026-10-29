const express = require('express');
const router = express.Router();
const {
  getAllBarang,
  createBarang,
  updateBarang,
  tambahStok,
  deleteBarang,
  getAllSerialNumbers,
  registerSerialNumbers,
  updateSerialNumberStatus
} = require('../controllers/barangController');

// Daftar endpoint inventaris gudang & Pelacakan Serial Number ONT (SOP Telkom)
router.get('/seri', getAllSerialNumbers);
router.post('/seri', registerSerialNumbers);
router.patch('/seri/:sn/status', updateSerialNumberStatus);

router.get('/', getAllBarang);
router.post('/', createBarang);
router.put('/:id', updateBarang);
router.patch('/:id/stok', tambahStok);
router.delete('/:id', deleteBarang);

module.exports = router;