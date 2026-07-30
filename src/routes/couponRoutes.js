const express = require('express');
const {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/security');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const {
  createCouponValidationRules,
  updateCouponValidationRules,
  couponIdParamValidationRules,
  validateCouponValidationRules,
} = require('../validators/couponValidator');

const router = express.Router();

// Every coupon route requires a logged-in user.
router.use(protect);

router.post(
  '/validate',
  authLimiter,
  verifyCsrfToken,
  validateCouponValidationRules,
  validate,
  validateCoupon
);

// Admin-only coupon management
router.use(authorize('admin'));
router
  .route('/')
  .post(verifyCsrfToken, createCouponValidationRules, validate, createCoupon)
  .get(getCoupons);
router
  .route('/:id')
  .get(couponIdParamValidationRules, validate, getCouponById)
  .put(verifyCsrfToken, updateCouponValidationRules, validate, updateCoupon)
  .delete(verifyCsrfToken, couponIdParamValidationRules, validate, deleteCoupon);

module.exports = router;
