const express = require('express');
const {
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
} = require('../controllers/authController');
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
} = require('../validators/authValidator');
const {
  requestPasswordlessValidationRules,
  verifyPasswordlessValidationRules,
} = require('../validators/passwordlessValidator');

const router = express.Router();

router.post('/register', authLimiter, registerValidationRules, validate, register);
router.post('/login', authLimiter, loginValidationRules, validate, login);
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

// Admin-only route — demonstrates role-based access control
router.get('/users', protect, authorize('admin'), getAllUsers);

module.exports = router;
