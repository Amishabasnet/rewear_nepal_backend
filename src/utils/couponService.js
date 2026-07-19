const ApiError = require('./ApiError');
const calculateDiscount = (coupon, subtotal) => {
  let discount =
    coupon.discountType === 'percentage' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;

  if (coupon.discountType === 'percentage' && coupon.maxDiscountAmount) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  discount = Math.min(discount, subtotal);
  return Math.round(discount * 100) / 100;
};
const validateCouponForUser = (coupon, userId, subtotal) => {
  if (!coupon || !coupon.isActive) {
    throw new ApiError(400, 'This coupon code is invalid or no longer active');
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'This coupon has expired');
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its total usage limit');
  }

  if (subtotal < (coupon.minPurchaseAmount || 0)) {
    throw new ApiError(
      400,
      `A minimum purchase of ${coupon.minPurchaseAmount} is required to use this coupon`
    );
  }

  const timesUsedByUser = (coupon.usedBy || []).filter(
    (entry) => entry.user.toString() === userId.toString()
  ).length;

  if (timesUsedByUser >= (coupon.usageLimitPerUser || 1)) {
    throw new ApiError(400, 'You have already used this coupon the maximum number of times allowed');
  }

  return calculateDiscount(coupon, subtotal);
};

module.exports = { calculateDiscount, validateCouponForUser };
