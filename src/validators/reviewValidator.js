const { body, param } = require('express-validator');
const createReviewValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid product ID'),

  body('rating')
    .notEmpty()
    .withMessage('rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('rating must be an integer between 1 and 5')
    .toInt(),

  body('comment')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('comment cannot exceed 1000 characters'),
];
const productIdParamValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid product ID'),
];
const reviewIdParamValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid review ID'),
];
module.exports = {
  createReviewValidationRules,
  productIdParamValidationRules,
  reviewIdParamValidationRules,
};
