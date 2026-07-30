const express = require('express');
const {
  getMyNotifications,
  markAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const { notificationIdParamValidationRules } = require('../validators/notificationValidator');

const router = express.Router();

// Notifications always belong to a specific logged-in user.
router.use(protect);

router.get('/', getMyNotifications);
router.put(
  '/:id/read',
  verifyCsrfToken,
  notificationIdParamValidationRules,
  validate,
  markAsRead
);
router.delete(
  '/:id',
  verifyCsrfToken,
  notificationIdParamValidationRules,
  validate,
  deleteNotification
);

module.exports = router;
