const { body, param } = require('express-validator');
const { PAYMENT_METHODS, ORDER_STATUSES } = require('../utils/orderConstants');
const placeOrderValidationRules = [
  body('paymentMethod')
    .notEmpty()
    .withMessage('paymentMethod is required')
    .isIn(PAYMENT_METHODS)
    .withMessage(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`),

  body('couponCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('couponCode must be 3-20 characters'),

  body('addressId')
    .optional()
    .isMongoId()
    .withMessage('addressId must be a valid address ID'),

  body('shippingAddress')
    .optional()
    .isObject()
    .withMessage('shippingAddress must be an object'),

  body('shippingAddress.fullName')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('shippingAddress.fullName is required'),

  body('shippingAddress.phone')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('shippingAddress.phone is required')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('shippingAddress.phone must be a valid phone number'),

  body('shippingAddress.street')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('shippingAddress.street is required'),

  body('shippingAddress.city')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('shippingAddress.city is required'),

  body('shippingAddress.postalCode')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('shippingAddress.postalCode is required'),

  body('shippingAddress.country')
    .if(body('shippingAddress').exists())
    .trim()
    .notEmpty()
    .withMessage('shippingAddress.country is required'),
  body().custom((value, { req }) => {
    if (!req.body.addressId && !req.body.shippingAddress) {
      throw new Error('Provide either addressId or a shippingAddress object');
    }
    return true;
  }),
];
const orderIdParamValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid order ID'),
];
const updateOrderStatusValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid order ID'),

  body('orderStatus')
    .notEmpty()
    .withMessage('orderStatus is required')
    .isIn(ORDER_STATUSES)
    .withMessage(`orderStatus must be one of: ${ORDER_STATUSES.join(', ')}`),
];
module.exports = {
  placeOrderValidationRules,
  orderIdParamValidationRules,
  updateOrderStatusValidationRules,
};
