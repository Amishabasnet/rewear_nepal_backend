const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { issueSession } = require('../utils/sessionService');
const mfaService = require('../utils/mfaService');
const { logEvent } = require('../utils/auditLogger');

const setupMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.mfaEnabled) {
    throw new ApiError(400, 'MFA is already enabled on this account');
  }

  const secret = mfaService.generateSecret();
  user.mfaSecret = secret;
  await user.save({ validateBeforeSave: false });

  const qrCodeDataUrl = await mfaService.generateQrCodeDataUrl(user.email, secret);

  res.status(200).json({
    success: true,
    data: { secret, qrCodeDataUrl },
  });
});

const confirmMfaSetup = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id).select('+mfaSecret');

  if (!user.mfaSecret) {
    throw new ApiError(400, 'No pending MFA setup found. Please start setup again.');
  }

  if (!mfaService.verifyToken(token, user.mfaSecret)) {
    await logEvent('MFA_SETUP_CONFIRM_FAILED', { user, req, success: false });
    throw new ApiError(400, 'Invalid or expired code. Please try again.');
  }

  const backupCodes = mfaService.generateBackupCodes();
  user.mfaBackupCodes = backupCodes.map(mfaService.hashBackupCode);
  user.mfaEnabled = true;
  await user.save({ validateBeforeSave: false });

  await logEvent('MFA_ENABLED', { user, req });

  res.status(200).json({
    success: true,
    message: 'MFA enabled successfully. Save these backup codes somewhere safe — they will not be shown again.',
    data: { backupCodes },
  });
});

const disableMfa = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.matchPassword(password))) {
    await logEvent('MFA_DISABLE_FAILED', { user, req, success: false });
    throw new ApiError(401, 'Incorrect password');
  }

  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  user.mfaBackupCodes = [];
  await user.save({ validateBeforeSave: false });

  await logEvent('MFA_DISABLED', { user, req });

  res.status(200).json({ success: true, message: 'MFA disabled successfully' });
});

const verifyMfaChallenge = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;

  const unverifiedPayload = jwt.decode(mfaToken);
  if (!unverifiedPayload || unverifiedPayload.purpose !== 'mfa') {
    throw new ApiError(401, 'Invalid MFA session. Please log in again.');
  }

  const pendingUser = await User.findById(unverifiedPayload.id).select('+mfaSecret +mfaBackupCodes');
  if (!pendingUser || !pendingUser.mfaEnabled) {
    throw new ApiError(401, 'Invalid MFA session. Please log in again.');
  }

  const { getSecretForRole } = require('../utils/generateToken');
  let decoded;
  try {
    decoded = jwt.verify(mfaToken, getSecretForRole(pendingUser.role));
  } catch {
    throw new ApiError(401, 'MFA session expired. Please log in again.');
  }

  if (decoded.purpose !== 'mfa' || decoded.id !== unverifiedPayload.id) {
    throw new ApiError(401, 'Invalid MFA session. Please log in again.');
  }

  const user = pendingUser;
  let valid = mfaService.verifyToken(code, user.mfaSecret);

  if (!valid && code) {
    // Fall back to a one-time backup code, consuming it on use.
    const hashedAttempt = mfaService.hashBackupCode(code);
    const idx = (user.mfaBackupCodes || []).indexOf(hashedAttempt);
    if (idx !== -1) {
      valid = true;
      user.mfaBackupCodes.splice(idx, 1);
      await user.save({ validateBeforeSave: false });
    }
  }

  if (!valid) {
    await logEvent('MFA_LOGIN_FAILED', { user, req, success: false });
    throw new ApiError(401, 'Invalid authentication code');
  }

  await user.registerSuccessfulLogin();
  await logEvent('MFA_LOGIN_SUCCESS', { user, req });
  await issueSession(user, 200, res, req);
});

module.exports = { setupMfa, confirmMfaSetup, disableMfa, verifyMfaChallenge };
