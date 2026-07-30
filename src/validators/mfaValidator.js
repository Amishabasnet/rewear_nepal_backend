const { body } = require('express-validator');

const confirmMfaSetupValidationRules = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Authentication code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Authentication code must be 6 digits')
    .isNumeric()
    .withMessage('Authentication code must be numeric'),
];

const disableMfaValidationRules = [
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyMfaChallengeValidationRules = [
  body('mfaToken').trim().notEmpty().withMessage('MFA session token is required'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Authentication code is required')
    .isLength({ min: 6, max: 10 })
    .withMessage('Authentication code is not a valid length'),
];

module.exports = {
  confirmMfaSetupValidationRules,
  disableMfaValidationRules,
  verifyMfaChallengeValidationRules,
};