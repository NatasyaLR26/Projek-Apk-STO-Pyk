const express = require('express');
const router = express.Router();
const { createPermohonan, getPermohonanPending, approvePermohonan } = require('../controllers/permohonanController');

router.post('/', createPermohonan);
router.get('/pending', getPermohonanPending);
router.patch('/:id/approve', approvePermohonan);

module.exports = router;