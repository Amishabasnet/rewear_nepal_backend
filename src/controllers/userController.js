const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendTokenResponse } = require('../utils/generateToken');

const toProfileResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  profileImage: user.profileImage,
  address: user.address,
  city: user.city,
  country: user.country,
  postalCode: user.postalCode,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    success: true,
    data: toProfileResponse(user),
  });
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    profileImage,
    address,
    city,
    country,
    postalCode,
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (email && email !== user.email) {
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      throw new ApiError(400, 'This email is already in use by another account');
    }
    user.email = email;
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (profileImage !== undefined) user.profileImage = profileImage;
  if (address !== undefined) user.address = address;
  if (city !== undefined) user.city = city;
  if (country !== undefined) user.country = country;
  if (postalCode !== undefined) user.postalCode = postalCode;

  const updatedUser = await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: toProfileResponse(updatedUser),
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Password/history are select:false on the schema, so fetch explicitly here
  const user = await User.findById(req.user._id).select('+password +passwordHistory');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Password reuse prevention (see models/userModel.js).
  if (await user.isPasswordReused(newPassword)) {
    throw new ApiError(
      400,
      'You cannot reuse your current or a recently used password. Please choose a different one.'
    );
  }
  user.archiveCurrentPassword();

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  sendTokenResponse(user, 200, res, req);
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
};
