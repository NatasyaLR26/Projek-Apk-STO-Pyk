const express = require('express');
const router = express.Router();
const {
  createPermohonan,
  getPermohonan,
  approvePermohonan,
  releasePermohonan
} = require('../controllers/permohonanController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', authenticate, authorizeRoles('teknisi'), createPermohonan);
router.get('/', authenticate, getPermohonan);
router.patch('/:id/approve', authenticate, authorizeRoles('pimpinan'), approvePermohonan);
router.patch('/:id/release', authenticate, authorizeRoles('gudang', 'pimpinan'), releasePermohonan);

module.exports = router;
