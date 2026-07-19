const Address = require('../models/addressModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const unsetOtherDefaults = async (userId, keepAddressId) => {
  await Address.updateMany(
    { user: userId, _id: { $ne: keepAddressId } },
    { $set: { isDefault: false } }
  );
};

const addAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, street, city, state, postalCode, country, isDefault } = req.body;

  const existingCount = await Address.countDocuments({ user: req.user._id });
  const shouldBeDefault = existingCount === 0 || Boolean(isDefault);

  const address = await Address.create({
    user: req.user._id,
    fullName,
    phone,
    street,
    city,
    state,
    postalCode,
    country,
    isDefault: shouldBeDefault,
  });

  if (shouldBeDefault) {
    await unsetOtherDefaults(req.user._id, address._id);
  }

  res.status(201).json({ success: true, data: address });
});

const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  res.status(200).json({ success: true, count: addresses.length, data: addresses });
});

const updateAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, street, city, state, postalCode, country } = req.body;

  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  if (fullName !== undefined) address.fullName = fullName;
  if (phone !== undefined) address.phone = phone;
  if (street !== undefined) address.street = street;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (postalCode !== undefined) address.postalCode = postalCode;
  if (country !== undefined) address.country = country;

  const updatedAddress = await address.save();

  res.status(200).json({ success: true, data: updatedAddress });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  const wasDefault = address.isDefault;
  await address.deleteOne();

  if (wasDefault) {
    const nextDefault = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  res.status(200).json({ success: true, message: 'Address removed successfully' });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  address.isDefault = true;
  await address.save();
  await unsetOtherDefaults(req.user._id, address._id);

  res.status(200).json({ success: true, message: 'Default address updated', data: address });
});

module.exports = {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
