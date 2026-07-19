const mongoose = require('mongoose');
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one cart per user
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

cartSchema.methods.recalculateTotal = function () {
  const total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  this.totalAmount = Math.round(total * 100) / 100;
};

cartSchema.pre('save', function (next) {
  this.recalculateTotal();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
