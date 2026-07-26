const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/userModel');
const { hashUserAgent, getSecretForRole } = require('../utils/generateToken');

// Reads the role claim (unverified) just to pick which secret to check
// the signature against. Safe: jwt.decode() proves nothing on its own —
// jwt.verify() right after is the actual trust check, and it fails if the
// payload was tampered with to claim a role it wasn't signed for.
const verifyToken = (token) => {
  const unverified = jwt.decode(token);
  if (!unverified || !unverified.role) {
    throw new ApiError(401, 'Not authorized, invalid or expired token');
  }
  try {
    return jwt.verify(token, getSecretForRole(unverified.role));
  } catch {
    throw new ApiError(401, 'Not authorized, invalid or expired token');
  }
};

const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }

  const decoded = verifyToken(token);

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

 // Defense in depth: reject if the token's role no longer matches the
// user's current DB role (e.g. they were demoted after it was issued).
  if (decoded.role !== user.role) {
    throw new ApiError(401, 'Your role has changed. Please log in again.');
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
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (
      user &&
      !user.isBlocked &&
      (decoded.tv || 0) === (user.tokenVersion || 0) &&
      decoded.role === user.role &&
      (process.env.BIND_SESSION_TO_USER_AGENT !== 'true' ||
        !decoded.ua ||
        decoded.ua === hashUserAgent(req.headers['user-agent']))
    ) {
      req.user = user;
    }
  } catch {
    // optional auth: any failure just means "not logged in", not an error
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
