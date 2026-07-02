const express = require('express');
const router = express.Router();
const { getAll, getByStaffNumber, importMembers, getStats } = require('../controllers/memberController');
const { auth, checkRole, ROLES } = require('../middleware/auth');
const { memberImportRules, handleValidationErrors } = require('../middleware/validate');
const upload = require('../middleware/upload');
const rateLimit = require('express-rate-limit');

const memberLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many identity verification attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/stats', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getStats);
router.post(
  '/import',
  auth,
  checkRole(ROLES.ADMIN, ROLES.SUPERADMIN),
  upload.single('file'),
  memberImportRules,
  handleValidationErrors,
  importMembers
);
router.get('/', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.AUDITOR), getAll);
router.get('/:staffNumber', memberLookupLimiter, getByStaffNumber);

module.exports = router;
