const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { auth, checkRole, ROLES } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { candidateRules, candidateUpdateRules, handleValidationErrors } = require('../middleware/validate');

router.get('/', candidateController.getAll);
router.get('/:id', candidateController.getById);
router.post(
  '/',
  auth,
  checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER),
  upload.single('photo'),
  candidateRules,
  handleValidationErrors,
  candidateController.create
);
router.put(
  '/:id',
  auth,
  checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER),
  upload.single('photo'),
  candidateUpdateRules,
  handleValidationErrors,
  candidateController.update
);
router.delete('/:id', auth, checkRole(ROLES.ADMIN, ROLES.SUPERADMIN), candidateController.delete);
router.patch(
  '/:id/status',
  auth,
  checkRole(ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.ELECTION_OFFICER),
  candidateController.toggleStatus
);

module.exports = router;
