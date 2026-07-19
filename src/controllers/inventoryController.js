const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const INVENTORY_SELECT_FIELDS = 'name stock lowStockLimit isAvailable price category brand isActive';

const updateInventory = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { stock, adjust, lowStockLimit } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (adjust !== undefined) {
    const newStock = product.stock + Number(adjust);
    if (newStock < 0) {
      throw new ApiError(
        400,
        `Adjustment would take stock below zero (current stock: ${product.stock})`
      );
    }
    product.stock = newStock;
  } else if (stock !== undefined) {
    product.stock = stock;
  }

  if (lowStockLimit !== undefined) {
    product.lowStockLimit = lowStockLimit;
  }

  const updatedProduct = await product.save();

  res.status(200).json({
    success: true,
    data: {
      _id: updatedProduct._id,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
      lowStockLimit: updatedProduct.lowStockLimit,
      isAvailable: updatedProduct.isAvailable,
    },
  });
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isActive: true,
    stock: { $gt: 0 },
    $expr: { $lte: ['$stock', '$lowStockLimit'] },
  })
    .select(INVENTORY_SELECT_FIELDS)
    .sort('stock');

  res.status(200).json({ success: true, count: products.length, data: products });
});

const getOutOfStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, stock: { $lte: 0 } })
    .select(INVENTORY_SELECT_FIELDS)
    .sort('-updatedAt');

  res.status(200).json({ success: true, count: products.length, data: products });
});

module.exports = {
  updateInventory,
  getLowStockProducts,
  getOutOfStockProducts,
};
