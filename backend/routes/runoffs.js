const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getTieCandidates,
  createRunoff,
  getActiveRunoffs,
  getRunoffById,
  submitRunoffVote,
  getRunoffVotes,
  verifyRunoffVote,
  rejectRunoffVote,
  closeRunoff,
  getPositionRounds,
} = require('../controllers/runoffController');
const { auth, checkRole, ROLES } = require('../middleware/auth');
const { createRunoffRules, runoffVoteRules, handleValidationErrors } = require('../middleware/validate');

const runoffVoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many vote submission attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public (literal paths before the /:runoffId param routes).
router.get('/active', getActiveRunoffs);
router.get('/rounds', getPositionRounds);

// Admin.
router.get('/ties', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER, ROLES.AUDITOR), getTieCandidates);
router.post('/', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER), createRunoffRules, handleValidationErrors, createRunoff);
router.get('/:runoffId/votes', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER, ROLES.AUDITOR), getRunoffVotes);
router.put('/:runoffId/verify/:memberId', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER), verifyRunoffVote);
router.put('/:runoffId/reject/:memberId', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER), rejectRunoffVote);
router.put('/:runoffId/close', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER), closeRunoff);

// Public single runoff + vote submission.
router.get('/:runoffId', getRunoffById);
router.post('/:runoffId/vote', runoffVoteLimiter, runoffVoteRules, handleValidationErrors, submitRunoffVote);

module.exports = router;
