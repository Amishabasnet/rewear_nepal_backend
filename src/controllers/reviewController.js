const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const recalculateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const { avgRating = 0, count = 0 } = stats[0] || {};

  await Product.findByIdAndUpdate(productId, {
    rating: Math.round(avgRating * 10) / 10, // round to 1 decimal place
    numReviews: count,
  });
};

const addReview = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  const alreadyReviewed = await Review.findOne({ user: req.user._id, product: productId });
  if (alreadyReviewed) {
    throw new ApiError(400, 'You have already reviewed this product');
  }

  let review;
  try {
    review = await Review.create({
      user: req.user._id,
      product: productId,
      rating,
      comment,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(400, 'You have already reviewed this product');
    }
    throw err;
  }

  await recalculateProductRating(productId);
  await review.populate('user', 'name');

  res.status(201).json({ success: true, data: review });
});

const getProductReviews = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const reviews = await Review.find({ product: productId })
    .populate('user', 'name')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: reviews.length,
    averageRating: product.rating,
    data: reviews,
  });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  const productId = review.product;

  await review.deleteOne();
  await recalculateProductRating(productId);

  res.status(200).json({ success: true, message: 'Review removed successfully' });
});

module.exports = {
  addReview,
  getProductReviews,
  deleteReview,
};
