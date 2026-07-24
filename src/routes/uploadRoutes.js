const express = require('express');
const { uploadProductImages, uploadProfileImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/genericUploadMiddleware');

const router = express.Router();

router.post(
  '/product',
  protect,
  uploadSingleImage,
  uploadProductImages
);

router.post('/profile', protect, uploadSingleImage, uploadProfileImage);

module.exports = router;
