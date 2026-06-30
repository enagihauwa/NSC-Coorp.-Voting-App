const express = require('express');
const router = express.Router();
const { login, getProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginRules, handleValidationErrors } = require('../middleware/validate');

router.post('/login', loginRules, handleValidationErrors, login);
router.get('/profile', auth, getProfile);

module.exports = router;
