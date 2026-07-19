const express = require('express');
const {
  updateInventory,
  getLowStockProducts,
  getOutOfStockProducts,
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const { updateInventoryValidationRules } = require('../validators/inventoryValidator');

const router = express.Router();

// Every inventory route is admin-only.
router.use(protect, authorize('admin'));

router.get('/low-stock', getLowStockProducts);
router.get('/out-of-stock', getOutOfStockProducts);
router.put('/:productId', updateInventoryValidationRules, validate, updateInventory);

module.exports = router;
