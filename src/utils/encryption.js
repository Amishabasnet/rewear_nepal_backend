const crypto = require('crypto');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const FORMAT_VERSION = 'v1';
let cachedKey = null;
const getKey = () => {
  if (cachedKey) return cachedKey;

  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set — required to encrypt/decrypt sensitive fields'
    );
  }

  cachedKey = crypto.createHash('sha256').update(secret).digest();
  return cachedKey;
};
const encrypt = (plainText) => {
  if (plainText === undefined || plainText === null || plainText === '') {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [FORMAT_VERSION, iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':'
  );
};
const decrypt = (cipherText) => {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith(`${FORMAT_VERSION}:`)) {
    return cipherText;
  }

  const parts = cipherText.split(':');
  if (parts.length !== 4) return cipherText;

  const [, ivB64, tagB64, dataB64] = parts;

  try {
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error(`Failed to decrypt field: ${err.message}`);
    return null;
  }
};

module.exports = { encrypt, decrypt };
