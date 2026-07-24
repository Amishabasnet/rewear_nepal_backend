const express = require('express');
const {
  getStats,
  getRecentOrders,
  getLowStockProducts,
  getDashboard,
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleBlockUser,
  deleteUser,
  getAllProducts,
  getPendingProducts,
  getProductDetailAdmin,
  approveProduct,
  rejectProduct,
  deleteProductAdmin,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const {
  statsValidationRules,
  recentOrdersValidationRules,
  lowStockValidationRules,
  dashboardValidationRules,
  getAllUsersValidationRules,
  userIdParamValidationRules,
  updateUserRoleValidationRules,
  toggleBlockUserValidationRules,
  getAllProductsValidationRules,
  productIdParamValidationRules,
  rejectProductValidationRules,
} = require('../validators/adminValidator');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', dashboardValidationRules, validate, getDashboard);
router.get('/stats', statsValidationRules, validate, getStats);
router.get('/recent-orders', recentOrdersValidationRules, validate, getRecentOrders);
router.get('/low-stock-products', lowStockValidationRules, validate, getLowStockProducts);

router.get('/users', getAllUsersValidationRules, validate, getAllUsers);
router.get('/users/:id', userIdParamValidationRules, validate, getUserById);
router.put('/users/:id', updateUserRoleValidationRules, validate, updateUserRole);
router.put('/users/:id/block', toggleBlockUserValidationRules, validate, toggleBlockUser);
router.delete('/users/:id', userIdParamValidationRules, validate, deleteUser);

// Product moderation — "pending" must be registered before "/:id"
router.get('/products/pending', getAllProductsValidationRules, validate, getPendingProducts);
router.get('/products', getAllProductsValidationRules, validate, getAllProducts);
router.get('/products/:id', productIdParamValidationRules, validate, getProductDetailAdmin);
router.put('/products/:id/approve', productIdParamValidationRules, validate, approveProduct);
router.put('/products/:id/reject', rejectProductValidationRules, validate, rejectProduct);
router.delete('/products/:id', productIdParamValidationRules, validate, deleteProductAdmin);

module.exports = router;
