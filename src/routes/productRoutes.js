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
  uploadProductImages,
  createProductValidationRules,
  validate,
  createProduct
);

// Editing/deleting is ownership-checked inside the controller (owner or admin).
router.put(
  '/:id',
  protect,
  uploadProductImages,
  updateProductValidationRules,
  validate,
  updateProduct
);

router.delete('/:id', protect, deleteProduct);

router.patch('/:id/stock', protect, updateStock);

// Reviews nested under a product
router.get('/:id/reviews', productIdParamValidationRules, validate, getProductReviews);
router.post(
  '/:id/reviews',
  protect,
  createReviewValidationRules,
  validate,
  addReview
);

// Report a product listing (any logged-in user)
router.post(
  '/:id/report',
  protect,
  createReportValidationRules,
  validate,
  createReport
);

module.exports = router;
