const AuditLog = require('../models/auditLogModel');
const { sendSecurityAlert } = require('./securityAlertService');

const ALERT_EVENTS = {
  ACCOUNT_LOCKED: 'high',
  LOGIN_ATTEMPT_ON_LOCKED_ACCOUNT: 'high',
  REFRESH_TOKEN_REUSE_DETECTED: 'critical',
  MFA_LOGIN_FAILED: 'medium',
  MFA_DISABLE_FAILED: 'medium',
  ADMIN_USER_ROLE_CHANGED: 'high',
  ADMIN_USER_DELETED: 'high',
};

const logEvent = async (event, { user, req, success = true, metadata } = {}) => {
  try {
    await AuditLog.create({
      event,
      user: user?._id,
      success,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'] || '',
      metadata,
    });
  } catch (err) {
    console.error(`Failed to write audit log for event "${event}": ${err.message}`);
  }

  const severity = ALERT_EVENTS[event];
  if (severity) {
    sendSecurityAlert({ event, user, req, metadata, severity }).catch((err) => {
      console.error(`Security alert dispatch threw for "${event}": ${err.message}`);
    });
  }
};

module.exports = { logEvent };