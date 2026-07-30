const express = require('express');
const { deleteReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const { reviewIdParamValidationRules } = require('../validators/reviewValidator');

const router = express.Router();

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  verifyCsrfToken,
  reviewIdParamValidationRules,
  validate,
  deleteReview
);

module.exports = router;
