const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/userModel');
const { hashUserAgent } = require('../utils/generateToken');
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Not authorized, invalid or expired token');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'Not authorized, user no longer exists');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }

  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
    throw new ApiError(
      401,
      'Your session is no longer valid (password changed or logged out elsewhere). Please log in again.'
    );
  }

  if (process.env.BIND_SESSION_TO_USER_AGENT === 'true') {
    const currentUaHash = hashUserAgent(req.headers['user-agent']);
    if (decoded.ua && decoded.ua !== currentUaHash) {
      throw new ApiError(
        401,
        'This session was issued to a different device or browser. Please log in again.'
      );
    }
  }

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (
      user &&
      !user.isBlocked &&
      (decoded.tv || 0) === (user.tokenVersion || 0) &&
      (process.env.BIND_SESSION_TO_USER_AGENT !== 'true' ||
        !decoded.ua ||
        decoded.ua === hashUserAgent(req.headers['user-agent']))
    ) {
      req.user = user;
    }
  } catch (err) {
  }

  next();
});
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authorized, please log in'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role "${req.user.role}" is not permitted to access this resource`)
      );
    }
    next();
  };
};

module.exports = { protect, optionalAuth, authorize };
