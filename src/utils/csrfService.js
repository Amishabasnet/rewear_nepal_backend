const crypto = require('crypto');

// Falls back to JWT_SECRET so the feature works out of the box, but a
// dedicated secret is strongly recommended in production (different blast
// radius than the auth signing key).
const SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET;

if (!process.env.CSRF_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    '[csrf] CSRF_SECRET is not set in .env — falling back to JWT_SECRET. ' +
      'Set a dedicated CSRF_SECRET for production.'
  );
}

const TOKEN_BYTES = 32;

const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('hex');

/**
 * Generates a new CSRF token in the form `<random>.<hmac-signature>`.
 * The signature lets us verify the cookie hasn't been tampered with /
 * forged by an attacker who doesn't know the server secret.
 */
const generateToken = () => {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  return `${raw}.${sign(raw)}`;
};

/**
 * Checks that a token's signature matches its payload (i.e. it was
 * actually issued by this server, not guessed/forged by an attacker).
 */
const isValidToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;

  const [raw, signature] = token.split('.');
  if (!raw || !signature) return false;

  const expected = sign(raw);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

/**
 * Double-submit check: the token from the (JS-readable) cookie must be
 * both valid and byte-for-byte identical to the token the client echoed
 * back in a custom request header. A cross-site attacker can trigger a
 * cookie-carrying request, but can't read the cookie to copy its value
 * into the header (browsers enforce same-origin for that), so a forged
 * request will always be missing/mismatching the header.
 */
const tokensMatch = (cookieToken, headerToken) => {
  if (!cookieToken || !headerToken || typeof headerToken !== 'string') return false;
  if (!isValidToken(cookieToken)) return false;

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) return false;
  return crypto.timingSafeEqual(cookieBuffer, headerBuffer);
};

module.exports = { generateToken, isValidToken, tokensMatch };
