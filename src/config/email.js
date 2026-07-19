const nodemailer = require('nodemailer');
const createTransporter = () => {
  const baseConfig = process.env.EMAIL_SERVICE
    ? { service: process.env.EMAIL_SERVICE }
    : {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
      };

  return nodemailer.createTransport({
    ...baseConfig,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

module.exports = { getTransporter };
