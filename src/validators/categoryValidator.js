const { body, param, query } = require('express-validator');
const createCategoryValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 60 })
    .withMessage('Category name cannot exceed 60 characters'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('image').optional({ checkFalsy: true }).isURL().withMessage('Image must be a valid URL'),
];
const updateCategoryValidationRules = [
  param('id').isMongoId().withMessage('Invalid category id'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ max: 60 })
    .withMessage('Category name cannot exceed 60 characters'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('image').optional({ checkFalsy: true }).isURL().withMessage('Image must be a valid URL'),

  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
];
const categoryIdParamValidationRules = [param('id').isMongoId().withMessage('Invalid category id')];
const getCategoriesValidationRules = [
  query('includeInactive').optional().isBoolean().withMessage('includeInactive must be true or false'),
];
module.exports = {
  createCategoryValidationRules,
  updateCategoryValidationRules,
  categoryIdParamValidationRules,
  getCategoriesValidationRules,
};
