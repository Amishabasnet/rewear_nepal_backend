const crypto = require('crypto');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendTokenResponse } = require('../utils/generateToken.js');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { calculatePasswordStrength } = require('../utils/passwordPolicy.js/index.js');
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role === 'admin' ? 'admin' : 'user',
  });

  await sendWelcomeEmail(user);

  sendTokenResponse(user, 201, res, req);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isLocked()) {
    throw new ApiError(
      423,
      'This account is temporarily locked due to too many failed login attempts. Please try again later or reset your password.'
    );
  }

  if (!(await user.matchPassword(password))) {
    await user.registerFailedLogin();
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  await user.registerSuccessfulLogin();

  sendTokenResponse(user, 200, res, req);
});

const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save({ validateBeforeSave: false });

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out of all devices. Please log in again.',
  });
});

const getProfile = asyncHandler(async (req, res) => {
  // req.user is already attached by the `protect` middleware
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (email && email !== user.email) {
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      throw new ApiError(400, 'This email is already in use by another account');
    }
    user.email = email;
  }

  if (name) user.name = name;

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    },
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const genericResponse = {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  };

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

  const emailSent = await sendPasswordResetEmail(user, resetUrl);

  if (!emailSent) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Could not send password reset email — please try again later');
  }

  res.status(200).json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire +password +passwordHistory');

  if (!user) {
    throw new ApiError(400, 'Password reset token is invalid or has expired');
  }

  if (await user.isPasswordReused(req.body.password)) {
    throw new ApiError(
      400,
      'You cannot reuse your current or a recently used password. Please choose a different one.'
    );
  }
  user.archiveCurrentPassword();

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  sendTokenResponse(user, 200, res, req);
});

const checkPasswordStrength = asyncHandler(async (req, res) => {
  const { password } = req.body;
  res.status(200).json({ success: true, data: calculatePasswordStrength(password || '') });
});

module.exports = {
  register,
  login,
  logout,
  logoutAllDevices,
  getProfile,
  updateProfile,
  getAllUsers,
  forgotPassword,
  resetPassword,
  checkPasswordStrength,
};
