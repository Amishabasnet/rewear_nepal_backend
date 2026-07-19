const express = require('express');
const {
  registerSeller,
  getSellerProfile,
  updateSellerProfile,
  addSellerProduct,
  getSellerProducts,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
} = require('../controllers/sellerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { loadSeller, requireApprovedSeller } = require('../middleware/sellerMiddleware');
const { uploadSingleImage } = require('../middleware/genericUploadMiddleware');
const { uploadProductImages } = require('../middleware/uploadMiddleware');
const { validate } = require('../validators/authValidator');
const {
  registerSellerValidationRules,
  updateSellerProfileValidationRules,
  addSellerProductValidationRules,
  updateSellerProductValidationRules,
  sellerProductIdParamValidationRules,
  sellerListValidationRules,
} = require('../validators/sellerValidator');

const router = express.Router();

// Every route here requires a logged-in user.
router.use(protect);

router.post(
  '/register',
  uploadSingleImage,
  registerSellerValidationRules,
  validate,
  registerSeller
);

router
  .route('/profile')
  .get(authorize('seller'), loadSeller, getSellerProfile)
  .put(
    authorize('seller'),
    loadSeller,
    uploadSingleImage,
    updateSellerProfileValidationRules,
    validate,
    updateSellerProfile
  );

router
  .route('/products')
  .post(
    authorize('seller'),
    requireApprovedSeller,
    uploadProductImages,
    addSellerProductValidationRules,
    validate,
    addSellerProduct
  )
  .get(authorize('seller'), requireApprovedSeller, sellerListValidationRules, validate, getSellerProducts);

router.put(
  '/products/:id',
  authorize('seller'),
  requireApprovedSeller,
  uploadProductImages,
  updateSellerProductValidationRules,
  validate,
  updateSellerProduct
);

router.delete(
  '/products/:id',
  authorize('seller'),
  requireApprovedSeller,
  sellerProductIdParamValidationRules,
  validate,
  deleteSellerProduct
);

router.get(
  '/orders',
  authorize('seller'),
  requireApprovedSeller,
  sellerListValidationRules,
  validate,
  getSellerOrders
);

module.exports = router;
