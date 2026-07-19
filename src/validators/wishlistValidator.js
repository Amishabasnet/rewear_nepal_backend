const { param } = require('express-validator');
const productIdParamValidationRules = [
  param('productId').isMongoId().withMessage('productId must be a valid product ID'),
];
module.exports = { productIdParamValidationRules };
