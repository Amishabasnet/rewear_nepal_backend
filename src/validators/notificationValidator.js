const { param } = require('express-validator');
const notificationIdParamValidationRules = [
  param('id').isMongoId().withMessage('id must be a valid notification ID'),
];
module.exports = { notificationIdParamValidationRules };
