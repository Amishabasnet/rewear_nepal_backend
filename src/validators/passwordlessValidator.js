const { body, param } = require('express-validator');
const requestPasswordlessValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];
const verifyPasswordlessValidationRules = [
  param('token').notEmpty().withMessage('Login token is required'),
];
module.exports = { requestPasswordlessValidationRules, verifyPasswordlessValidationRules };
