const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const CART_POPULATE_FIELDS = 'name images price discountPrice stock isActive';

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

const emptyCartResponse = (userId) => ({
  user: userId,
  items: [],
  totalAmount: 0,
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  if (product.stock < 1) {
    throw new ApiError(400, `"${product.name}" is currently out of stock`);
  }

  const unitPrice = product.discountPrice || product.price;
  const cart = await getOrCreateCart(req.user._id);

  const existingItem = cart.items.find((item) => item.product.toString() === productId);

  if (existingItem) {
    const newQuantity = existingItem.quantity + Number(quantity);
    if (newQuantity > product.stock) {
      throw new ApiError(
        400,
        `Only ${product.stock} unit(s) of "${product.name}" are available (${existingItem.quantity} already in your cart)`
      );
    }
    existingItem.quantity = newQuantity;
    existingItem.price = unitPrice; // refresh price snapshot in case it changed
  } else {
    if (Number(quantity) > product.stock) {
      throw new ApiError(400, `Only ${product.stock} unit(s) of "${product.name}" are available`);
    }
    cart.items.push({ product: product._id, quantity: Number(quantity), price: unitPrice });
  }

  await cart.save();
  await cart.populate('items.product', CART_POPULATE_FIELDS);

  res.status(200).json({ success: true, data: cart });
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    CART_POPULATE_FIELDS
  );

  if (!cart) {
    return res.status(200).json({ success: true, data: emptyCartResponse(req.user._id) });
  }

  res.status(200).json({ success: true, data: cart });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) {
    throw new ApiError(404, 'Item not found in cart');
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  if (Number(quantity) > product.stock) {
    throw new ApiError(400, `Only ${product.stock} unit(s) of "${product.name}" are available`);
  }

  item.quantity = Number(quantity);
  item.price = product.discountPrice || product.price; // keep price snapshot fresh

  await cart.save();
  await cart.populate('items.product', CART_POPULATE_FIELDS);

  res.status(200).json({ success: true, data: cart });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemExists = cart.items.some((i) => i.product.toString() === productId);
  if (!itemExists) {
    throw new ApiError(404, 'Item not found in cart');
  }

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);

  await cart.save();
  await cart.populate('items.product', CART_POPULATE_FIELDS);

  res.status(200).json({ success: true, message: 'Item removed from cart', data: cart });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(200).json({
      success: true,
      message: 'Cart is already empty',
      data: emptyCartResponse(req.user._id),
    });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({ success: true, message: 'Cart cleared', data: cart });
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
