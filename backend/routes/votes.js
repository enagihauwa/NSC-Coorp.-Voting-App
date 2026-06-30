const express = require('express');
const router = express.Router();
const { submit, getAll, getByMember, verifyAll, rejectAll, getVerified } = require('../controllers/voteController');
const { auth } = require('../middleware/auth');
const { voteSubmissionRules, handleValidationErrors } = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many vote submission attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', voteLimiter, voteSubmissionRules, handleValidationErrors, submit);
router.get('/', auth, getAll);
router.get('/member/:memberId', auth, getByMember);
router.put('/verify/:memberId', auth, verifyAll);
router.put('/reject/:memberId', auth, rejectAll);
router.get('/verified/public', getVerified);

module.exports = router;
