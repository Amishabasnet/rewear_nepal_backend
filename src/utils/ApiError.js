class ApiError extends Error {
  constructor(statusCode, message, errors = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors; // optional array of field-level validation errors
    this.code = code; // optional machine-readable code, e.g. "PASSWORD_EXPIRED"
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = ApiError;