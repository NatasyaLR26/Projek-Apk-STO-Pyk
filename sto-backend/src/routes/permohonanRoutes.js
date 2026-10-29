const express = require('express');
const router = express.Router();
const {
  getAllPermohonan,
  createPermohonan,
  getPermohonanPending,
  approvePermohonan,
  rejectPermohonan,
  releasePermohonan,
} = require('../controllers/permohonanController');

router.get('/', getAllPermohonan);
router.post('/', createPermohonan);
router.get('/pending', getPermohonanPending);
router.patch('/:id/approve', approvePermohonan);
router.patch('/:id/reject', rejectPermohonan);
router.patch('/:id/release', releasePermohonan);

module.exports = router;