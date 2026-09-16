const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const { createTugas, getTugasByTeknisi, selesaikanTugas, getTugasAktif } = require('../controllers/tugasController');

router.post('/', createTugas);
router.get('/aktif', getTugasAktif);
router.get('/teknisi/:id', getTugasByTeknisi);
router.patch('/:id/selesai', upload.single('foto'), selesaikanTugas);

module.exports = router;