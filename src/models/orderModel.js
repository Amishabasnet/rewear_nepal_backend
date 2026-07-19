const mongoose = require('mongoose');
const { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } = require('../utils/orderConstants');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: {
      type: [orderItemSchema],
      validate: [(arr) => arr.length > 0, 'Order must contain at least one item'],
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`,
      },
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(', ')}`,
      },
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      enum: {
        values: ORDER_STATUSES,
        message: `orderStatus must be one of: ${ORDER_STATUSES.join(', ')}`,
      },
      default: 'Pending',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    subtotal: {
      type: Number,
      min: [0, 'Subtotal cannot be negative'],
    },
    couponCode: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true } 
);

orderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
