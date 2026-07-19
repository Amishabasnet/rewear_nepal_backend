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
      .filter((img) => img && img.url)
      .map((img) => ({ url: img.url, filename: '' }));
  }

  return undefined; // no images provided — leave existing/default value untouched
};

const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, category, brand, stock, isFeatured } =
    req.body;

  const images = buildImagesFromRequest(req) || [];

  const product = await Product.create({
    name,
    description,
    price,
    discountPrice: discountPrice || undefined,
    category,
    brand,
    stock,
    isFeatured,
    images,
  });

  res.status(201).json({ success: true, data: product });
});

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_low_to_high: { price: 1 },
  price_asc: { price: 1 },
  price_high_to_low: { price: -1 },
  price_desc: { price: -1 },
};

const resolveSortOption = (sort) => SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

const getProducts = asyncHandler(async (req, res) => {
  const { keyword, category, brand, minPrice, maxPrice, rating, sort, page, limit } =
    req.query;

  // ---- Build the MongoDB filter from query params ----
  const filter = { isActive: true };

  // Search by name OR description
  if (keyword) {
    const searchRegex = { $regex: escapeRegex(keyword), $options: 'i' };
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  // Filter by category (case-insensitive exact match)
  if (category) {
    filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  }

  // Filter by brand (case-insensitive exact match)
  if (brand) {
    filter.brand = { $regex: `^${escapeRegex(brand)}$`, $options: 'i' };
  }

  // Filter by price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  // Filter by minimum rating (e.g. rating=4 -> 4 stars & up)
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

  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const {
    name,
    description,
    price,
    discountPrice,
    category,
    brand,
    stock,
    isFeatured,
  } = req.body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (stock !== undefined) product.stock = stock;
  if (isFeatured !== undefined) product.isFeatured = isFeatured;

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

  const updatedProduct = await product.save();

  res.status(200).json({ success: true, data: updatedProduct });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
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
  updateProduct,
  deleteProduct,
  updateStock,
  buildImagesFromRequest,
  removeImageFilesFromDisk,
};
