const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { isStrongPassword, STRONG_PASSWORD_MESSAGE } = require('../utils/passwordPolicy.js');
const { isAdminEmail, ADMIN_EMAIL_DOMAIN } = require('../utils/adminPolicy');
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return next(new ApiError(400, 'Validation failed', formatted));
  }
  next();
};
const registerValidationRules = [
  body('captchaToken').notEmpty().withMessage('Please complete the CAPTCHA'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[A-Za-z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(isStrongPassword)
    .withMessage(STRONG_PASSWORD_MESSAGE),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),

  body('role')
    .optional()
    .isIn(['buyer', 'admin'])
    .withMessage('Role must be "buyer" or "admin"')
    .custom((value, { req }) => value !== 'admin' || isAdminEmail(req.body.email))
    .withMessage(`Admin accounts can only be created with a ${ADMIN_EMAIL_DOMAIN} email address`),
];
const loginValidationRules = [
  body('captchaToken').notEmpty().withMessage('Please complete the CAPTCHA'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];
const updateProfileValidationRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .not()
    .exists()
    .withMessage('Use PUT /api/users/change-password to change your password'),

  body('role')
    .not()
    .exists()
    .withMessage('Role cannot be updated through this endpoint'),
];
const forgotPasswordValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];
const resetPasswordValidationRules = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(isStrongPassword)
    .withMessage(STRONG_PASSWORD_MESSAGE),
];
const passwordStrengthCheckValidationRules = [
  body('password').notEmpty().withMessage('Password is required'),
];
const changePasswordValidationRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .custom(isStrongPassword)
    .withMessage(STRONG_PASSWORD_MESSAGE),
];
const mfaConfirmValidationRules = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Authentication code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Authentication code must be 6 digits')
    .isNumeric()
    .withMessage('Authentication code must be numeric'),
];

const mfaDisableValidationRules = [
  body('password').notEmpty().withMessage('Password is required to disable MFA'),
];

const mfaChallengeValidationRules = [
  body('mfaToken').notEmpty().withMessage('MFA session token is required'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Authentication code is required')
    .isLength({ min: 6, max: 10 })
    .withMessage('Enter your 6-digit code or a backup code'),
];

module.exports = {
  validate,
  registerValidationRules,
  loginValidationRules,
  updateProfileValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  passwordStrengthCheckValidationRules,
  changePasswordValidationRules,
  mfaConfirmValidationRules,
  mfaDisableValidationRules,
  mfaChallengeValidationRules,
};