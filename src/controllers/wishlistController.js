const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const WISHLIST_POPULATE_FIELDS = 'name images price discountPrice stock isActive rating';

const emptyWishlistResponse = (userId) => ({
  user: userId,
  products: [],
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    {
      $addToSet: { products: productId },
      $setOnInsert: { user: req.user._id },
    },
    { new: true, upsert: true, runValidators: true }
  ).populate('products', WISHLIST_POPULATE_FIELDS);

  res.status(200).json({
    success: true,
    message: 'Product added to wishlist',
    data: wishlist,
  });
});

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
    'products',
    WISHLIST_POPULATE_FIELDS
  );

  if (!wishlist) {
    return res.status(200).json({ success: true, data: emptyWishlistResponse(req.user._id) });
  }

  res.status(200).json({ success: true, data: wishlist });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    throw new ApiError(404, 'Wishlist not found');
  }

  const exists = wishlist.products.some((p) => p.toString() === productId);
  if (!exists) {
    throw new ApiError(404, 'Product not found in wishlist');
  }

  wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);

  await wishlist.save();
  await wishlist.populate('products', WISHLIST_POPULATE_FIELDS);

  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist',
    data: wishlist,
  });
});

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
};
