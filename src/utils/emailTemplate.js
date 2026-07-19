const BRAND_NAME = process.env.EMAIL_FROM_NAME || 'Our Store';
const BRAND_COLOR = '#2563eb';
const renderShell = ({ preheader = '', title, bodyHtml }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_COLOR}; padding:24px 32px;">
                <h1 style="margin:0; color:#ffffff; font-size:20px;">${BRAND_NAME}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
                <p style="margin:0; font-size:12px; color:#9ca3af; text-align:center;">
                  &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const button = ({ href, label }) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${BRAND_COLOR}; border-radius:6px;">
        <a href="${href}" style="display:inline-block; padding:12px 24px; font-size:14px; color:#ffffff; text-decoration:none; font-weight:bold;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

const orderItemsTable = (orderItems = []) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:16px 0;">
    <thead>
      <tr>
        <td style="padding:8px 0; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280; text-transform:uppercase;">Item</td>
        <td style="padding:8px 0; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280; text-transform:uppercase;" align="center">Qty</td>
        <td style="padding:8px 0; border-bottom:2px solid #e5e7eb; font-size:12px; color:#6b7280; text-transform:uppercase;" align="right">Price</td>
      </tr>
    </thead>
    <tbody>
      ${orderItems
        .map(
          (item) => `
        <tr>
          <td style="padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; color:#111827;">${item.name}</td>
          <td style="padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; color:#111827;" align="center">${item.quantity}</td>
          <td style="padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; color:#111827;" align="right">$${Number(
            item.price
          ).toFixed(2)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
`;
const welcomeEmailTemplate = ({ name }) =>
  renderShell({
    title: `Welcome to ${BRAND_NAME}`,
    preheader: `Welcome aboard, ${name}!`,
    bodyHtml: `
      <h2 style="margin-top:0; color:#111827;">Welcome, ${name}! 👋</h2>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        Thanks for creating an account with ${BRAND_NAME}. We're excited to have you with us.
        You can now browse our catalog, save items to your wishlist, and check out whenever you're ready.
      </p>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        If you didn't create this account, please ignore this email or contact our support team.
      </p>
    `,
  });
const orderConfirmationTemplate = ({ name, order }) =>
  renderShell({
    title: 'Order Confirmation',
    preheader: `Your order #${String(order._id).slice(-8)} has been placed`,
    bodyHtml: `
      <h2 style="margin-top:0; color:#111827;">Thanks for your order, ${name}!</h2>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        We've received your order <strong>#${String(order._id).slice(-8)}</strong> and it's being prepared.
        Here's a summary:
      </p>
      ${orderItemsTable(order.orderItems)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-top:8px; font-size:15px; font-weight:bold; color:#111827;" align="right">
            Total: $${Number(order.totalPrice).toFixed(2)}
          </td>
        </tr>
      </table>
      <p style="font-size:14px; color:#374151; line-height:1.6; margin-top:16px;">
        Payment method: <strong>${order.paymentMethod}</strong><br/>
        We'll email you again as soon as your order ships.
      </p>
    `,
  });
const passwordResetTemplate = ({ name, resetUrl, expiresInMinutes = 30 }) =>
  renderShell({
    title: 'Reset Your Password',
    preheader: 'Reset your password',
    bodyHtml: `
      <h2 style="margin-top:0; color:#111827;">Password reset request</h2>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.
        This link will expire in ${expiresInMinutes} minutes.
      </p>
      ${button({ href: resetUrl, label: 'Reset Password' })}
      <p style="font-size:12px; color:#9ca3af; line-height:1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color:${BRAND_COLOR};">${resetUrl}</a>
      </p>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        If you didn't request this, you can safely ignore this email — your password will remain unchanged.
      </p>
    `,
  });
const orderStatusUpdateTemplate = ({ name, order }) =>
  renderShell({
    title: 'Order Status Update',
    preheader: `Your order #${String(order._id).slice(-8)} is now ${order.orderStatus}`,
    bodyHtml: `
      <h2 style="margin-top:0; color:#111827;">Your order status has changed</h2>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        Hi ${name}, your order <strong>#${String(order._id).slice(-8)}</strong> is now:
      </p>
      <p style="font-size:18px; font-weight:bold; color:${BRAND_COLOR}; margin:8px 0 20px;">
        ${order.orderStatus}
      </p>
      ${orderItemsTable(order.orderItems)}
      <p style="font-size:14px; color:#374151; line-height:1.6; margin-top:16px;">
        You can track this order any time from your account's order history.
      </p>
    `,
  });
const orderDeliveredTemplate = ({ name, order }) =>
  renderShell({
    title: 'Order Delivered',
    preheader: `Your order #${String(order._id).slice(-8)} has been delivered`,
    bodyHtml: `
      <h2 style="margin-top:0; color:#111827;">Your order has arrived! 📦</h2>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        Hi ${name}, order <strong>#${String(order._id).slice(-8)}</strong> was marked as delivered on
        ${new Date(order.deliveredAt || Date.now()).toLocaleDateString()}. We hope you love it!
      </p>
      ${orderItemsTable(order.orderItems)}
      <p style="font-size:14px; color:#374151; line-height:1.6; margin-top:16px;">
        Had an issue with your order? Reach out to our support team and we'll help sort it out.
      </p>
    `,
  });
const magicLinkTemplate = ({ name, loginUrl, expiresInMinutes = 15 }) =>
  renderShell({
    title: 'Your Login Link',
    preheader: 'Log in without a password',
    bodyHtml: `
      <h2 style="margin-top:0; color:#111827;">Log in to your account</h2>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        Hi ${name}, click the button below to log in instantly. This link will expire in
        ${expiresInMinutes} minutes and can only be used once.
      </p>
      ${button({ href: loginUrl, label: 'Log In' })}
      <p style="font-size:12px; color:#9ca3af; line-height:1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${loginUrl}" style="color:${BRAND_COLOR};">${loginUrl}</a>
      </p>
      <p style="font-size:14px; color:#374151; line-height:1.6;">
        If you didn't request this, you can safely ignore this email — no one can log in without clicking this link.
      </p>
    `,
  });
module.exports = {
  welcomeEmailTemplate,
  orderConfirmationTemplate,
  passwordResetTemplate,
  orderStatusUpdateTemplate,
  orderDeliveredTemplate,
  magicLinkTemplate,
};
