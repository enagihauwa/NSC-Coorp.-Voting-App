const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController');
const { auth, checkRole, ROLES } = require('../middleware/auth');

router.get('/', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getDashboard);

module.exports = router;
