const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');
const {
  PASSWORD_HISTORY_LIMIT,
  PASSWORD_EXPIRY_DAYS,
} = require('../utils/passwordPolicy');

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const ACCOUNT_LOCK_MINUTES = Number(process.env.ACCOUNT_LOCK_MINUTES) || 30;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    passwordHistory: {
      type: [String],
      default: [],
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      set: (value) => (value === undefined || value === null ? value : encrypt(value)),
      get: (value) => (value === undefined || value === null ? value : decrypt(value)),
    },
    profileImage: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
      set: (value) => (value === undefined || value === null ? value : encrypt(value)),
      get: (value) => (value === undefined || value === null ? value : decrypt(value)),
    },
    city: {
      type: String,
      trim: true,
      default: '',
      set: (value) => (value === undefined || value === null ? value : encrypt(value)),
      get: (value) => (value === undefined || value === null ? value : decrypt(value)),
    },
    country: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'seller'],
        message: 'Role must be "user", "admin", or "seller"',
      },
      default: 'user',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    passwordlessToken: {
      type: String,
      select: false,
    },
    passwordlessExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Instance method: compare a plaintext password to the stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isPasswordReused = async function (candidatePlainPassword) {
  if (this.password && (await bcrypt.compare(candidatePlainPassword, this.password))) {
    return true;
  }
  for (const oldHash of this.passwordHistory || []) {
    if (await bcrypt.compare(candidatePlainPassword, oldHash)) {
      return true;
    }
  }
  return false;
};

userSchema.methods.archiveCurrentPassword = function () {
  if (!this.password) return;
  this.passwordHistory = [this.password, ...(this.passwordHistory || [])].slice(
    0,
    PASSWORD_HISTORY_LIMIT
  );
};

userSchema.methods.isPasswordExpired = function () {
  if (!PASSWORD_EXPIRY_DAYS || PASSWORD_EXPIRY_DAYS <= 0) return false;
  if (!this.passwordChangedAt) return false;
  const expiryMs = PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - this.passwordChangedAt.getTime() > expiryMs;
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

userSchema.methods.registerFailedLogin = async function () {
  if (this.isLocked()) return; // already locked, nothing to do

  this.loginAttempts = (this.loginAttempts || 0) + 1;

  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000);
    this.loginAttempts = 0;
  }

  await this.save({ validateBeforeSave: false });
};

userSchema.methods.registerSuccessfulLogin = async function () {
  if (!this.loginAttempts && !this.lockUntil) return;
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save({ validateBeforeSave: false });
};
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

  return resetToken;
};
userSchema.methods.getPasswordlessToken = function () {
  const loginToken = crypto.randomBytes(32).toString('hex');

  this.passwordlessToken = crypto.createHash('sha256').update(loginToken).digest('hex');
  this.passwordlessExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return loginToken;
};

module.exports = mongoose.model('User', userSchema);
