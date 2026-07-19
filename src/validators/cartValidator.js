const { body, param } = require('express-validator');
const addToCartValidationRules = [
  body('productId')
    .notEmpty()
    .withMessage('productId is required')
    .isMongoId()
    .withMessage('productId must be a valid product ID'),

  body('quantity')
    .notEmpty()
    .withMessage('quantity is required')
    .isInt({ min: 1 })
    .withMessage('quantity must be a positive integer')
    .toInt(),
];
const updateCartItemValidationRules = [
  param('productId').isMongoId().withMessage('productId must be a valid product ID'),

  body('quantity')
    .notEmpty()
    .withMessage('quantity is required')
    .isInt({ min: 1 })
    .withMessage('quantity must be a positive integer')
    .toInt(),
];
const productIdParamValidationRules = [
  param('productId').isMongoId().withMessage('productId must be a valid product ID'),
];
module.exports = {
  addToCartValidationRules,
  updateCartItemValidationRules,
  productIdParamValidationRules,
};
