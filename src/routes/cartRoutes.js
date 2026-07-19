const express = require('express');
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const {
  addToCartValidationRules,
  updateCartItemValidationRules,
  productIdParamValidationRules,
} = require('../validators/cartValidator');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(addToCartValidationRules, validate, addToCart)
  .get(getCart)
  .delete(clearCart);

router
  .route('/:productId')
  .put(updateCartItemValidationRules, validate, updateCartItem)
  .delete(productIdParamValidationRules, validate, removeCartItem);

module.exports = router;
