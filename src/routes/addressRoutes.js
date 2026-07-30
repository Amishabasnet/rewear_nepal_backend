const express = require('express');

const {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');

const { protect } = require('../middleware/authMiddleware');

// Import CSRF middleware
const { verifyCsrfToken } = require('../middleware/csrf');

const { validate } = require('../validators/authValidator');

const {
  createAddressValidationRules,
  updateAddressValidationRules,
  addressIdParamValidationRules,
} = require('../validators/addressValidator');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(
    verifyCsrfToken,
    createAddressValidationRules,
    validate,
    addAddress
  )
  .get(getAddresses);

router
  .route('/:id')
  .put(
    verifyCsrfToken,
    addressIdParamValidationRules,
    updateAddressValidationRules,
    validate,
    updateAddress
  )
  .delete(
    verifyCsrfToken,
    addressIdParamValidationRules,
    validate,
    deleteAddress
  );

router.put(
  '/:id/default',
  verifyCsrfToken,
  addressIdParamValidationRules,
  validate,
  setDefaultAddress
);

module.exports = router;