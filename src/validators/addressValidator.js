const { body, param } = require('express-validator');
const { sanitizePlainText } = require('../utils/sanitizeInput');
const createAddressValidationRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number'),

  body('street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters')
    .customSanitizer(sanitizePlainText),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required')
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters')
    .customSanitizer(sanitizePlainText),

  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be true or false')
    .toBoolean(),
];
const updateAddressValidationRules = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number'),

  body('street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street address cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters')
    .customSanitizer(sanitizePlainText),

  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('postalCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Postal code cannot be empty')
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters')
    .customSanitizer(sanitizePlainText),

  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters')
    .customSanitizer(sanitizePlainText),

  body('isDefault')
    .not()
    .exists()
    .withMessage('Use PUT /api/addresses/:id/default to set a default address'),
];
const addressIdParamValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid address ID'),
];
module.exports = {
  createAddressValidationRules,
  updateAddressValidationRules,
  addressIdParamValidationRules,
};
