const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 5; 

// Sometimes a user's phone clock can be slightly different from the server.
// Allowing a small time window helps prevent valid codes from being rejected.
authenticator.options = { window: 1 };

const APP_NAME = process.env.MFA_ISSUER || 'Rewear Nepal';

// Create a new secret key for the user when they turn on two-factor authentication.
const generateSecret = () => authenticator.generateSecret();

// Generate a QR code so users can simply scan it with an authenticator app
// instead of entering the secret key manually.
const generateQrCodeDataUrl = async (email, secret) => {
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  return QRCode.toDataURL(otpauthUrl);
};

// Verify a 6-digit TOTP code against the user's stored secret.
const verifyToken = (token, secret) => {
  if (!token || !secret) return false;
  try {
    return authenticator.verify({ token: String(token).trim(), secret });
  } catch {
    return false;
  }
};

// Create a set of backup codes that the user can use if they lose access
// to their authenticator application or change devices.
const generateBackupCodes = (count = BACKUP_CODE_COUNT) =>
  Array.from({ length: count }, () => crypto.randomBytes(BACKUP_CODE_BYTES).toString('hex'));

//  Store backup codes as hashes instead of plain text.
// This adds an extra layer of protection if the database is ever exposed.
const hashBackupCode = (code) => crypto.createHash('sha256').update(String(code).trim()).digest('hex');

module.exports = {
  generateSecret,
  generateQrCodeDataUrl,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
};