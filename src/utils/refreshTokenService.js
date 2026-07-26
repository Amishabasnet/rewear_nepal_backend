const crypto = require('crypto');
const RefreshToken = require('../models/refreshTokenModel');
const { hashUserAgent } = require('./generateToken');

const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const issueRefreshToken = async (user, req) => {
  const token = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    userAgentHash: req ? hashUserAgent(req.headers['user-agent']) : null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
};

const REUSE_DETECTED = 'REFRESH_TOKEN_REUSE_DETECTED';
const INVALID = 'REFRESH_TOKEN_INVALID';
const EXPIRED = 'REFRESH_TOKEN_EXPIRED';

const rotateRefreshToken = async (presentedToken, req) => {
  const presentedHash = hashToken(presentedToken);
  const record = await RefreshToken.findOne({ tokenHash: presentedHash }).populate('user');

  if (!record || !record.user) {
    const err = new Error(INVALID);
    err.code = INVALID;
    throw err;
  }

  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { user: record.user._id, revokedAt: null },
      { revokedAt: new Date() }
    );
    const err = new Error(REUSE_DETECTED);
    err.code = REUSE_DETECTED;
    err.user = record.user;
    throw err;
  }

  if (record.expiresAt < new Date()) {
    const err = new Error(EXPIRED);
    err.code = EXPIRED;
    throw err;
  }

  const newToken = crypto.randomBytes(48).toString('hex');
  const newHash = hashToken(newToken);

  record.revokedAt = new Date();
  record.replacedByHash = newHash;
  await record.save();

  await RefreshToken.create({
    user: record.user._id,
    tokenHash: newHash,
    userAgentHash: req ? hashUserAgent(req.headers['user-agent']) : null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
  });

  return { newToken, user: record.user };
};

// Single-device logout: revoke just the one refresh token presented.
const revokeRefreshToken = async (presentedToken) => {
  if (!presentedToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(presentedToken) },
    { revokedAt: new Date() }
  );
};

// Logout-everywhere / reuse-detection: revoke every active token for a user.
const revokeAllForUser = async (userId) => {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
};

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  hashToken,
  REUSE_DETECTED,
  INVALID,
  EXPIRED,
};
