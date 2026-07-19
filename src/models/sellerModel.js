const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const sellerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: [100, 'Shop name cannot exceed 100 characters'],
    },
    shopDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Shop description cannot exceed 1000 characters'],
    },
    shopLogo: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      set: (value) => (value === undefined || value === null ? value : encrypt(value)),
      get: (value) => (value === undefined || value === null ? value : decrypt(value)),
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      set: (value) => (value === undefined || value === null ? value : encrypt(value)),
      get: (value) => (value === undefined || value === null ? value : decrypt(value)),
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

sellerSchema.index({ isApproved: 1 });

module.exports = mongoose.model('Seller', sellerSchema);
