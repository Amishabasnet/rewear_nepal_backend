const express = require('express');
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const {
  createCategoryValidationRules,
  updateCategoryValidationRules,
  categoryIdParamValidationRules,
  getCategoriesValidationRules,
} = require('../validators/categoryValidator');

const router = express.Router();

router.get('/', optionalAuth, getCategoriesValidationRules, validate, getCategories);
router.get('/:id', optionalAuth, categoryIdParamValidationRules, validate, getCategoryById);

// Admin-only routes
router.post('/', protect, authorize('admin'), createCategoryValidationRules, validate, createCategory);
router.put('/:id', protect, authorize('admin'), updateCategoryValidationRules, validate, updateCategory);
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  categoryIdParamValidationRules,
  validate,
  deleteCategory
);

module.exports = router;
