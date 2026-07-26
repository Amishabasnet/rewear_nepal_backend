const axios = require('axios');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const verifyCaptcha = async (token, remoteIp) => {
  if (!token || typeof token !== 'string') return false;

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY is not set — refusing to treat any captcha as valid');
    return false;
  }

  try {
    const { data } = await axios.post(
      VERIFY_URL,
      new URLSearchParams({ secret, response: token, ...(remoteIp && { remoteip: remoteIp }) }),
      { timeout: 5000 }
    );
    return data.success === true;
  } catch (err) {
    console.error(`reCAPTCHA verification request failed: ${err.message}`);
    return false;
  }
};

module.exports = { verifyCaptcha };
