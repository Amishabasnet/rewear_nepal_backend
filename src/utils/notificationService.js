const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const STATUS_TEMPLATES = {
  Pending: {
    title: 'Order Placed',
    message: (shortId) => `Your order #${shortId} has been placed successfully.`,
  },
  Processing: {
    title: 'Order Processing',
    message: (shortId) => `Your order #${shortId} is now being processed.`,
  },
  Shipped: {
    title: 'Order Shipped',
    message: (shortId) => `Your order #${shortId} has been shipped! It's on its way.`,
  },
  Delivered: {
    title: 'Order Delivered',
    message: (shortId) => `Your order #${shortId} has been delivered. Enjoy your purchase!`,
  },
  Cancelled: {
    title: 'Order Cancelled',
    message: (shortId) => `Your order #${shortId} has been cancelled.`,
  },
};
const notifyOrderStatusUpdate = async (order) => {
  try {
    const template = STATUS_TEMPLATES[order.orderStatus];
    if (!template) return;

    const shortId = order._id.toString().slice(-8);
    const userId = order.user && order.user._id ? order.user._id : order.user;

    await Notification.create({
      user: userId,
      title: template.title,
      message: template.message(shortId),
      type: 'order_status_update',
      relatedOrder: order._id,
    });
  } catch (err) {
    console.error(`Failed to create order-status notification: ${err.message}`);
  }
};
const notifyAdminsNewOrder = async (order) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    const shortId = order._id.toString().slice(-8);

    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user: admin._id,
          title: 'New Order Received',
          message: `A new order #${shortId} for $${order.totalPrice.toFixed(2)} has been placed.`,
          type: 'new_order',
          relatedOrder: order._id,
        }).catch((err) =>
          console.error(`Failed to notify admin ${admin._id}: ${err.message}`)
        )
      )
    );
  } catch (err) {
    console.error(`Failed to notify admins of new order: ${err.message}`);
  }
};
module.exports = { notifyOrderStatusUpdate, notifyAdminsNewOrder };
