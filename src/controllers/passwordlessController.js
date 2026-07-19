const crypto = require('crypto');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendMagicLinkEmail } = require('../utils/emailService');
const { sendTokenResponse } = require('../utils/generateToken');
const requestPasswordlessLogin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const genericResponse = {
    success: true,
    message: 'If an account with that email exists, a login link has been sent.',
  };

  const user = await User.findOne({ email });
  if (!user || user.isBlocked) {
    return res.status(200).json(genericResponse);
  }

  const loginToken = user.getPasswordlessToken();
  await user.save({ validateBeforeSave: false });

  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/passwordless-login/${loginToken}`;

  const emailSent = await sendMagicLinkEmail(user, loginUrl);

  if (!emailSent) {
    user.passwordlessToken = undefined;
    user.passwordlessExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Could not send login email — please try again later');
  }

  res.status(200).json(genericResponse);
});

const verifyPasswordlessLogin = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordlessToken: hashedToken,
    passwordlessExpire: { $gt: Date.now() },
  }).select('+passwordlessToken +passwordlessExpire');

  if (!user) {
    throw new ApiError(400, 'This login link is invalid or has expired');
  }

  user.passwordlessToken = undefined;
  user.passwordlessExpire = undefined;
  await user.save({ validateBeforeSave: false });

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  sendTokenResponse(user, 200, res, req);
});

module.exports = { requestPasswordlessLogin, verifyPasswordlessLogin };
