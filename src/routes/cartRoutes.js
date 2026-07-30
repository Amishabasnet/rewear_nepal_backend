const express = require('express');

const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');

const { protect } = require('../middleware/authMiddleware');

// Import CSRF verification middleware
const {
  verifyCsrfToken,
} = require('../middleware/csrf');

const { validate } = require('../validators/authValidator');

const {
  addToCartValidationRules,
  updateCartItemValidationRules,
  productIdParamValidationRules,
} = require('../validators/cartValidator');

const router = express.Router();

// All cart routes require authentication
router.use(protect);

router
  .route('/')
  .post(
    verifyCsrfToken,
    addToCartValidationRules,
    validate,
    addToCart
  )
  .get(getCart)
  .delete(
    verifyCsrfToken,
    clearCart
  );

router
  .route('/:productId')
  .put(
    verifyCsrfToken,
    updateCartItemValidationRules,
    validate,
    updateCartItem
  )
  .delete(
    verifyCsrfToken,
    productIdParamValidationRules,
    validate,
    removeCartItem
  );

module.exports = router;