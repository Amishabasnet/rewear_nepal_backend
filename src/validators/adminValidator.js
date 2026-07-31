const { query, param, body } = require('express-validator');
const { sanitizePlainText } = require('../utils/sanitizeInput');
const statsValidationRules = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('days must be an integer between 1 and 365'),
];
const recentOrdersValidationRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];
const lowStockValidationRules = [
  query('threshold')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('threshold must be a non-negative integer'),
];
const dashboardValidationRules = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('days must be an integer between 1 and 365'),

  query('recentOrdersLimit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('recentOrdersLimit must be an integer between 1 and 100'),

  query('lowStockThreshold')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('lowStockThreshold must be a non-negative integer'),
];
const getAllUsersValidationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
  query('role')
    .optional({ checkFalsy: true })
    .isIn(['buyer', 'admin'])
    .withMessage('role must be "buyer" or "admin"'),
  query('search').optional({ checkFalsy: true }).trim().escape(),
];
const userIdParamValidationRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
];
const updateUserRoleValidationRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['buyer', 'admin'])
    .withMessage('Role must be either "buyer" or "admin"'),
];
const toggleBlockUserValidationRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isBlocked').optional().isBoolean().withMessage('isBlocked must be true or false'),
];
const getAllProductsValidationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
  query('approvalStatus')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('approvalStatus must be one of: pending, approved, rejected'),
  query('search').optional().trim().escape(),
];
const productIdParamValidationRules = [
  param('id').isMongoId().withMessage('Invalid product id'),
];
const rejectProductValidationRules = [
  param('id').isMongoId().withMessage('Invalid product id'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('reason cannot exceed 500 characters')
    .customSanitizer(sanitizePlainText),
];
module.exports = {
  statsValidationRules,
  recentOrdersValidationRules,
  lowStockValidationRules,
  dashboardValidationRules,
  getAllUsersValidationRules,
  userIdParamValidationRules,
  updateUserRoleValidationRules,
  toggleBlockUserValidationRules,
  getAllProductsValidationRules,
  productIdParamValidationRules,
  rejectProductValidationRules,
};
