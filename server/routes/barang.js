const express = require('express');
const router = express.Router();
const {
  getBarang,
  createBarang,
  updateBarang,
  deleteBarang
} = require('../controllers/barangController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authenticate, getBarang);
router.post('/', authenticate, authorizeRoles('gudang', 'pimpinan'), createBarang);
router.put('/:id', authenticate, authorizeRoles('gudang', 'pimpinan'), updateBarang);
router.patch('/:id', authenticate, authorizeRoles('gudang', 'pimpinan'), updateBarang);
router.delete('/:id', authenticate, authorizeRoles('gudang', 'pimpinan'), deleteBarang);

module.exports = router;
