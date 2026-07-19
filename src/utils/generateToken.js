const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const hashUserAgent = (userAgent) =>
  crypto.createHash('sha256').update(userAgent || 'unknown').digest('hex').slice(0, 16);
const generateToken = (user, req) => {
  const payload = {
    id: user._id,
    tv: user.tokenVersion || 0,
  };

  if (process.env.BIND_SESSION_TO_USER_AGENT === 'true' && req) {
    payload.ua = hashUserAgent(req.headers['user-agent']);
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};
const sendTokenResponse = (user, statusCode, res, req) => {
  const token = generateToken(user, req);

  const cookieExpireDays = Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 30;
  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
  };
  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    token,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
};
module.exports = { generateToken, sendTokenResponse, hashUserAgent };
