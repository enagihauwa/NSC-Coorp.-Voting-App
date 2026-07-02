const express = require('express');
const router = express.Router();
const { submit, getAll, getByMember, verifyAll, rejectAll, getVerified } = require('../controllers/voteController');
const { auth, checkRole, ROLES } = require('../middleware/auth');
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
router.get('/', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getAll);
router.get('/member/:memberId', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getByMember);
router.put('/verify/:memberId', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER), verifyAll);
router.put('/reject/:memberId', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER), rejectAll);
router.get('/verified/public', getVerified);

module.exports = router;
