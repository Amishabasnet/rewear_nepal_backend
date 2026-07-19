const { query, param, body } = require('express-validator');
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
  query('role').optional().isIn(['user', 'admin']).withMessage('role must be "user" or "admin"'),
  query('search').optional().trim().escape(),
];
const userIdParamValidationRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
];
const updateUserRoleValidationRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"'),
];
const toggleBlockUserValidationRules = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('isBlocked').optional().isBoolean().withMessage('isBlocked must be true or false'),
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
};
