const express = require('express');
const router = express.Router();
const { getAllBarang } = require('../controllers/barangController');

router.get('/', getAllBarang);

module.exports = router;