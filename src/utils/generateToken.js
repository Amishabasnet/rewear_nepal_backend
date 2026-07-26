const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const hashUserAgent = (userAgent) =>
  crypto.createHash('sha256').update(userAgent || 'unknown').digest('hex').slice(0, 16);

// Admin accounts are signed with a separate secret (JWT_ADMIN_SECRET) from
// regular users (JWT_SECRET). This means leaking one secret alone doesn't
// let an attacker forge tokens for the other role -- both would be needed.
// The role is read from the token's own (unverified) payload to pick which
// secret to check the signature against; if someone tampers with the
// payload to claim role:"admin" without knowing JWT_ADMIN_SECRET, signature
// verification fails, because it wasn't signed with that secret.
const getSecretForRole = (role) =>
  role === 'admin' ? process.env.JWT_ADMIN_SECRET : process.env.JWT_SECRET;

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

const generateAccessToken = (user, req) => {
  const payload = {
    id: user._id,
    tv: user.tokenVersion || 0,
    role: user.role,
  };

  if (process.env.BIND_SESSION_TO_USER_AGENT === 'true' && req) {
    payload.ua = hashUserAgent(req.headers['user-agent']);
  }

  return jwt.sign(payload, getSecretForRole(user.role), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

const accessCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: '/',
});

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  // Scoped narrowly to /api/auth -- the only routes that ever need it --
  // instead of every request, so it isn't sent (and isn't exposed) on
  // ordinary API calls.
  path: '/api/auth',
});

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

const setAuthCookies = (res, accessToken, refreshToken) => {
  const refreshDays = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30;

  res.cookie('token', accessToken, {
    ...accessCookieOptions(),
    expires: new Date(Date.now() + ACCESS_TOKEN_MAX_AGE_MS),
  });
  res.cookie('refreshToken', refreshToken, {
    ...refreshCookieOptions(),
    expires: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
  });
};

const clearAuthCookies = (res) => {
  res.cookie('token', 'none', { ...accessCookieOptions(), expires: new Date(Date.now() + 1000) });
  res.cookie('refreshToken', 'none', {
    ...refreshCookieOptions(),
    expires: new Date(Date.now() + 1000),
  });
};

// Issues a fresh access token + a fresh (rotated) refresh token, sets both
// as httpOnly cookies, and responds with the public user profile. Used by
// register, login (non-MFA), the MFA challenge, and the refresh endpoint.
const sendTokenResponse = async (user, statusCode, res, req) => {
  const { issueRefreshToken } = require('./refreshTokenService');

  const accessToken = generateAccessToken(user, req);
  const refreshToken = await issueRefreshToken(user, req);

  setAuthCookies(res, accessToken, refreshToken);

  res.status(statusCode).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    },
  });
};

module.exports = {
  generateAccessToken,
  getSecretForRole,
  hashUserAgent,
  setAuthCookies,
  clearAuthCookies,
  sendTokenResponse,
};
