const express = require('express');
const router = express.Router();
const { getSettings, updateSetting, getActivityLogs } = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getSettings);
router.put('/:key', auth, updateSetting);
router.get('/logs', auth, getActivityLogs);

module.exports = router;
