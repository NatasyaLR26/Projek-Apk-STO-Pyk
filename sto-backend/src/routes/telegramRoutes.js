const express = require('express');
const router = express.Router();
const { getStatus, syncUpdates, setChatId, sendTestMessage } = require('../controllers/telegramController');

router.get('/status', getStatus);
router.get('/updates', syncUpdates);
router.post('/sync', syncUpdates);
router.post('/set-chat', setChatId);
router.post('/add-chat', setChatId);
router.post('/test', sendTestMessage);

module.exports = router;
