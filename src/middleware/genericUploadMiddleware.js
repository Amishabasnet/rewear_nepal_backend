const multer = require('multer');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, and WEBP image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 8,
  },
});

const handleMulterErrors = (handler) => (req, res, next) => {
  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, `Image upload error: ${err.message}`));
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

// Single file, field name "image" (profile photos, seller shop logos, etc.)
const uploadSingleImage = handleMulterErrors(upload.single('image'));

// Multiple files, field name "images", up to 5 (product galleries)
const uploadMultipleImages = handleMulterErrors(upload.array('images', 5));

module.exports = { uploadSingleImage, uploadMultipleImages };
