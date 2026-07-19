const Coupon = require('../models/couponModel');
const Cart = require('../models/cartModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { validateCouponForUser } = require('../utils/couponService');
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    maxDiscountAmount,
    minPurchaseAmount,
    usageLimit,
    usageLimitPerUser,
    expiresAt,
    isActive,
  } = req.body;

  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw new ApiError(400, 'A coupon with this code already exists');
  }

  const coupon = await Coupon.create({
    code,
    description,
    discountType,
    discountValue,
    maxDiscountAmount,
    minPurchaseAmount,
    usageLimit,
    usageLimitPerUser,
    expiresAt,
    isActive,
  });

  res.status(201).json({ success: true, data: coupon });
});

const getCoupons = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = {};
  if (req.query.active === 'true') {
    filter.isActive = true;
    filter.expiresAt = { $gt: new Date() };
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Coupon.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: coupons.length,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    data: coupons,
  });
});

const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }
  res.status(200).json({ success: true, data: coupon });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }

  const {
    description,
    discountType,
    discountValue,
    maxDiscountAmount,
    minPurchaseAmount,
    usageLimit,
    usageLimitPerUser,
    expiresAt,
    isActive,
  } = req.body;

  if (description !== undefined) coupon.description = description;
  if (discountType !== undefined) coupon.discountType = discountType;
  if (discountValue !== undefined) coupon.discountValue = discountValue;
  if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
  if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = minPurchaseAmount;
  if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
  if (usageLimitPerUser !== undefined) coupon.usageLimitPerUser = usageLimitPerUser;
  if (expiresAt !== undefined) coupon.expiresAt = expiresAt;
  if (isActive !== undefined) coupon.isActive = isActive;

  const updated = await coupon.save();

  res.status(200).json({ success: true, data: updated });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }

  await coupon.deleteOne();

  res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
});

const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty');
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  const discountAmount = validateCouponForUser(coupon, req.user._id, subtotal); // throws if invalid

  res.status(200).json({
    success: true,
    data: {
      code: coupon.code,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount,
      total: Math.round((subtotal - discountAmount) * 100) / 100,
    },
  });
});

module.exports = {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};
