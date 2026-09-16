const express = require('express');
const router = express.Router();
const { getLaporan, getLaporanById } = require('../controllers/laporanController');

router.get('/', getLaporan);
router.get('/:id', getLaporanById);

module.exports = router;