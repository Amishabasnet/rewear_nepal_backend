const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const Address = require('../models/addressModel');
const Coupon = require('../models/couponModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { notifyOrderStatusUpdate, notifyAdminsNewOrder } = require('../utils/notificationService');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/emailService');
const { validateCouponForUser } = require('../utils/couponService');

const NON_CANCELLABLE_STATUSES = ['Shipped', 'Delivered', 'Cancelled'];

const restoreStockForOrder = async (order) => {
  await Promise.all(
    order.orderItems.map((item) =>
      Product.updateOne({ _id: item.product }, [
        { $set: { stock: { $add: ['$stock', item.quantity] } } },
        { $set: { isAvailable: { $gt: ['$stock', 0] } } },
      ])
    )
  );
};

const placeOrder = asyncHandler(async (req, res) => {
  const { addressId, shippingAddress: inlineAddress, paymentMethod, couponCode } = req.body;

  let shippingAddressSnapshot;
  if (addressId) {
    const savedAddress = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!savedAddress) {
      throw new ApiError(404, 'Address not found');
    }
    shippingAddressSnapshot = {
      fullName: savedAddress.fullName,
      phone: savedAddress.phone,
      street: savedAddress.street,
      city: savedAddress.city,
      state: savedAddress.state,
      postalCode: savedAddress.postalCode,
      country: savedAddress.country,
    };
  } else {
    shippingAddressSnapshot = inlineAddress;
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty');
  }

  const products = await Promise.all(cart.items.map((item) => Product.findById(item.product)));

  cart.items.forEach((item, idx) => {
    const product = products[idx];
    if (!product || !product.isActive) {
      throw new ApiError(400, 'One or more items in your cart are no longer available');
    }
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Only ${product.stock} unit(s) of "${product.name}" are available — please update your cart`
      );
    }
  });

  const orderItems = cart.items.map((item, idx) => {
    const product = products[idx];
    return {
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price: item.price, // the price already snapshotted in the cart
      image: (product.images && product.images[0] && product.images[0].url) || '',
    };
  });

  const subtotal =
    Math.round(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
  let coupon = null;
  let discountAmount = 0;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    discountAmount = validateCouponForUser(coupon, req.user._id, subtotal); // throws if invalid
  }
  const totalPrice = Math.round((subtotal - discountAmount) * 100) / 100;
  const decremented = [];
  try {
    for (const item of orderItems) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        [
          { $set: { stock: { $subtract: ['$stock', item.quantity] } } },
          { $set: { isAvailable: { $gt: ['$stock', 0] } } },
        ]
      );
      if (result.matchedCount === 0) {
        throw new ApiError(
          400,
          `"${item.name}" no longer has enough stock — please update your cart`
        );
      }
      decremented.push(item);
    }
  } catch (err) {
    await Promise.all(
      decremented.map((item) =>
        Product.updateOne({ _id: item.product }, [
          { $set: { stock: { $add: ['$stock', item.quantity] } } },
          { $set: { isAvailable: { $gt: ['$stock', 0] } } },
        ])
      )
    );
    throw err;
  }

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress: shippingAddressSnapshot,
    paymentMethod,
    subtotal,
    totalPrice,
    couponCode: coupon ? coupon.code : null,
    discountAmount,
  });
 
  if (coupon) {
    try {
      coupon.usedCount += 1;
      coupon.usedBy.push({ user: req.user._id, order: order._id });
      await coupon.save();
    } catch (err) {
      console.error(`Failed to record coupon usage for "${coupon.code}": ${err.message}`);
    }
  }

  cart.items = [];
  await cart.save();

  await notifyOrderStatusUpdate(order); // "Order Placed" for the customer
  await notifyAdminsNewOrder(order); // "New Order Received" for every admin

  await sendOrderConfirmationEmail(req.user, order);

  res.status(201).json({ success: true, data: order });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  res.status(200).json({ success: true, data: order });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to cancel this order');
  }

  if (NON_CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    throw new ApiError(
      400,
      `Order cannot be cancelled once it is "${order.orderStatus}"`
    );
  }

  order.orderStatus = 'Cancelled';
  await order.save();
  await restoreStockForOrder(order);
  await notifyOrderStatusUpdate(order); // "Order Cancelled" for the customer
  await sendOrderStatusUpdateEmail(order.user, order); // never throws

  res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email').sort('-createdAt');
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus } = req.body;

  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.orderStatus === 'Cancelled') {
    throw new ApiError(400, 'Cannot change the status of a cancelled order');
  }

  const wasAlreadyCancelled = order.orderStatus === 'Cancelled'; // guarded above, kept for clarity
  order.orderStatus = orderStatus;

  if (orderStatus === 'Delivered') {
    order.deliveredAt = Date.now();
    if (order.paymentMethod === 'cash_on_delivery') {
      order.paymentStatus = 'Paid';
    }
  }

  await order.save();

  if (orderStatus === 'Cancelled' && !wasAlreadyCancelled) {
    await restoreStockForOrder(order);
  }

  await notifyOrderStatusUpdate(order); // e.g. "Order Shipped" / "Order Delivered" for the customer

  await sendOrderStatusUpdateEmail(order.user, order);

  res.status(200).json({ success: true, data: order });
});

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
