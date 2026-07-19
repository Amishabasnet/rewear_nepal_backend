const { body, param } = require('express-validator');
const updateInventoryValidationRules = [
  param('productId').isMongoId().withMessage('productId must be a valid product ID'),

  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock must be a non-negative integer')
    .toInt(),

  body('adjust')
    .optional()
    .isInt()
    .withMessage('adjust must be an integer')
    .toInt(),

  body('lowStockLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('lowStockLimit must be a non-negative integer')
    .toInt(),

  body().custom((value, { req }) => {
    if (req.body.stock !== undefined && req.body.adjust !== undefined) {
      throw new Error('Provide either "stock" or "adjust", not both');
    }
    if (
      req.body.stock === undefined &&
      req.body.adjust === undefined &&
      req.body.lowStockLimit === undefined
    ) {
      throw new Error('Provide at least one of: stock, adjust, lowStockLimit');
    }
    return true;
  }),
];
module.exports = { updateInventoryValidationRules };
