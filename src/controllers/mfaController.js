const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendTokenResponse } = require('../utils/generateToken');
const mfaService = require('../utils/mfaService');
const { logEvent } = require('../utils/auditLogger');

// Step 1 of enrollment: generate a TOTP secret + QR code and store the
// secret (encrypted at rest via the schema setter), but do NOT flip
// mfaEnabled yet. MFA only becomes active once the user proves they can
// generate a valid code from it, in confirmMfaSetup below — this prevents
// someone from being locked into MFA by a secret they never actually
// finished scanning/saving.
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

// Step 2 of enrollment: user submits a code from their authenticator app to
// prove the secret was saved correctly. On success, MFA is switched on and
// one-time backup codes are generated and shown exactly once — only their
// hashes are persisted.
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

// Requires re-entering the password so a hijacked-but-still-logged-in
// session can't silently turn off MFA protection.
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

// Step 2 of login when MFA is enabled. The short-lived mfaToken (issued by
// login() in authController.js, purpose: 'mfa', 5 min expiry, signed with
// the same role-scoped secret as a real session) proves the password was
// already verified — this endpoint only needs to check the TOTP/backup
// code, then issues the real session exactly like a normal login.
const verifyMfaChallenge = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;

  // We need the user's role to know which secret verifies this token, but
  // we don't have it yet without decoding first — same read-then-verify
  // pattern used in authMiddleware.js. jwt.decode() here is safe because
  // the actual trust decision is the jwt.verify() call right after it.
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
  await sendTokenResponse(user, 200, res, req);
});

module.exports = { setupMfa, confirmMfaSetup, disableMfa, verifyMfaChallenge };
