const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const generateFilename = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  return `image-${uniqueSuffix}${ext}`;
};
const saveImageLocally = (buffer, originalName, folder) => {
  return new Promise((resolve, reject) => {
    const dir = path.join(UPLOADS_ROOT, folder);
    fs.mkdir(dir, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) return reject(mkdirErr);

      const filename = generateFilename(originalName);
      const filePath = path.join(dir, filename);

      fs.writeFile(filePath, buffer, (writeErr) => {
        if (writeErr) return reject(writeErr);
        resolve({
          url: `/uploads/${folder}/${filename}`,
          publicId: `${folder}/${filename}`,
        });
      });
    });
  });
};
const uploadImageToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
};
const storeImage = async (buffer, originalName, folder) => {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 'cloudinary') {
    return uploadImageToCloudinary(buffer, `ecommerce/${folder}`);
  }

  return saveImageLocally(buffer, originalName, folder);
};
const deleteImage = async (publicId) => {
  if (!publicId) return;
  const provider = process.env.STORAGE_PROVIDER || 'local';

  try {
    if (provider === 'cloudinary') {
      await cloudinary.uploader.destroy(publicId);
    } else {
      await fs.promises.unlink(path.join(UPLOADS_ROOT, publicId));
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Failed to delete image (${publicId}): ${err.message}`);
    }
  }
};
module.exports = { storeImage, deleteImage };
