const express = require('express');
const {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  getMyProductById,
  updateProduct,
  deleteProduct,
  updateStock,
} = require('../controllers/productController');
const { addReview, getProductReviews } = require('../controllers/reviewController');
const { createReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProductImages } = require('../middleware/uploadMiddleware');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const {
  createProductValidationRules,
  updateProductValidationRules,
  getProductsValidationRules,
} = require('../validators/productValidator');
const {
  createReviewValidationRules,
  productIdParamValidationRules,
} = require('../validators/reviewValidator');
const { createReportValidationRules } = require('../validators/reportValidator');

const router = express.Router();

// Public routes
router.get('/', getProductsValidationRules, validate, getProducts);

// The logged-in user's own listings (any status) — must come before "/:id"
router.get('/mine', protect, getMyProducts);
router.get('/mine/:id', protect, getMyProductById);

router.get('/:id', getProductById);

// Any logged-in user can list a product for sale.
router.post(
  '/',
  protect,
  verifyCsrfToken,
  uploadProductImages,
  createProductValidationRules,
  validate,
  createProduct
);

// Editing/deleting is ownership-checked inside the controller (owner or admin).
router.put(
  '/:id',
  protect,
  verifyCsrfToken,
  uploadProductImages,
  updateProductValidationRules,
  validate,
  updateProduct
);

router.delete('/:id', protect, verifyCsrfToken, deleteProduct);

router.patch('/:id/stock', protect, verifyCsrfToken, updateStock);

// Reviews nested under a product
router.get('/:id/reviews', productIdParamValidationRules, validate, getProductReviews);
router.post(
  '/:id/reviews',
  protect,
  verifyCsrfToken,
  createReviewValidationRules,
  validate,
  addReview
);

// Report a product listing (any logged-in user)
router.post(
  '/:id/report',
  protect,
  verifyCsrfToken,
  createReportValidationRules,
  validate,
  createReport
);

module.exports = router;
