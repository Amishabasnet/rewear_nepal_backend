const express = require('express');
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const { productIdParamValidationRules } = require('../validators/wishlistValidator');

const router = express.Router();

// A wishlist always belongs to a specific logged-in user.
router.use(protect);

router.get('/', getWishlist);
router.post('/:productId', productIdParamValidationRules, validate, addToWishlist);
router.delete('/:productId', productIdParamValidationRules, validate, removeFromWishlist);

module.exports = router;
