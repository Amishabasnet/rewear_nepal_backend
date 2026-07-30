const express = require('express');
const { getAllReports, resolveReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { verifyCsrfToken } = require('../middleware/csrf');
const { validate } = require('../validators/authValidator');
const {
  resolveReportValidationRules,
  getAllReportsValidationRules,
} = require('../validators/reportValidator');

const router = express.Router();

// Every report-management route here is admin-only.
router.use(protect, authorize('admin'));

router.get('/admin/all', getAllReportsValidationRules, validate, getAllReports);
router.put(
  '/:id/resolve',
  verifyCsrfToken,
  resolveReportValidationRules,
  validate,
  resolveReport
);

module.exports = router;
