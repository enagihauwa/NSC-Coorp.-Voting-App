const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const loginRules = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const memberImportRules = [
  body('members')
    .isArray({ min: 1 })
    .withMessage('Members must be a non-empty array'),
  body('members.*.staff_number')
    .notEmpty()
    .withMessage('Staff number is required for each member')
    .trim(),
  body('members.*.fullname')
    .notEmpty()
    .withMessage('Fullname is required for each member')
    .trim(),
  body('members.*.department')
    .optional()
    .trim(),
  body('members.*.location')
    .optional()
    .trim(),
  body('members.*.phone')
    .optional()
    .trim(),
  body('members.*.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
];

const candidateRules = [
  body('fullname')
    .notEmpty()
    .withMessage('Candidate fullname is required')
    .trim(),
  body('position_id')
    .notEmpty()
    .withMessage('Position ID is required')
    .isInt({ min: 1 })
    .withMessage('Position ID must be a positive integer'),
  body('manifesto')
    .optional()
    .trim(),
];

const candidateUpdateRules = [
  body('fullname')
    .optional()
    .trim(),
  body('position_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Position ID must be a positive integer'),
  body('manifesto')
    .optional()
    .trim(),
];

const voteSubmissionRules = [
  body('votes')
    .isArray({ min: 1 })
    .withMessage('Votes must be a non-empty array'),
  body('photo')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Photo must be a valid string'),
  body('votes.*.member_id')
    .notEmpty()
    .withMessage('Member ID is required for each vote')
    .isInt({ min: 1 })
    .withMessage('Member ID must be a positive integer'),
  body('votes.*.position_id')
    .notEmpty()
    .withMessage('Position ID is required for each vote')
    .isInt({ min: 1 })
    .withMessage('Position ID must be a positive integer'),
  body('votes.*.candidate_id')
    .notEmpty()
    .withMessage('Candidate ID is required for each vote')
    .isInt({ min: 1 })
    .withMessage('Candidate ID must be a positive integer'),
];

module.exports = {
  handleValidationErrors,
  loginRules,
  memberImportRules,
  candidateRules,
  candidateUpdateRules,
  voteSubmissionRules,
};
