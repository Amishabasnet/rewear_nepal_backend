const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  sendTokenResponse,
  clearAuthCookies,
  getSecretForRole,
} = require('../utils/generateToken.js');
const {
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  REUSE_DETECTED,
  EXPIRED,
} = require('../utils/refreshTokenService');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { calculatePasswordStrength } = require('../utils/passwordPolicy');
const { isAdminEmail, ADMIN_EMAIL_DOMAIN } = require('../utils/adminPolicy');
const { verifyCaptcha } = require('../utils/captchaService');
const { logEvent, notifyAdminsSecurityAlert } = require('../utils/auditLogger');

const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, captchaToken } = req.body;

  const captchaValid = await verifyCaptcha(captchaToken, req.ip);
  if (!captchaValid) {
    throw new ApiError(400, 'CAPTCHA verification failed. Please try again.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    await logEvent('REGISTER_FAILED', {
      email,
      req,
      success: false,
      details: { reason: 'duplicate_email' },
    });
    throw new ApiError(400, 'An account with this email already exists');
  }

  if (role === 'admin' && !isAdminEmail(email)) {
    await logEvent('REGISTER_FAILED', {
      email,
      req,
      success: false,
      details: { reason: 'admin_email_domain_rejected' },
    });
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
  await logEvent('REGISTER_SUCCESS', { user, req });

  await sendTokenResponse(user, 201, res, req);
});

const login = asyncHandler(async (req, res) => {
  const { email, password, captchaToken } = req.body;

  const captchaValid = await verifyCaptcha(captchaToken, req.ip);
  if (!captchaValid) {
    throw new ApiError(400, 'CAPTCHA verification failed. Please try again.');
  }

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

  if (!user) {
    await logEvent('LOGIN_FAILED', {
      email,
      req,
      success: false,
      details: { reason: 'unknown_email' },
    });
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isLocked()) {
    await logEvent('LOGIN_BLOCKED_ACCOUNT_LOCKED', { user, req, success: false });
    throw new ApiError(
      423,
      'This account is temporarily locked due to too many failed login attempts. Please try again later or reset your password.'
    );
  }

  if (!(await user.matchPassword(password))) {
    const attemptsBefore = user.loginAttempts || 0;
    await user.registerFailedLogin();

    await logEvent('LOGIN_FAILED', {
      user,
      req,
      success: false,
      details: { reason: 'bad_password' },
    });

    // The failed attempt we just registered may have been the one that
    // tipped the account into lockout — if so, that's a real-time
    // brute-force signal worth surfacing to admins immediately, not just
    // recording quietly in the log.
    if (attemptsBefore + 1 >= MAX_LOGIN_ATTEMPTS) {
      await logEvent('ACCOUNT_LOCKED', { user, req, success: false });
      await notifyAdminsSecurityAlert(
        'Account locked — possible brute-force attempt',
        `The account ${user.email} was locked after ${MAX_LOGIN_ATTEMPTS} failed login attempts.`,
        { userId: user._id.toString(), ip: req.ip }
      );
    }

    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.role === 'admin' && !isAdminEmail(user.email)) {
    await logEvent('LOGIN_FAILED', {
      user,
      req,
      success: false,
      details: { reason: 'admin_email_domain_rejected' },
    });
    throw new ApiError(
      403,
      `Admin accounts must use a ${ADMIN_EMAIL_DOMAIN} email address. Please contact support.`
    );
  }

  if (user.isBlocked) {
    await logEvent('LOGIN_BLOCKED_ACCOUNT_DISABLED', { user, req, success: false });
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  await user.registerSuccessfulLogin();

  if (user.mfaEnabled) {
    // Password was correct, but don't issue a real session yet — only a
    // short-lived, single-purpose token that verifyMfaChallenge (in
    // mfaController.js) will exchange for the real session once the TOTP
    // or backup code is verified. Signed with the same role-scoped secret
    // as a real session token, for consistency with dual-secret signing.
    const mfaToken = jwt.sign(
      { id: user._id, purpose: 'mfa' },
      getSecretForRole(user.role),
      { expiresIn: '5m' }
    );
    await logEvent('LOGIN_MFA_CHALLENGE_ISSUED', { user, req });
    return res.status(200).json({ success: true, mfaRequired: true, mfaToken });
  }

  await logEvent('LOGIN_SUCCESS', { user, req });
  await sendTokenResponse(user, 200, res, req);
});

// Refresh: exchanges a valid (rotating) refresh token for a new access
// token + a new refresh token. Called by the frontend automatically when an
// access token has expired, so the user stays logged in without needing to
// keep a long-lived access token around.
const refresh = asyncHandler(async (req, res) => {
  const presented = req.cookies?.refreshToken;
  if (!presented) {
    throw new ApiError(401, 'No refresh token provided. Please log in again.');
  }

  try {
    const { newToken, user } = await rotateRefreshToken(presented, req);
    const { generateAccessToken, setAuthCookies } = require('../utils/generateToken');
    const accessToken = generateAccessToken(user, req);
    setAuthCookies(res, accessToken, newToken);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    clearAuthCookies(res);

    if (err.code === REUSE_DETECTED) {
      await logEvent('REFRESH_TOKEN_REUSE_DETECTED', {
        user: err.user,
        req,
        success: false,
      });
      await notifyAdminsSecurityAlert(
        'Refresh token reuse detected — possible session theft',
        `A previously-used refresh token was replayed for ${err.user?.email || 'a user'}. All of their sessions have been revoked.`,
        { userId: err.user?._id?.toString(), ip: req.ip }
      );
      throw new ApiError(
        401,
        'Session invalidated due to suspicious activity. Please log in again.'
      );
    }

    if (err.code === EXPIRED) {
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    throw new ApiError(401, 'Invalid session. Please log in again.');
  }
});

const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(req.cookies?.refreshToken);
  clearAuthCookies(res);

  await logEvent('LOGOUT', { user: req.user, req });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save({ validateBeforeSave: false });

  // Invalidates all outstanding access tokens (via tokenVersion) AND all
  // outstanding refresh tokens (so a stolen refresh token can't mint new
  // access tokens either).
  await revokeAllForUser(user._id);

  clearAuthCookies(res);

  await logEvent('LOGOUT_ALL_DEVICES', { user, req });

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
      mfaEnabled: user.mfaEnabled,
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
      mfaEnabled: updatedUser.mfaEnabled,
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
    // Deliberately returns the same generic response either way — otherwise
    // this endpoint would let anyone enumerate which emails have accounts.
    await logEvent('PASSWORD_RESET_REQUESTED', {
      email,
      req,
      success: false,
      details: { reason: 'unknown_email' },
    });
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

  await logEvent('PASSWORD_RESET_REQUESTED', { user, req });

  res.status(200).json(genericResponse);
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire +password +passwordHistory');

  if (!user) {
    await logEvent('PASSWORD_RESET_FAILED', {
      req,
      success: false,
      details: { reason: 'invalid_or_expired_token' },
    });
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

  // A password reset is a good moment to also kill every other outstanding
  // session/refresh token — if the reset was prompted by a compromised
  // account, this closes out whatever session the attacker had too.
  await revokeAllForUser(user._id);

  await logEvent('PASSWORD_RESET_COMPLETED', { user, req });

  await sendTokenResponse(user, 200, res, req);
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
  getAllUsers,
  forgotPassword,
  resetPassword,
  checkPasswordStrength,
};
