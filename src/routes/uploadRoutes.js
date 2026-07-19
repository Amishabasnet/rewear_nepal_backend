const express = require('express');
const { uploadProductImages, uploadProfileImage } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadMultipleImages, uploadSingleImage } = require('../middleware/genericUploadMiddleware');

const router = express.Router();

router.post('/product', protect, authorize('admin'), uploadMultipleImages, uploadProductImages);

router.post('/profile', protect, uploadSingleImage, uploadProfileImage);

module.exports = router;
