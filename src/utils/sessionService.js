const { sendTokenResponse } = require('./generateToken');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  REUSE_DETECTED,
  INVALID,
  EXPIRED,
} = require('./refreshTokenService');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: REFRESH_COOKIE_PATH,
  expires: new Date(
    Date.now() + (Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30) * 24 * 60 * 60 * 1000
  ),
});

const issueSession = async (user, statusCode, res, req) => {
  const refreshToken = await issueRefreshToken(user, req);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
  sendTokenResponse(user, statusCode, res, req);
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
};

module.exports = {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  getRefreshCookieOptions,
  issueSession,
  clearRefreshCookie,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  REUSE_DETECTED,
  INVALID,
  EXPIRED,
};
