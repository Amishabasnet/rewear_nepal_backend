const mongoose = require('mongoose');
const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [120, 'Product name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (value) {
          if (value === undefined || value === null) return true;
          return value < this.price;
        },
        message: 'Discount price must be lower than the regular price',
      },
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => arr.length <= 8,
        message: 'A product cannot have more than 8 images',
      },
      default: [],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    lowStockLimit: {
      type: Number,
      default: 10,
      min: [0, 'Low stock limit cannot be negative'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true, // supports "soft delete" — see deleteProduct controller
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

productSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('stock')) {
    this.isAvailable = this.stock > 0;
  }
  next();
});
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ seller: 1 });

module.exports = mongoose.model('Product', productSchema);
