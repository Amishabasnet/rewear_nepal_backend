const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Seller = require('../models/sellerModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const DEFAULT_RECENT_ORDERS_LIMIT = 10;
const DEFAULT_SALES_SUMMARY_DAYS = 7;

const clampInt = (value, { min, max, fallback }) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const getTotalRevenue = async () => {
  const result = await Order.aggregate([
    { $match: { paymentStatus: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  return result[0]?.total || 0;
};

const getOrderStatusBreakdown = async () => {
  const results = await Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]);

  const breakdown = { Pending: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
  results.forEach((r) => {
    if (r._id in breakdown) breakdown[r._id] = r.count;
  });
  return breakdown;
};

const getSalesSummary = async (days) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const results = await Order.aggregate([
    { $match: { paymentStatus: 'Paid', createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalSales: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', totalSales: 1, orderCount: 1 } },
  ]);

  return results;
};

const getStats = asyncHandler(async (req, res) => {
  const days = clampInt(req.query.days, { min: 1, max: 365, fallback: DEFAULT_SALES_SUMMARY_DAYS });

  const [totalUsers, totalProducts, totalOrders, totalRevenue, orderStatusBreakdown, salesSummary] =
    await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
      Order.countDocuments({}),
      getTotalRevenue(),
      getOrderStatusBreakdown(),
      getSalesSummary(days),
    ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      orderStatusBreakdown,
      salesSummary,
    },
  });
});

const getRecentOrders = asyncHandler(async (req, res) => {
  const limit = clampInt(req.query.limit, {
    min: 1,
    max: 100,
    fallback: DEFAULT_RECENT_ORDERS_LIMIT,
  });

  const orders = await Order.find({}).populate('user', 'name email').sort('-createdAt').limit(limit);

  res.status(200).json({ success: true, count: orders.length, data: orders });
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = clampInt(req.query.threshold, {
    min: 0,
    max: 10000,
    fallback: DEFAULT_LOW_STOCK_THRESHOLD,
  });

  const products = await Product.find({ isActive: true, stock: { $lte: threshold } })
    .select('name stock price category brand images')
    .sort('stock');

  res.status(200).json({ success: true, count: products.length, threshold, data: products });
});

const getDashboard = asyncHandler(async (req, res) => {
  const days = clampInt(req.query.days, { min: 1, max: 365, fallback: DEFAULT_SALES_SUMMARY_DAYS });
  const recentOrdersLimit = clampInt(req.query.recentOrdersLimit, {
    min: 1,
    max: 100,
    fallback: DEFAULT_RECENT_ORDERS_LIMIT,
  });
  const lowStockThreshold = clampInt(req.query.lowStockThreshold, {
    min: 0,
    max: 10000,
    fallback: DEFAULT_LOW_STOCK_THRESHOLD,
  });

  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue,
    orderStatusBreakdown,
    salesSummary,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    User.countDocuments({}),
    Product.countDocuments({}),
    Order.countDocuments({}),
    getTotalRevenue(),
    getOrderStatusBreakdown(),
    getSalesSummary(days),
    Order.find({}).populate('user', 'name email').sort('-createdAt').limit(recentOrdersLimit),
    Product.find({ isActive: true, stock: { $lte: lowStockThreshold } })
      .select('name stock price category brand')
      .sort('stock'),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        orderStatusBreakdown,
        salesSummary,
      },
      recentOrders,
      lowStockProducts,
    },
  });
});

const USER_LIST_FIELDS = 'name email phone role isBlocked createdAt';

const getAllUsers = asyncHandler(async (req, res) => {
  const page = clampInt(req.query.page, { min: 1, max: 100000, fallback: 1 });
  const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 20 });

  const filter = {};
  if (req.query.role && ['user', 'admin'].includes(req.query.role)) {
    filter.role = req.query.role;
  }
  if (req.query.search) {
    const regex = new RegExp(req.query.search, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(USER_LIST_FIELDS)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: users,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(USER_LIST_FIELDS);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({ success: true, data: user });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot change your own role');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User role updated to "${role}"`,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    },
  });
});

const toggleBlockUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot block your own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.isBlocked = typeof req.body.isBlocked === 'boolean' ? req.body.isBlocked : !user.isBlocked;
  await user.save();

  res.status(200).json({
    success: true,
    message: user.isBlocked ? 'User has been blocked' : 'User has been unblocked',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await user.deleteOne();

  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

const getAllSellers = asyncHandler(async (req, res) => {
  const page = clampInt(req.query.page, { min: 1, max: 100000, fallback: 1 });
  const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 20 });

  const filter = {};
  if (req.query.status === 'pending') filter.isApproved = false;
  if (req.query.status === 'approved') filter.isApproved = true;

  const [sellers, total] = await Promise.all([
    Seller.find(filter)
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Seller.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: sellers.length,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    data: sellers,
  });
});

const approveOrRejectSeller = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;

  const seller = await Seller.findById(req.params.id);
  if (!seller) {
    throw new ApiError(404, 'Seller not found');
  }

  seller.isApproved = isApproved;
  await seller.save();

  res.status(200).json({
    success: true,
    message: isApproved ? 'Seller approved' : 'Seller rejected',
    data: seller,
  });
});

module.exports = {
  getStats,
  getRecentOrders,
  getLowStockProducts,
  getDashboard,
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleBlockUser,
  deleteUser,
  getAllSellers,
  approveOrRejectSeller,
};
