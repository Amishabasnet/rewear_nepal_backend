const fs = require('fs');
const path = require('path');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');

const removeImageFilesFromDisk = (images = []) => {
  images.forEach((image) => {
    if (!image.filename) return; // external URL, nothing stored on disk
    const filePath = path.join(__dirname, '..', 'uploads', 'products', image.filename);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`Failed to delete image file ${filePath}: ${err.message}`);
      }
    });
  });
};

const buildImagesFromRequest = (req) => {
  if (req.files && req.files.length > 0) {
    return req.files.map((file) => ({
      url: `/uploads/products/${file.filename}`,
      filename: file.filename,
    }));
  }

  if (Array.isArray(req.body.images)) {
    return req.body.images
      .map((img) => (typeof img === 'string' ? { url: img, filename: '' } : img))
      .filter((img) => img && img.url)
      .map((img) => ({ url: img.url, filename: img.filename || '' }));
  }

  return undefined; // no images provided — leave existing/default value untouched
};

// Any logged-in user can list a product for sale. Admin-created listings are
// auto-approved since they're already trusted; everyone else's go to review.
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    discountPrice,
    originalPrice,
    category,
    gender,
    size,
    color,
    condition,
    location,
    brand,
    stock,
    isFeatured,
  } = req.body;

  const images = buildImagesFromRequest(req) || [];
  const isAdmin = req.user.role === 'admin';

  const product = await Product.create({
    seller: req.user._id,
    name,
    description,
    price,
    discountPrice: discountPrice || undefined,
    originalPrice: originalPrice || undefined,
    category,
    gender: gender || undefined,
    size,
    color,
    condition: condition || undefined,
    location,
    brand,
    stock,
    isFeatured,
    images,
    approvalStatus: isAdmin ? 'approved' : 'pending',
  });

  res.status(201).json({
    success: true,
    message: isAdmin
      ? 'Product created'
      : 'Listing submitted — it will go live once approved by an admin.',
    data: product,
  });
});

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_low_to_high: { price: 1 },
  price_asc: { price: 1 },
  price_high_to_low: { price: -1 },
  price_desc: { price: -1 },
};

const resolveSortOption = (sort) => SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

// Public storefront listing — only approved, active products are visible here.
const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    category,
    brand,
    gender,
    size,
    condition,
    location,
    minPrice,
    maxPrice,
    rating,
    sort,
    page,
    limit,
  } = req.query;

  const filter = { isActive: true, approvalStatus: 'approved' };

  if (keyword) {
    const searchRegex = { $regex: escapeRegex(keyword), $options: 'i' };
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  if (category) {
    filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  }

  if (brand) {
    filter.brand = { $regex: `^${escapeRegex(brand)}$`, $options: 'i' };
  }

  if (gender) {
    filter.gender = gender;
  }

  if (size) {
    filter.size = { $regex: `^${escapeRegex(size)}$`, $options: 'i' };
  }

  if (condition) {
    filter.condition = condition;
  }

  if (location) {
    filter.location = { $regex: `^${escapeRegex(location)}$`, $options: 'i' };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  if (rating !== undefined) {
    filter.rating = { $gte: Number(rating) };
  }

  const sortOption = resolveSortOption(sort);

  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 12, 1);
  const skip = (currentPage - 1) * perPage;

  const [products, totalProducts] = await Promise.all([
    Product.find(filter).sort(sortOption).skip(skip).limit(perPage),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.max(Math.ceil(totalProducts / perPage), 1);

  res.status(200).json({
    success: true,
    products,
    currentPage,
    totalPages,
    totalProducts,
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product || !product.isActive || product.approvalStatus !== 'approved') {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json({ success: true, data: product });
});

// Products listed by the logged-in user, any status (pending/approved/rejected).
const getMyProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { seller: req.user._id };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    data: products,
  });
});

const getMyProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || !product.seller || product.seller.toString() !== req.user._id.toString()) {
    throw new ApiError(404, 'Product not found');
  }
  res.status(200).json({ success: true, data: product });
});

const canManage = (product, user) =>
  user.role === 'admin' || (product.seller && product.seller.toString() === user._id.toString());

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (!canManage(product, req.user)) {
    throw new ApiError(403, 'You do not have permission to edit this product');
  }

  const {
    name,
    description,
    price,
    discountPrice,
    originalPrice,
    category,
    gender,
    size,
    color,
    condition,
    location,
    brand,
    stock,
    isFeatured,
  } = req.body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (gender !== undefined) product.gender = gender;
  if (size !== undefined) product.size = size;
  if (color !== undefined) product.color = color;
  if (condition !== undefined) product.condition = condition;
  if (location !== undefined) product.location = location;
  if (brand !== undefined) product.brand = brand;
  if (stock !== undefined) product.stock = stock;
  if (isFeatured !== undefined) product.isFeatured = isFeatured;

  if (originalPrice !== undefined) {
    const effectivePrice = price !== undefined ? Number(price) : product.price;
    if (originalPrice !== null && originalPrice !== '' && Number(originalPrice) < effectivePrice) {
      throw new ApiError(400, 'Original price should be at least the current selling price');
    }
    product.originalPrice = originalPrice || undefined;
  }

  if (discountPrice !== undefined) {
    const effectivePrice = price !== undefined ? Number(price) : product.price;
    if (Number(discountPrice) >= effectivePrice) {
      throw new ApiError(400, 'Discount price must be lower than the regular price');
    }
    product.discountPrice = discountPrice;
  }

  const newImages = buildImagesFromRequest(req);
  if (newImages !== undefined) {
    removeImageFilesFromDisk(product.images);
    product.images = newImages;
  }

  // A non-admin edit changes the listing, so it goes back through review.
  // Admins editing (their own or anyone else's) keep it approved.
  if (req.user.role !== 'admin') {
    product.approvalStatus = 'pending';
    product.rejectionReason = '';
  }

  const updatedProduct = await product.save();

  res.status(200).json({ success: true, data: updatedProduct });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (!canManage(product, req.user)) {
    throw new ApiError(403, 'You do not have permission to delete this product');
  }

  removeImageFilesFromDisk(product.images);

  product.isActive = false;
  await product.save();

  res.status(200).json({ success: true, message: 'Product removed successfully' });
});

const updateStock = asyncHandler(async (req, res) => {
  const { stock, adjust } = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  if (!canManage(product, req.user)) {
    throw new ApiError(403, 'You do not have permission to update this product');
  }

  if (adjust !== undefined) {
    const newStock = product.stock + Number(adjust);
    if (newStock < 0) {
      throw new ApiError(400, 'Stock cannot be reduced below zero');
    }
    product.stock = newStock;
  } else if (stock !== undefined) {
    if (Number(stock) < 0) {
      throw new ApiError(400, 'Stock cannot be negative');
    }
    product.stock = stock;
  } else {
    throw new ApiError(400, 'Provide either "stock" (absolute value) or "adjust" (delta)');
  }

  const updatedProduct = await product.save();

  res.status(200).json({
    success: true,
    data: { _id: updatedProduct._id, stock: updatedProduct.stock },
  });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  getMyProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  buildImagesFromRequest,
  removeImageFilesFromDisk,
};