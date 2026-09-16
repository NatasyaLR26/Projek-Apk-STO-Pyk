const express = require('express');
const router = express.Router();
const { getAuditReport } = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/audit', authenticate, getAuditReport);

module.exports = router;
