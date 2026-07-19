const { body } = require('express-validator');
const { isStrongPassword, STRONG_PASSWORD_MESSAGE } = require('../utils/passwordPolicy');
const updateUserProfileValidationRules = [
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

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number'),

  body('profileImage')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Profile image must be a valid URL'),

  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),

  body('postalCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),

  body('role')
    .not()
    .exists()
    .withMessage('Role cannot be updated through this endpoint'),

  body('password')
    .not()
    .exists()
    .withMessage('Use PUT /api/users/change-password to change your password'),
];
const changePasswordValidationRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .custom(isStrongPassword)
    .withMessage(STRONG_PASSWORD_MESSAGE),

  body('confirmNewPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),

  body('newPassword')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from the current password'),
];

module.exports = {
  updateUserProfileValidationRules,
  changePasswordValidationRules,
};
