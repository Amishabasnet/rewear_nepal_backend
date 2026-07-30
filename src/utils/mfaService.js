const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 5; 

// Sometimes a user's phone clock can be slightly different from the server.
// Allowing a small time window helps prevent valid codes from being rejected.
authenticator.options = { window: 1 };

const APP_NAME = process.env.MFA_ISSUER || 'Rewear Nepal';

const generateSecret = () => authenticator.generateSecret();

const generateQrCodeDataUrl = async (email, secret) => {
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  return QRCode.toDataURL(otpauthUrl);
};

const verifyToken = (token, secret) => {
  if (!token || !secret) return false;
  try {
    return authenticator.verify({ token: String(token).trim(), secret });
  } catch {
    return false;
  }
};

const generateBackupCodes = (count = BACKUP_CODE_COUNT) =>
  Array.from({ length: count }, () => crypto.randomBytes(BACKUP_CODE_BYTES).toString('hex'));

const hashBackupCode = (code) => crypto.createHash('sha256').update(String(code).trim()).digest('hex');

module.exports = {
  generateSecret,
  generateQrCodeDataUrl,
  verifyToken,
  generateBackupCodes,
  hashBackupCode,
};