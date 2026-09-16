const express = require('express');
const router = express.Router();
const {
  updateTracking,
  getLatestTracking,
  getAllActiveTracking
} = require('../controllers/trackingController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/update', authenticate, updateTracking);
router.get('/active/all', authenticate, getAllActiveTracking);
router.get('/:tugas_id', authenticate, getLatestTracking);

module.exports = router;
