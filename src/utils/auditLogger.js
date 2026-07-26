const AuditLog = require('../models/auditLogModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

const logEvent = async (event, { user, email, req, success = true, details = {} } = {}) => {
  try {
    await AuditLog.create({
      event,
      user: user?._id || user || null,
      email: email || user?.email || null,
      ip: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      success,
      details,
    });
  } catch (err) {
    console.error(`Failed to write audit log for "${event}": ${err.message}`);
  }
};

const notifyAdminsSecurityAlert = async (title, message, details = {}) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.all(
      admins.map((admin) =>
        Notification.create({
          user: admin._id,
          title,
          message,
          type: 'security_alert',
        }).catch((err) => console.error(`Failed to alert admin ${admin._id}: ${err.message}`))
      )
    );
  } catch (err) {
    console.error(`Failed to send security alert to admins: ${err.message}`);
  }

  await logEvent('SECURITY_ALERT_SENT', { success: false, details: { title, ...details } });
};

module.exports = { logEvent, notifyAdminsSecurityAlert };
