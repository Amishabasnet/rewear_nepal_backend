const mongoose = require('mongoose');
const { REPORT_REASONS, REPORT_STATUSES } = require('../utils/reportConstants');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    reason: {
      type: String,
      enum: {
        values: REPORT_REASONS,
        message: `reason must be one of: ${REPORT_REASONS.join(', ')}`,
      },
      required: [true, 'Reason is required'],
    },
    details: {
      type: String,
      trim: true,
      maxlength: [500, 'Details cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: REPORT_STATUSES,
        message: `status must be one of: ${REPORT_STATUSES.join(', ')}`,
      },
      default: 'pending',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reportSchema.index({ product: 1, status: 1 });
reportSchema.index({ reporter: 1, product: 1 });

module.exports = mongoose.model('Report', reportSchema);
