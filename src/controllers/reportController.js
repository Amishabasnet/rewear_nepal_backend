const Report = require('../models/reportModel');
const Product = require('../models/productModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const notifyAdminsNewReport = async (report, product) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user: admin._id,
          title: 'Product Reported',
          message: `"${product.name}" was reported for ${report.reason.replace(/_/g, ' ')}.`,
          type: 'general',
        }).catch((err) =>
          console.error(`Failed to notify admin ${admin._id} of new report: ${err.message}`)
        )
      )
    );
  } catch (err) {
    console.error(`Failed to notify admins of new report: ${err.message}`);
  }
};

const createReport = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { reason, details } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const existingPendingReport = await Report.findOne({
    reporter: req.user._id,
    product: productId,
    status: 'pending',
  });
  if (existingPendingReport) {
    throw new ApiError(400, 'You already have a pending report for this product');
  }

  const report = await Report.create({
    reporter: req.user._id,
    product: productId,
    reason,
    details,
  });

  await notifyAdminsNewReport(report, product);

  res.status(201).json({
    success: true,
    message: 'Thanks — our team will review this listing.',
    data: report,
  });
});

const getAllReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const reports = await Report.find(filter)
    .populate('product', 'name images price isActive')
    .populate('reporter', 'name email')
    .populate('resolvedBy', 'name')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: reports.length, data: reports });
});

const resolveReport = asyncHandler(async (req, res) => {
  const { action } = req.body;

  const report = await Report.findById(req.params.id).populate('product');
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  if (report.status !== 'pending') {
    throw new ApiError(400, `This report has already been ${report.status}`);
  }

  if (action === 'remove_product') {
    if (report.product) {
      report.product.isActive = false;
      await report.product.save();
    }
    report.status = 'actioned';
    // Also mark any other pending reports for the same product as actioned,
    // since the underlying listing has now been taken down.
    await Report.updateMany(
      { product: report.product?._id, status: 'pending', _id: { $ne: report._id } },
      { status: 'actioned', resolvedBy: req.user._id, resolvedAt: Date.now() }
    );
  } else {
    report.status = 'dismissed';
  }

  report.resolvedBy = req.user._id;
  report.resolvedAt = Date.now();
  await report.save();

  res.status(200).json({ success: true, data: report });
});

module.exports = {
  createReport,
  getAllReports,
  resolveReport,
};
