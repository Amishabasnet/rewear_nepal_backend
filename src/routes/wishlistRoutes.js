const express = require('express');
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const { productIdParamValidationRules } = require('../validators/wishlistValidator');

const router = express.Router();

// A wishlist always belongs to a specific logged-in user.
router.use(protect);

router.get('/', getWishlist);
router.post(
  '/:productId',
  verifyCsrfToken,
  productIdParamValidationRules,
  validate,
  addToWishlist
);
router.delete(
  '/:productId',
  verifyCsrfToken,
  productIdParamValidationRules,
  validate,
  removeFromWishlist
);

module.exports = router;
