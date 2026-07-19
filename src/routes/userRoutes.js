const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { enforcePasswordNotExpired } = require('../middleware/passwordExpiry');
const { validate } = require('../validators/authValidator');
const {
  updateUserProfileValidationRules,
  changePasswordValidationRules,
} = require('../validators/userValidator');

const router = express.Router();

router.use(protect);

router
  .route('/profile')
  .get(enforcePasswordNotExpired, getUserProfile)
  .put(enforcePasswordNotExpired, updateUserProfileValidationRules, validate, updateUserProfile);

router.put('/change-password', changePasswordValidationRules, validate, changePassword);

module.exports = router;
