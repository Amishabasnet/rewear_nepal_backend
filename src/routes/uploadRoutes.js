const express = require('express');
const { uploadProductImages, uploadProfileImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/genericUploadMiddleware');
const { verifyCsrfToken } = require('../middleware/csrf');

const router = express.Router();

router.post(
  '/product',
  protect,
  verifyCsrfToken,
  uploadSingleImage,
  uploadProductImages
);

router.post('/profile', protect, verifyCsrfToken, uploadSingleImage, uploadProfileImage);

module.exports = router;
