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
  getAllSellers,
  approveOrRejectSeller,
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
} = require('../validators/adminValidator');
const {
  getAllSellersValidationRules,
  approveSellerValidationRules,
} = require('../validators/sellerValidator');

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

router.get('/sellers', getAllSellersValidationRules, validate, getAllSellers);
router.put('/sellers/:id/approve', approveSellerValidationRules, validate, approveOrRejectSeller);

module.exports = router;
