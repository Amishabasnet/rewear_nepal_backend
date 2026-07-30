const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const hashUserAgent = (userAgent) =>
  crypto.createHash('sha256').update(userAgent || 'unknown').digest('hex').slice(0, 16);

// Resolve which JWT secret signs/verifies a given role's tokens. There is
// only a single JWT_SECRET configured today, but this indirection lets an
// operator add a role-specific override (e.g. JWT_SECRET_ADMIN) later
// without touching every call site that signs or verifies a token.
const getSecretForRole = (role) => {
  const roleKey = `JWT_SECRET_${String(role || '').toUpperCase()}`;
  return process.env[roleKey] || process.env.JWT_SECRET;
};

const MFA_TOKEN_EXPIRES_IN = '5m';

// Short-lived intermediate token issued after a correct password on an
// MFA-enabled account. It only proves "password verified" — it is not a
// session token and grants no API access on its own. verifyMfaChallenge
// exchanges it for a real session once the TOTP/backup code checks out.
const issueMfaToken = (user) =>
  jwt.sign({ id: user._id, purpose: 'mfa' }, getSecretForRole(user.role), {
    expiresIn: MFA_TOKEN_EXPIRES_IN,
  });

const generateToken = (user, req) => {
  const payload = {
    id: user._id,
    tv: user.tokenVersion || 0,
    role: user.role,
  };

  if (process.env.BIND_SESSION_TO_USER_AGENT === 'true' && req) {
    payload.ua = hashUserAgent(req.headers['user-agent']);
  }

  return jwt.sign(payload, getSecretForRole(user.role), {
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
module.exports = { generateToken, sendTokenResponse, hashUserAgent, getSecretForRole, issueMfaToken };