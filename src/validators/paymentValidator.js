const { body, param } = require('express-validator');
const createPaymentValidationRules = [
  body('orderId')
    .notEmpty()
    .withMessage('orderId is required')
    .isMongoId()
    .withMessage('orderId must be a valid order ID'),
];
const verifyPaymentValidationRules = [
  body('pidx').trim().notEmpty().withMessage('pidx is required'),
];
const orderIdParamValidationRules = [
  param('orderId').isMongoId().withMessage('orderId must be a valid order ID'),
];
module.exports = {
  createPaymentValidationRules,
  verifyPaymentValidationRules,
  orderIdParamValidationRules,
};
