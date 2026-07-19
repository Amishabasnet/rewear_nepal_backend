const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { storeImage } = require('../utils/imageStorageService');

const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'At least one image file is required (field name: "images")');
  }

  const uploaded = await Promise.all(
    req.files.map((file) => storeImage(file.buffer, file.originalname, 'products'))
  );

  res.status(201).json({
    success: true,
    count: uploaded.length,
    data: uploaded.map((img) => ({ url: img.url, publicId: img.publicId })),
  });
});

const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'An image file is required (field name: "image")');
  }

  const uploaded = await storeImage(req.file.buffer, req.file.originalname, 'profiles');

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.profileImage = uploaded.url;
  await user.save();

  res.status(201).json({
    success: true,
    data: {
      url: uploaded.url,
      publicId: uploaded.publicId,
      profileImage: user.profileImage,
    },
  });
});

module.exports = {
  uploadProductImages,
  uploadProfileImage,
};
