const { body, param, query } = require('express-validator');
const registerSellerValidationRules = [
  body('shopName')
    .trim()
    .notEmpty()
    .withMessage('Shop name is required')
    .isLength({ max: 100 })
    .withMessage('Shop name cannot exceed 100 characters'),

  body('shopDescription')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Shop description cannot exceed 1000 characters'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 300 })
    .withMessage('Address cannot exceed 300 characters'),

  body('shopLogo').optional({ checkFalsy: true }).isURL().withMessage('shopLogo must be a valid URL'),
];
const updateSellerProfileValidationRules = [
  body('shopName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Shop name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Shop name cannot exceed 100 characters'),

  body('shopDescription')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Shop description cannot exceed 1000 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number'),

  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty')
    .isLength({ max: 300 })
    .withMessage('Address cannot exceed 300 characters'),

  body('shopLogo').optional({ checkFalsy: true }).isURL().withMessage('shopLogo must be a valid URL'),

  body('isApproved')
    .not()
    .exists()
    .withMessage('isApproved cannot be set directly; it is controlled by an admin'),
];
const addSellerProductValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 120 })
    .withMessage('Product name cannot exceed 120 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('discountPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number')
    .custom((value, { req }) => Number(value) < Number(req.body.price))
    .withMessage('Discount price must be lower than the regular price'),

  body('category').trim().notEmpty().withMessage('Product category is required'),

  body('brand').optional().trim(),

  body('stock')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be true or false')
    .toBoolean(),

  body('images')
    .optional()
    .isArray({ max: 8 })
    .withMessage('A product cannot have more than 8 images'),

  body('images.*.url').optional().isURL().withMessage('Each image must have a valid URL'),
];
const updateSellerProductValidationRules = [
  param('id').isMongoId().withMessage('Invalid product id'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Product name cannot exceed 120 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product description cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),

  body('discountPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),

  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),

  body('brand').optional().trim(),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be true or false')
    .toBoolean(),

  body('images')
    .optional()
    .isArray({ max: 8 })
    .withMessage('A product cannot have more than 8 images'),

  body('images.*.url').optional().isURL().withMessage('Each image must have a valid URL'),

  body('rating')
    .not()
    .exists()
    .withMessage('Rating cannot be set directly; it is derived from reviews'),

  body('numReviews')
    .not()
    .exists()
    .withMessage('numReviews cannot be set directly; it is derived from reviews'),
];
const sellerProductIdParamValidationRules = [
  param('id').isMongoId().withMessage('Invalid product id'),
];
const sellerListValidationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];
const getAllSellersValidationRules = [
  query('status')
    .optional()
    .isIn(['pending', 'approved'])
    .withMessage('status must be "pending" or "approved"'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];
const approveSellerValidationRules = [
  param('id').isMongoId().withMessage('Invalid seller id'),
  body('isApproved')
    .notEmpty()
    .withMessage('isApproved is required')
    .isBoolean()
    .withMessage('isApproved must be true (approve) or false (reject)')
    .toBoolean(),
];
module.exports = {
  registerSellerValidationRules,
  updateSellerProfileValidationRules,
  addSellerProductValidationRules,
  updateSellerProductValidationRules,
  sellerProductIdParamValidationRules,
  sellerListValidationRules,
  getAllSellersValidationRules,
  approveSellerValidationRules,
};
