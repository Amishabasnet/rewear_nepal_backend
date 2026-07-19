const Payment = require('../models/paymentModel');
const Order = require('../models/orderModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { initiatePayment, lookupPayment } = require('../utils/khaltiClient');
const mapKhaltiStatus = (khaltiStatus) => {
  switch (khaltiStatus) {
    case 'Completed':
      return 'Success';
    case 'Pending':
      return 'Pending';
    case 'Refunded':
      return 'Refunded';
    case 'Expired':
    case 'User canceled':
    default:
      return 'Failed';
  }
};

const callKhalti = async (fn, fallbackMessage) => {
  try {
    return await fn();
  } catch (err) {
    const gatewayMessage = err.response?.data?.detail || fallbackMessage;
    throw new ApiError(502, gatewayMessage);
  }
};

const createPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.paymentStatus === 'Paid') {
    throw new ApiError(400, 'This order has already been paid for');
  }

  // Khalti amounts are expressed in paisa (1 NPR = 100 paisa)
  const amountInPaisa = Math.round(order.totalPrice * 100);

  const khaltiResponse = await callKhalti(
    () =>
      initiatePayment({
        return_url: process.env.KHALTI_RETURN_URL,
        website_url: process.env.KHALTI_WEBSITE_URL,
        amount: amountInPaisa,
        purchase_order_id: order._id.toString(),
        purchase_order_name: `Order #${order._id.toString().slice(-8)}`,
        customer_info: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || undefined,
        },
      }),
    'Unable to initiate payment with Khalti'
  );

  const payment = await Payment.create({
    user: req.user._id,
    order: order._id,
    paymentMethod: 'khalti',
    amount: order.totalPrice,
    status: 'Pending',
    pidx: khaltiResponse.pidx,
  });

  res.status(201).json({
    success: true,
    data: {
      paymentId: payment._id,
      paymentUrl: khaltiResponse.payment_url,
      pidx: khaltiResponse.pidx,
      expiresAt: khaltiResponse.expires_at,
    },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { pidx } = req.body;

  const payment = await Payment.findOne({ pidx, user: req.user._id });
  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  const khaltiResponse = await callKhalti(
    () => lookupPayment(pidx),
    'Unable to verify payment with Khalti'
  );

  const mappedStatus = mapKhaltiStatus(khaltiResponse.status);

  payment.status = mappedStatus;
  if (khaltiResponse.transaction_id) {
    payment.transactionId = khaltiResponse.transaction_id;
  }
  if (mappedStatus === 'Success') {
    payment.paidAt = Date.now();
  }
  await payment.save();

  // Reflect the payment outcome on the order itself
  const order = await Order.findById(payment.order);
  if (order) {
    if (mappedStatus === 'Success') {
      order.paymentStatus = 'Paid';
    } else if (mappedStatus === 'Failed') {
      order.paymentStatus = 'Failed';
    }
    await order.save();
  }

  const message =
    mappedStatus === 'Success'
      ? 'Payment completed successfully'
      : mappedStatus === 'Pending'
      ? 'Payment is still pending'
      : mappedStatus === 'Refunded'
      ? 'Payment has been refunded'
      : 'Payment was not completed';

  res.status(200).json({ success: true, message, data: payment });
});

const getPaymentByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const payment = await Payment.findOne({ order: orderId }).populate(
    'order',
    'totalPrice orderStatus paymentStatus'
  );

  if (!payment) {
    throw new ApiError(404, 'Payment not found for this order');
  }

  if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this payment');
  }

  res.status(200).json({ success: true, data: payment });
});

module.exports = {
  createPayment,
  verifyPayment,
  getPaymentByOrder,
};
