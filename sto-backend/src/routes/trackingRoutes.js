const express = require('express');
const router = express.Router();
const { updateTracking, getTrackingByTugas } = require('../controllers/trackingController');

router.post('/', updateTracking);
router.post('/update', updateTracking);
router.get('/:tugas_id', getTrackingByTugas);

module.exports = router;