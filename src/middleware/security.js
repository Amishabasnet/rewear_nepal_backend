const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

// IP allow/block list
const parseIpList = (value) =>
  (value || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

const blockedIps = parseIpList(process.env.BLOCKED_IPS);
const allowedIps = parseIpList(process.env.ALLOWED_IPS);

const ipAccessControl = (req, res, next) => {
  const clientIp = req.ip;

  if (blockedIps.includes(clientIp)) {
    return next(new ApiError(403, 'Access denied from this IP address'));
  }

  if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
    return next(new ApiError(403, 'Access denied from this IP address'));
  }

  next();
};

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_SENSITIVE_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

module.exports = {
  ipAccessControl,
  globalLimiter,
  authLimiter,
  sensitiveActionLimiter,
};