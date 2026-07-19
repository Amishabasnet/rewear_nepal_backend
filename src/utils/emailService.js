const { getTransporter } = require('../config/email');
const {
  welcomeEmailTemplate,
  orderConfirmationTemplate,
  passwordResetTemplate,
  orderStatusUpdateTemplate,
  orderDeliveredTemplate,
  magicLinkTemplate,
} = require('./emailTemplates');
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to) {
      throw new Error('Missing recipient email address');
    }

    const transporter = getTransporter();
    const fromName = process.env.EMAIL_FROM_NAME || 'Our Store';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    return true;
  } catch (err) {
    console.error(`Failed to send email ("${subject}" to ${to}): ${err.message}`);
    return false;
  }
};
const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: `Welcome to ${process.env.EMAIL_FROM_NAME || 'Our Store'}!`,
    html: welcomeEmailTemplate({ name: user.name }),
  });
};
const sendOrderConfirmationEmail = async (user, order) => {
  return sendEmail({
    to: user.email,
    subject: `Order Confirmed — #${String(order._id).slice(-8)}`,
    html: orderConfirmationTemplate({ name: user.name, order }),
  });
};
const sendPasswordResetEmail = async (user, resetUrl) => {
  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: passwordResetTemplate({ name: user.name, resetUrl }),
  });
};
const sendOrderStatusUpdateEmail = async (user, order) => {
  const isDelivered = order.orderStatus === 'Delivered';

  return sendEmail({
    to: user.email,
    subject: isDelivered
      ? `Your order #${String(order._id).slice(-8)} has been delivered`
      : `Order #${String(order._id).slice(-8)} update: ${order.orderStatus}`,
    html: isDelivered
      ? orderDeliveredTemplate({ name: user.name, order })
      : orderStatusUpdateTemplate({ name: user.name, order }),
  });
};
const sendMagicLinkEmail = async (user, loginUrl) => {
  return sendEmail({
    to: user.email,
    subject: 'Your login link',
    html: magicLinkTemplate({ name: user.name, loginUrl }),
  });
};
module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPasswordResetEmail,
  sendOrderStatusUpdateEmail,
  sendMagicLinkEmail,
};
