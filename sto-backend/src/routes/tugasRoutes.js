const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const {
  getAllTugas,
  createTugas,
  updateTugas,
  deleteTugas,
  claimTugas,
  getOpenTugas,
  getTugasByTeknisi,
  selesaikanTugas,
  getTugasAktif,
  checkInTugas,
  closeTugas
} = require('../controllers/tugasController');

// Endpoint Manajemen Tiket Tugas STO
router.get('/', getAllTugas);
router.post('/', createTugas);
router.get('/open', getOpenTugas);
router.get('/aktif', getTugasAktif);
router.get('/teknisi/:id', getTugasByTeknisi);
router.put('/:id', updateTugas);
router.delete('/:id', deleteTugas);
router.patch('/:id/claim', claimTugas);
router.post('/:id/claim', claimTugas);
router.patch('/:id/checkin', checkInTugas);
router.post('/:id/checkin', checkInTugas);
router.put('/:id/close', closeTugas);
router.post('/:id/close', closeTugas);
router.patch('/:id/selesai', upload.single('foto'), selesaikanTugas);

module.exports = router;