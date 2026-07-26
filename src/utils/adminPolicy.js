const ADMIN_EMAIL_DOMAIN = '@rewear.np.com';

const isAdminEmail = (email) =>
  typeof email === 'string' && email.trim().toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN);

module.exports = { ADMIN_EMAIL_DOMAIN, isAdminEmail };
