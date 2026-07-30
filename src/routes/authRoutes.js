const express = require('express');
const {
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
} = require('../controllers/authController');
const {
  setupMfa,
  confirmMfaSetup,
  disableMfa,
  verifyMfaChallenge,
} = require('../controllers/mfaController');
const {
  requestPasswordlessLogin,
  verifyPasswordlessLogin,
} = require('../controllers/passwordlessController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/security');
const {
  validate,
  registerValidationRules,
  loginValidationRules,
  updateProfileValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  passwordStrengthCheckValidationRules,
  mfaConfirmValidationRules,
  mfaDisableValidationRules,
  mfaChallengeValidationRules,
  changePasswordValidationRules,
} = require('../validators/authValidator');
const {
  requestPasswordlessValidationRules,
  verifyPasswordlessValidationRules,
} = require('../validators/passwordlessValidator');

const router = express.Router();

router.post('/register', authLimiter, registerValidationRules, validate, register);
router.post('/login', authLimiter, loginValidationRules, validate, login);
router.post('/refresh', authLimiter, refresh);
router.post(
  '/forgot-password',
  authLimiter,
  forgotPasswordValidationRules,
  validate,
  forgotPassword
);
router.put(
  '/reset-password/:token',
  authLimiter,
  resetPasswordValidationRules,
  validate,
  resetPassword
);
router.post(
  '/passwordless/request',
  authLimiter,
  requestPasswordlessValidationRules,
  validate,
  requestPasswordlessLogin
);
router.post(
  '/passwordless/verify/:token',
  authLimiter,
  verifyPasswordlessValidationRules,
  validate,
  verifyPasswordlessLogin
);

router.post(
  '/password-strength',
  passwordStrengthCheckValidationRules,
  validate,
  checkPasswordStrength
);

// Private routes (require a valid JWT)
router.post('/logout', protect, logout);
router.post('/logout-all-devices', protect, logoutAllDevices);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidationRules, validate, updateProfile);
router.put(
  '/change-password',
  protect,
  authLimiter,
  changePasswordValidationRules,
  validate,
  changePassword
);

// Admin-only route — demonstrates role-based access control
router.get('/users', protect, authorize('admin'), getAllUsers);

// MFA (TOTP) — setup/confirm/disable require an existing session; challenge
// is called mid-login using the short-lived mfaToken from login(), before
// the real session exists, so it can't require `protect`.
router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/confirm', protect, mfaConfirmValidationRules, validate, confirmMfaSetup);
router.post('/mfa/disable', protect, mfaDisableValidationRules, validate, disableMfa);
router.post(
  '/mfa/challenge',
  authLimiter,
  mfaChallengeValidationRules,
  validate,
  verifyMfaChallenge
);

module.exports = router;
