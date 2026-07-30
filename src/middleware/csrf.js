const ApiError = require('../utils/ApiError');
const { generateToken, isValidToken, tokensMatch } = require('../utils/csrfService');

const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN';
const CSRF_HEADER_NAME = (process.env.CSRF_HEADER_NAME || 'x-xsrf-token').toLowerCase();
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24h; silently rotated/refreshed as needed
});

const attachCsrfToken = (req, res, next) => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];

  if (!isValidToken(existing)) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
    req.csrfToken = token;
  } else {
    req.csrfToken = existing;
  }

  next();
};

const verifyCsrfToken = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!tokensMatch(cookieToken, headerToken)) {
    return next(
      new ApiError(
        403,
        'Invalid or missing CSRF token. Please refresh the page and try again.',
        null,
        'CSRF_TOKEN_INVALID'
      )
    );
  }

  next();
};

module.exports = {
  attachCsrfToken,
  verifyCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
