const express = require('express');
const router = express.Router();
const { createPermohonan, getPermohonanPending } = require('../controllers/permohonanController');

router.post('/', createPermohonan);
router.get('/pending', getPermohonanPending);

module.exports = router;