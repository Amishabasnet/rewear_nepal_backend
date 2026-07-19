const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/userModel');
const enforcePasswordNotExpired = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('passwordChangedAt');

  if (user && user.isPasswordExpired()) {
    throw new ApiError(
      403,
      'Your password has expired and must be changed before continuing.',
      null,
      'PASSWORD_EXPIRED'
    );
  }

  next();
});

module.exports = { enforcePasswordNotExpired };
