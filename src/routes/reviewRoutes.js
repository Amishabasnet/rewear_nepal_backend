const express = require('express');
const { deleteReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const { reviewIdParamValidationRules } = require('../validators/reviewValidator');

const router = express.Router();

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  reviewIdParamValidationRules,
  validate,
  deleteReview
);

module.exports = router;
