const { body, param } = require('express-validator');
const createCouponValidationRules = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be 3-20 characters')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Coupon code can only contain letters, numbers, hyphens, and underscores'),

  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),

  body('discountType')
    .notEmpty()
    .withMessage('discountType is required')
    .isIn(['percentage', 'fixed'])
    .withMessage('discountType must be "percentage" or "fixed"'),

  body('discountValue')
    .notEmpty()
    .withMessage('discountValue is required')
    .isFloat({ min: 0 })
    .withMessage('discountValue must be a non-negative number')
    .custom((value, { req }) => req.body.discountType !== 'percentage' || Number(value) <= 100)
    .withMessage('A percentage discount cannot exceed 100'),

  body('maxDiscountAmount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('maxDiscountAmount must be a non-negative number'),

  body('minPurchaseAmount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('minPurchaseAmount must be a non-negative number'),

  body('usageLimit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('usageLimit must be a positive integer'),

  body('usageLimitPerUser')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('usageLimitPerUser must be a positive integer'),

  body('expiresAt')
    .notEmpty()
    .withMessage('expiresAt is required')
    .isISO8601()
    .withMessage('expiresAt must be a valid date')
    .custom((value) => new Date(value).getTime() > Date.now())
    .withMessage('expiresAt must be a date in the future'),

  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
];
const updateCouponValidationRules = [
  param('id').isMongoId().withMessage('Invalid coupon id'),

  body('code')
    .not()
    .exists()
    .withMessage('Coupon code cannot be changed after creation — deactivate and create a new one instead'),

  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),

  body('discountType')
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage('discountType must be "percentage" or "fixed"'),

  body('discountValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('discountValue must be a non-negative number'),

  body('maxDiscountAmount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('maxDiscountAmount must be a non-negative number'),

  body('minPurchaseAmount')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('minPurchaseAmount must be a non-negative number'),

  body('usageLimit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('usageLimit must be a positive integer'),

  body('usageLimitPerUser')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('usageLimitPerUser must be a positive integer'),

  body('expiresAt').optional().isISO8601().withMessage('expiresAt must be a valid date'),

  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
];
const couponIdParamValidationRules = [param('id').isMongoId().withMessage('Invalid coupon id')];
const validateCouponValidationRules = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
];
module.exports = {
  createCouponValidationRules,
  updateCouponValidationRules,
  couponIdParamValidationRules,
  validateCouponValidationRules,
};
s