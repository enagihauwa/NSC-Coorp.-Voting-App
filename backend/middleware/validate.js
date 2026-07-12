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
    .custom((value, { req }) => {
      if (req.file) {
        return true;
      }
      if (Array.isArray(value) && value.length > 0) {
        return true;
      }
      throw new Error('Members must be a non-empty array when no file is uploaded.');
    }),
  body('members.*.staff_number')
    .if((value, { req }) => !req.file)
    .notEmpty()
    .withMessage('Staff number is required for each member')
    .trim(),
  body('members.*.fullname')
    .if((value, { req }) => !req.file)
    .notEmpty()
    .withMessage('Fullname is required for each member')
    .trim(),
  body('members.*.department')
    .if((value, { req }) => !req.file)
    .optional()
    .trim(),
  body('members.*.location')
    .if((value, { req }) => !req.file)
    .optional()
    .trim(),
  body('members.*.phone')
    .if((value, { req }) => !req.file)
    .optional()
    .trim(),
  body('members.*.email')
    .if((value, { req }) => !req.file)
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
  body('department')
    .optional()
    .trim(),
  body('location')
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
  body('department')
    .optional()
    .trim(),
  body('location')
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

const createRunoffRules = [
  body('position_id')
    .notEmpty()
    .withMessage('Position ID is required')
    .isInt({ min: 1 })
    .withMessage('Position ID must be a positive integer'),
  body('candidate_ids')
    .isArray({ min: 2 })
    .withMessage('A runoff needs at least two candidates'),
  body('candidate_ids.*')
    .isInt({ min: 1 })
    .withMessage('Each candidate ID must be a positive integer'),
  body('end_time')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be a valid date'),
];

const runoffVoteRules = [
  body('member_id')
    .notEmpty()
    .withMessage('Member ID is required')
    .isInt({ min: 1 })
    .withMessage('Member ID must be a positive integer'),
  body('candidate_id')
    .notEmpty()
    .withMessage('Candidate ID is required')
    .isInt({ min: 1 })
    .withMessage('Candidate ID must be a positive integer'),
  body('photo')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Photo must be a valid string'),
];

module.exports = {
  handleValidationErrors,
  loginRules,
  memberImportRules,
  candidateRules,
  candidateUpdateRules,
  voteSubmissionRules,
  createRunoffRules,
  runoffVoteRules,
};
