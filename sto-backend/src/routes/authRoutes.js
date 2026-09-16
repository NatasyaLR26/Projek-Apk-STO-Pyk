const express = require('express');
const router = express.Router();
const { login, getTeknisiList } = require('../controllers/authController');

router.post('/login', login);
router.get('/teknisi', getTeknisiList);

module.exports = router;