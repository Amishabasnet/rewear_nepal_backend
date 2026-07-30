const crypto = require('crypto');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendTokenResponse, issueMfaToken } = require('../utils/generateToken.js');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { calculatePasswordStrength } = require('../utils/passwordPolicy');
const { isAdminEmail, ADMIN_EMAIL_DOMAIN } = require('../utils/adminPolicy');
const { verifyCaptcha } = require('../utils/captchaService');
const { logEvent } = require('../utils/auditLogger');
const {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  issueSession,
  clearRefreshCookie,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  REUSE_DETECTED,
  EXPIRED,
} = require('../utils/sessionService');
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, captchaToken } = req.body;

  const captchaValid = await verifyCaptcha(captchaToken, req.ip);
  if (!captchaValid) {
    throw new ApiError(400, 'CAPTCHA verification failed. Please try again.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email already exists');
  }

  if (role === 'admin' && !isAdminEmail(email)) {
    throw new ApiError(
      403,
      `Admin accounts can only be created with a ${ADMIN_EMAIL_DOMAIN} email address`
    );
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role === 'admin' ? 'admin' : 'buyer',
  });

  await sendWelcomeEmail(user);

  await issueSession(user, 201, res, req);
});

const login = asyncHandler(async (req, res) => {
  const { email, password, captchaToken } = req.body;

  const captchaValid = await verifyCaptcha(captchaToken, req.ip);
  if (!captchaValid) {
    throw new ApiError(400, 'CAPTCHA verification failed. Please try again.');
  }

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isLocked()) {
    await logEvent('LOGIN_ATTEMPT_ON_LOCKED_ACCOUNT', {
      user,
      req,
      success: false,
      metadata: { email: user.email },
    });
    throw new ApiError(
      423,
      'This account is temporarily locked due to too many failed login attempts. Please try again later or reset your password.'
    );
  }

  if (!(await user.matchPassword(password))) {
    const wasLockedBefore = user.isLocked();
    await user.registerFailedLogin();

    if (!wasLockedBefore && user.isLocked()) {
      // This attempt is the one that tipped the account over the
      // MAX_LOGIN_ATTEMPTS threshold — a strong signal of an active
      // brute-force/credential-stuffing attempt, so it gets a real-time
      // alert, not just an audit-log entry.
      await logEvent('ACCOUNT_LOCKED', {
        user,
        req,
        success: false,
        metadata: { email: user.email },
      });
    } else {
      await logEvent('LOGIN_FAILED', { user, req, success: false, metadata: { email: user.email } });
    }

    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.role === 'admin' && !isAdminEmail(user.email)) {
    throw new ApiError(
      403,
      `Admin accounts must use a ${ADMIN_EMAIL_DOMAIN} email address. Please contact support.`
    );
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  if (user.mfaEnabled) {
    // Password is verified, but the session isn't issued yet — hand back
    // a short-lived mfaToken instead. registerSuccessfulLogin() (which
    // clears lockout counters) happens after the MFA code is confirmed,
    // in verifyMfaChallenge, so a stolen password alone can't reset them.
    const mfaToken = issueMfaToken(user);
    await logEvent('MFA_CHALLENGE_ISSUED', { user, req });

    return res.status(200).json({
      success: true,
      mfaRequired: true,
      message: 'Password verified. Please provide your authentication code to complete login.',
      data: { mfaToken },
    });
  }

  await user.registerSuccessfulLogin();
  await logEvent('LOGIN_SUCCESS', { user, req });

  await issueSession(user, 200, res, req);
});

// Re-issues an access token using the long-lived refresh token instead of
// the access token itself — so a stolen access token can't be used to
// mint a new one once it expires, and the session can be kept alive for
// the full refresh-token lifetime rather than only the access token's.
//
// Flow: presented refresh token -> rotateRefreshToken() looks it up by
// hash, rejects it if expired/unknown, and — critically — if this exact
// token has already been rotated once before (revokedAt is set), that
// means it's being replayed (e.g. stolen and used after the legitimate
// client already rotated past it). That's treated as reuse: every
// refresh token for the user is revoked immediately and the caller must
// log in again, so a leaked refresh token has at most a one-time window.
const refresh = asyncHandler(async (req, res) => {
  const presentedRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!presentedRefreshToken) {
    throw new ApiError(401, 'Not authorized, no refresh token provided');
  }

  let rotated;
  try {
    rotated = await rotateRefreshToken(presentedRefreshToken, req);
  } catch (err) {
    clearRefreshCookie(res);
    res.clearCookie('token', { path: '/' });

    if (err.code === REUSE_DETECTED) {
      await logEvent('REFRESH_TOKEN_REUSE_DETECTED', { user: err.user, req, success: false });
      throw new ApiError(
        401,
        'A previously used refresh token was replayed. For your security, all sessions have been logged out — please log in again.'
      );
    }

    if (err.code === EXPIRED) {
      throw new ApiError(401, 'Your session has expired. Please log in again.');
    }

    throw new ApiError(401, 'Not authorized, invalid refresh token');
  }

  const { newToken, user } = rotated;

  if (user.isBlocked) {
    await revokeAllForUser(user._id);
    clearRefreshCookie(res);
    res.clearCookie('token', { path: '/' });
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  // The refresh token was already rotated above (one-time use); just set
  // the new one and hand back a fresh access token the same way a normal
  // login would.
  res.cookie(REFRESH_COOKIE_NAME, newToken, getRefreshCookieOptions());
  sendTokenResponse(user, 200, res, req);
});

const logout = asyncHandler(async (req, res) => {
  // Revoke just this device's refresh token so it can't be replayed after
  // logout, then clear both cookies.
  const presentedRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (presentedRefreshToken) {
    await revokeRefreshToken(presentedRefreshToken);
  }

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  });
  clearRefreshCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save({ validateBeforeSave: false });

  // Bumping tokenVersion invalidates every outstanding access token, but a
  // still-valid refresh token could otherwise mint a new one with the
  // current tokenVersion and quietly restore access — so every refresh
  // token for this user must be revoked too.
  await revokeAllForUser(user._id);

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  });
  clearRefreshCookie(res);

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

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password +passwordHistory');

  if (!(await user.matchPassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  if (await user.isPasswordReused(newPassword)) {
    throw new ApiError(
      400,
      'You cannot reuse your current or a recently used password. Please choose a different one.'
    );
  }

  user.archiveCurrentPassword();
  user.password = newPassword;
  // Bump tokenVersion so any other active sessions are logged out — same
  // as resetPassword — since the old password may have been compromised.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  // Also revoke every refresh token, otherwise another device's still-valid
  // refresh token could mint a fresh access token carrying the new
  // tokenVersion and quietly stay logged in. Re-issue a brand new session
  // for the device that just changed the password.
  await revokeAllForUser(user._id);
  await issueSession(user, 200, res, req);
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

  // Revoke every refresh token too — otherwise a session from before the
  // reset could still mint fresh access tokens via /auth/refresh.
  await revokeAllForUser(user._id);
  await issueSession(user, 200, res, req);
});

const checkPasswordStrength = asyncHandler(async (req, res) => {
  const { password } = req.body;
  res.status(200).json({ success: true, data: calculatePasswordStrength(password || '') });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAllDevices,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  forgotPassword,
  resetPassword,
  checkPasswordStrength,
};