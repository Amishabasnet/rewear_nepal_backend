const express = require('express');
const {
  setupMfa,
  confirmMfaSetup,
  disableMfa,
  verifyMfaChallenge,
} = require('../controllers/mfaController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/security');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const {
  confirmMfaSetupValidationRules,
  disableMfaValidationRules,
  verifyMfaChallengeValidationRules,
} = require('../validators/mfaValidator');

const router = express.Router();

// Public: completes the login flow started in POST /api/auth/login when
// the account has MFA enabled.
router.post(
  '/verify',
  authLimiter,
  verifyCsrfToken,
  verifyMfaChallengeValidationRules,
  validate,
  verifyMfaChallenge
);

// Private (require a valid JWT — the user is already logged in and is
// enrolling in, or managing, MFA on their own account).
router.post('/setup', protect, verifyCsrfToken, setupMfa);
router.post(
  '/setup/confirm',
  protect,
  verifyCsrfToken,
  confirmMfaSetupValidationRules,
  validate,
  confirmMfaSetup
);
router.post(
  '/disable',
  protect,
  verifyCsrfToken,
  disableMfaValidationRules,
  validate,
  disableMfa
);

module.exports = router;