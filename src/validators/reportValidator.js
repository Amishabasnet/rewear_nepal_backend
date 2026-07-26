const { body, param } = require('express-validator');
const { REPORT_REASONS } = require('../utils/reportConstants');

const createReportValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid product ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('reason is required')
    .isIn(REPORT_REASONS)
    .withMessage(`reason must be one of: ${REPORT_REASONS.join(', ')}`),

  body('details')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('details cannot exceed 500 characters'),
];

const reportIdParamValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid report ID'),
];

const resolveReportValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid report ID'),

  body('action')
    .trim()
    .notEmpty()
    .withMessage('action is required')
    .isIn(['dismiss', 'remove_product'])
    .withMessage('action must be one of: dismiss, remove_product'),
];

const getAllReportsValidationRules = [];

module.exports = {
  createReportValidationRules,
  reportIdParamValidationRules,
  resolveReportValidationRules,
  getAllReportsValidationRules,
};
