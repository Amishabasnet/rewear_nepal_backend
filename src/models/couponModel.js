const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    discountType: {
      type: String,
      enum: {
        values: ['percentage', 'fixed'],
        message: 'discountType must be "percentage" or "fixed"',
      },
      required: [true, 'discountType is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'discountValue is required'],
      min: [0, 'discountValue cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, 'maxDiscountAmount cannot be negative'],
      default: null,
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
      min: [0, 'minPurchaseAmount cannot be negative'],
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, 'usageLimit must be at least 1'],
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
      min: [1, 'usageLimitPerUser must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        usedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
couponSchema.index({ expiresAt: 1 });
module.exports = mongoose.model('Coupon', couponSchema);
