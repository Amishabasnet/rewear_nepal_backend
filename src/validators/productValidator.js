const { body, query } = require('express-validator');
const createProductValidationRules = [
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

  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Each image must have a valid URL'),
];
const updateProductValidationRules = [
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

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

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

  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Each image must have a valid URL'),
  body('rating')
    .not()
    .exists()
    .withMessage('Rating cannot be set directly; it is derived from reviews'),
  body('numReviews')
    .not()
    .exists()
    .withMessage('numReviews cannot be set directly; it is derived from reviews'),
];
const getProductsValidationRules = [
  query('keyword').optional().trim().isLength({ max: 100 }).withMessage('Keyword is too long'),

  query('category').optional().trim().isLength({ max: 100 }).withMessage('Category is too long'),

  query('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand is too long'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a non-negative number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a non-negative number')
    .custom((value, { req }) => {
      if (req.query.minPrice === undefined) return true;
      return Number(value) >= Number(req.query.minPrice);
    })
    .withMessage('maxPrice must be greater than or equal to minPrice'),

  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('rating must be a number between 0 and 5'),

  query('sort')
    .optional()
    .isIn(['newest', 'price_low_to_high', 'price_high_to_low', 'price_asc', 'price_desc'])
    .withMessage(
      'sort must be one of: newest, price_low_to_high, price_high_to_low'
    ),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be a positive integer, max 100'),
];
module.exports = {
  createProductValidationRules,
  updateProductValidationRules,
  getProductsValidationRules,
};
