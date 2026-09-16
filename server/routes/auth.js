const express = require('express');
const router = express.Router();
const { login, getTeknisiList } = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/teknisi', authenticate, authorizeRoles('pimpinan'), getTeknisiList);

module.exports = router;
