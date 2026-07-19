const Seller = require('../models/sellerModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { storeImage } = require('../utils/imageStorageService');
const {
  buildImagesFromRequest,
  removeImageFilesFromDisk,
} = require('./productController');

const resolveShopLogo = async (req) => {
  if (req.file) {
    const uploaded = await storeImage(req.file.buffer, req.file.originalname, 'sellers');
    return uploaded.url;
  }
  if (typeof req.body.shopLogo === 'string' && req.body.shopLogo.trim()) {
    return req.body.shopLogo.trim();
  }
  return undefined;
};

const registerSeller = asyncHandler(async (req, res) => {
  const existing = await Seller.findOne({ user: req.user._id });
  if (existing) {
    throw new ApiError(400, 'You have already registered as a seller');
  }

  const { shopName, shopDescription, phone, address } = req.body;
  const shopLogo = await resolveShopLogo(req);

  const seller = await Seller.create({
    user: req.user._id,
    shopName,
    shopDescription,
    phone,
    address,
    shopLogo: shopLogo || '',
  });

  req.user.role = 'seller';
  await req.user.save();

  res.status(201).json({
    success: true,
    message: 'Seller registration submitted. Your shop is pending admin approval.',
    data: seller,
  });
});

const getSellerProfile = asyncHandler(async (req, res) => {
  // req.seller is attached by middleware/sellerMiddleware.js (loadSeller)
  const seller = await req.seller.populate('user', 'name email phone');
  res.status(200).json({ success: true, data: seller });
});

const updateSellerProfile = asyncHandler(async (req, res) => {
  const seller = req.seller;

  const { shopName, shopDescription, phone, address } = req.body;

  if (shopName !== undefined) seller.shopName = shopName;
  if (shopDescription !== undefined) seller.shopDescription = shopDescription;
  if (phone !== undefined) seller.phone = phone;
  if (address !== undefined) seller.address = address;

  const shopLogo = await resolveShopLogo(req);
  if (shopLogo !== undefined) seller.shopLogo = shopLogo;

  await seller.save();

  res.status(200).json({ success: true, data: seller });
});

const addSellerProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, category, brand, stock, isFeatured } =
    req.body;

  const images = buildImagesFromRequest(req) || [];

  const product = await Product.create({
    seller: req.seller._id,
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

const getSellerProducts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { seller: req.seller._id };

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

const getOwnProductOr404 = async (productId, sellerId) => {
  const product = await Product.findById(productId);
  if (!product || !product.seller || product.seller.toString() !== sellerId.toString()) {
    throw new ApiError(404, 'Product not found');
  }
  return product;
};

const updateSellerProduct = asyncHandler(async (req, res) => {
  const product = await getOwnProductOr404(req.params.id, req.seller._id);

  const { name, description, price, discountPrice, category, brand, stock, isFeatured } =
    req.body;

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

const deleteSellerProduct = asyncHandler(async (req, res) => {
  const product = await getOwnProductOr404(req.params.id, req.seller._id);

  removeImageFilesFromDisk(product.images);

  product.isActive = false;
  await product.save();

  res.status(200).json({ success: true, message: 'Product removed successfully' });
});

const getSellerOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const productIds = await Product.find({ seller: req.seller._id }).distinct('_id');

  if (productIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      page,
      totalPages: 1,
      data: [],
    });
  }

  const filter = { 'orderItems.product': { $in: productIds } };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  const productIdSet = new Set(productIds.map((id) => id.toString()));

  const data = orders.map((order) => {
    const sellerItems = order.orderItems.filter((item) =>
      productIdSet.has(item.product.toString())
    );
    const sellerSubtotal = sellerItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return {
      _id: order._id,
      buyer: order.user,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      items: sellerItems,
      sellerSubtotal,
    };
  });

  res.status(200).json({
    success: true,
    count: data.length,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    data,
  });
});

module.exports = {
  registerSeller,
  getSellerProfile,
  updateSellerProfile,
  addSellerProduct,
  getSellerProducts,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
};
