const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;

  const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (existing) {
    throw new ApiError(400, 'A category with this name already exists');
  }

  const category = await Category.create({ name, description, image });

  res.status(201).json({ success: true, data: category });
});

const getCategories = asyncHandler(async (req, res) => {
  const showInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin';

  const filter = showInactive ? {} : { isActive: true };
  const categories = await Category.find(filter).sort('name');

  res.status(200).json({ success: true, count: categories.length, data: categories });
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category || (!category.isActive && req.user?.role !== 'admin')) {
    throw new ApiError(404, 'Category not found');
  }

  res.status(200).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const { name, description, image, isActive } = req.body;

  if (name !== undefined && name !== category.name) {
    const nameTaken = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (nameTaken) {
      throw new ApiError(400, 'A category with this name already exists');
    }
    category.name = name; // pre-save hook regenerates the slug
  }
  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;
  if (isActive !== undefined) category.isActive = isActive;

  const updated = await category.save();

  res.status(200).json({ success: true, data: updated });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const productCount = await Product.countDocuments({
    category: new RegExp(`^${category.name}$`, 'i'),
    isActive: true,
  });

  if (productCount > 0) {
    throw new ApiError(
      400,
      `Cannot delete: ${productCount} active product(s) still use this category. Deactivate it instead, or reassign those products first.`
    );
  }

  await category.deleteOne();

  res.status(200).json({ success: true, message: 'Category deleted successfully' });
});

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
