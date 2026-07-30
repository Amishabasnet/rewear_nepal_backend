const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    success: {
      type: Boolean,
      default: true,
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);