const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_HISTORY_LIMIT = Number(process.env.PASSWORD_HISTORY_LIMIT) || 5;
const PASSWORD_EXPIRY_DAYS = Number(process.env.PASSWORD_EXPIRY_DAYS ?? 90);
const HAS_LOWERCASE = /[a-z]/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL_CHAR = /[^A-Za-z0-9]/;
const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password1',
    'password123',
    '12345678',
    '123456789',
    'qwerty123',
    'letmein1',
    'welcome123',
    'admin123',
    'iloveyou1',
    'p@ssw0rd',
    'passw0rd',
  ].map((p) => p.toLowerCase())
);
const isStrongPassword = (value) => {
  if (typeof value !== 'string') return false;
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) return false;
  if (!HAS_LOWERCASE.test(value)) return false;
  if (!HAS_UPPERCASE.test(value)) return false;
  if (!HAS_NUMBER.test(value)) return false;
  if (!HAS_SPECIAL_CHAR.test(value)) return false;
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return false;
  return true;
};
const STRONG_PASSWORD_MESSAGE =
  `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and include at least ` +
  'one uppercase letter, one lowercase letter, one number, and one special character';
const calculatePasswordStrength = (password) => {
  const feedback = [];

  if (typeof password !== 'string' || password.length === 0) {
    return { score: 0, label: 'very weak', feedback: ['Password is required'] };
  }

  let score = 0;

  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  else feedback.push(`Use at least ${PASSWORD_MIN_LENGTH} characters`);

  if (password.length >= 12) score += 1;
  else feedback.push('Longer passwords (12+ characters) are significantly harder to crack');

  const varietyCount = [HAS_LOWERCASE, HAS_UPPERCASE, HAS_NUMBER, HAS_SPECIAL_CHAR].filter((re) =>
    re.test(password)
  ).length;
  if (varietyCount >= 3) score += 1;
  if (varietyCount === 4) score += 1;
  if (varietyCount < 4) {
    if (!HAS_UPPERCASE.test(password)) feedback.push('Add an uppercase letter');
    if (!HAS_LOWERCASE.test(password)) feedback.push('Add a lowercase letter');
    if (!HAS_NUMBER.test(password)) feedback.push('Add a number');
    if (!HAS_SPECIAL_CHAR.test(password)) feedback.push('Add a special character');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = 0;
    feedback.unshift('This password is far too common — choose something more unique');
  }

  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating the same character several times in a row');
  }

  score = Math.max(0, Math.min(4, score));
  const labels = ['very weak', 'weak', 'fair', 'strong', 'very strong'];

  return { score, label: labels[score], feedback };
};
module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_HISTORY_LIMIT,
  PASSWORD_EXPIRY_DAYS,
  isStrongPassword,
  STRONG_PASSWORD_MESSAGE,
  calculatePasswordStrength,
};
