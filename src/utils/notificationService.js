const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
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
// Order items only store the product's id/name/price snapshot, not who
// sold it, so we look products back up to find each item's seller. Items
// are grouped by seller first so someone with three items in one order
// gets a single notification, not three separate ones.
const notifySellersProductSold = async (order) => {
  try {
    const productIds = order.orderItems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select('seller');
    const sellerByProductId = new Map(
      products.map((p) => [p._id.toString(), p.seller ? p.seller.toString() : null])
    );

    const itemsBySeller = new Map();
    for (const item of order.orderItems) {
      const sellerId = sellerByProductId.get(item.product.toString());
      if (!sellerId) continue;
      if (!itemsBySeller.has(sellerId)) itemsBySeller.set(sellerId, []);
      itemsBySeller.get(sellerId).push(item);
    }

    const shortId = order._id.toString().slice(-8);

    await Promise.all(
      Array.from(itemsBySeller.entries()).map(([sellerId, items]) => {
        const itemsLabel =
          items.length === 1 ? `"${items[0].name}"` : `${items.length} of your listings`;

        return Notification.create({
          user: sellerId,
          title: 'Your item sold!',
          message: `${itemsLabel} sold in order #${shortId}. Check your Seller Orders page for details.`,
          type: 'product_sold',
          relatedOrder: order._id,
        }).catch((err) => console.error(`Failed to notify seller ${sellerId}: ${err.message}`));
      })
    );
  } catch (err) {
    console.error(`Failed to notify sellers of sold products: ${err.message}`);
  }
};

module.exports = { notifyOrderStatusUpdate, notifyAdminsNewOrder, notifySellersProductSold };
