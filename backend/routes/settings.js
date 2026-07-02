const express = require('express');
const router = express.Router();
const { getSettings, updateSetting, getActivityLogs, getPublicSettings } = require('../controllers/settingsController');
const { auth, checkRole, ROLES } = require('../middleware/auth');

router.get('/public', getPublicSettings);
router.get('/', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getSettings);
router.put('/:key', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN), updateSetting);
router.get('/logs', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getActivityLogs);

module.exports = router;
