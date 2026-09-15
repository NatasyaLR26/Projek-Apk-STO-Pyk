const express = require('express');
const router = express.Router();
const { createTugas, getTugasByTeknisi } = require('../controllers/tugasController');

router.post('/', createTugas);
router.get('/teknisi/:id', getTugasByTeknisi);

module.exports = router;