const Seller = require('../models/sellerModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const loadSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ user: req.user._id });

  if (!seller) {
    throw new ApiError(404, 'No seller profile found for this account');
  }

  req.seller = seller;
  next();
});

const requireApprovedSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ user: req.user._id });

  if (!seller) {
    throw new ApiError(404, 'No seller profile found for this account');
  }

  if (!seller.isApproved) {
    throw new ApiError(
      403,
      'Your seller account is pending admin approval. You cannot manage products or view orders yet.'
    );
  }

  req.seller = seller;
  next();
});

module.exports = { loadSeller, requireApprovedSeller };
