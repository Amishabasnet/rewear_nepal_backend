const express = require('express');
const {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/addressController');
const { protect } = require('../middleware/authMiddleware');
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
  .post(createAddressValidationRules, validate, addAddress)
  .get(getAddresses);

router
  .route('/:id')
  .put(addressIdParamValidationRules, updateAddressValidationRules, validate, updateAddress)
  .delete(addressIdParamValidationRules, validate, deleteAddress);

router.put('/:id/default', addressIdParamValidationRules, validate, setDefaultAddress);

module.exports = router;
