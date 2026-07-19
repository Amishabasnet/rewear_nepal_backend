const express = require('express');
const {
  createPayment,
  verifyPayment,
  getPaymentByOrder,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../validators/authValidator');
const {
  createPaymentValidationRules,
  verifyPaymentValidationRules,
  orderIdParamValidationRules,
} = require('../validators/paymentValidator');

const router = express.Router();

// Payments always belong to a specific logged-in user.
router.use(protect);

router.post('/create', createPaymentValidationRules, validate, createPayment);
router.post('/verify', verifyPaymentValidationRules, validate, verifyPayment);
router.get('/:orderId', orderIdParamValidationRules, validate, getPaymentByOrder);

module.exports = router;
