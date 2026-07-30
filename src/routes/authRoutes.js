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

// Import CSRF middleware
const {
  attachCsrfToken,
  verifyCsrfToken,
} = require('../middleware/csrf');

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

/*
 * CSRF token route
 * The frontend calls this route before sending POST, PUT,
 * PATCH or DELETE requests.
 */
router.get('/csrf-token', attachCsrfToken, (req, res) => {
  res.status(200).json({
    success: true,
    csrfToken: req.csrfToken,
  });
});

// Public authentication routes
router.post(
  '/register',
  authLimiter,
  verifyCsrfToken,
  registerValidationRules,
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  verifyCsrfToken,
  loginValidationRules,
  validate,
  login
);

router.post(
  '/refresh',
  authLimiter,
  verifyCsrfToken,
  refresh
);

router.post(
  '/forgot-password',
  authLimiter,
  verifyCsrfToken,
  forgotPasswordValidationRules,
  validate,
  forgotPassword
);

router.put(
  '/reset-password/:token',
  authLimiter,
  verifyCsrfToken,
  resetPasswordValidationRules,
  validate,
  resetPassword
);

router.post(
  '/passwordless/request',
  authLimiter,
  verifyCsrfToken,
  requestPasswordlessValidationRules,
  validate,
  requestPasswordlessLogin
);

router.post(
  '/passwordless/verify/:token',
  authLimiter,
  verifyCsrfToken,
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

// Private routes
router.post(
  '/logout',
  protect,
  verifyCsrfToken,
  logout
);

router.post(
  '/logout-all-devices',
  protect,
  verifyCsrfToken,
  logoutAllDevices
);

router.get(
  '/profile',
  protect,
  getProfile
);

router.put(
  '/profile',
  protect,
  verifyCsrfToken,
  updateProfileValidationRules,
  validate,
  updateProfile
);

router.put(
  '/change-password',
  protect,
  authLimiter,
  verifyCsrfToken,
  changePasswordValidationRules,
  validate,
  changePassword
);

// Admin-only read route; CSRF verification is not required for GET
router.get(
  '/users',
  protect,
  authorize('admin'),
  getAllUsers
);

// MFA routes
router.post(
  '/mfa/setup',
  protect,
  verifyCsrfToken,
  setupMfa
);

router.post(
  '/mfa/confirm',
  protect,
  verifyCsrfToken,
  mfaConfirmValidationRules,
  validate,
  confirmMfaSetup
);

router.post(
  '/mfa/disable',
  protect,
  verifyCsrfToken,
  mfaDisableValidationRules,
  validate,
  disableMfa
);

router.post(
  '/mfa/challenge',
  authLimiter,
  verifyCsrfToken,
  mfaChallengeValidationRules,
  validate,
  verifyMfaChallenge
);

module.exports = router;