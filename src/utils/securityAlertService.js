const axios = require('axios');
const { sendEmail } = require('./emailService');
const { securityAlertTemplate } = require('./emailTemplates');

const ALERT_EMAIL = process.env.SECURITY_ALERT_EMAIL;
const WEBHOOK_URL = process.env.SECURITY_ALERT_WEBHOOK_URL; // Slack incoming-webhook compatible

const THROTTLE_MINUTES = Number(process.env.SECURITY_ALERT_THROTTLE_MINUTES) || 15;

const recentAlerts = new Map(); // `${event}:${identity}` -> last-sent timestamp (ms)

const isThrottled = (key) => {
  const last = recentAlerts.get(key);
  const now = Date.now();
  if (last && now - last < THROTTLE_MINUTES * 60 * 1000) {
    return true;
  }
  recentAlerts.set(key, now);
  return false;
};

const sendWebhookAlert = async (text) => {
  if (!WEBHOOK_URL) return;
  try {
    await axios.post(WEBHOOK_URL, { text }, { timeout: 5000 });
  } catch (err) {
    console.error(`Security alert webhook failed: ${err.message}`);
  }
};

const sendEmailAlert = async ({ event, identity, ip, ua, when, metadata, severity }) => {
  if (!ALERT_EMAIL) return;
  try {
    await sendEmail({
      to: ALERT_EMAIL,
      subject: `🚨 Security alert (${severity}): ${event} — ${identity}`,
      html: securityAlertTemplate({ event, identity, ip, ua, when, metadata, severity }),
    });
  } catch (err) {
    console.error(`Security alert email failed: ${err.message}`);
  }
};

const sendSecurityAlert = async ({ event, user, req, metadata, severity = 'high' }) => {
  if (!ALERT_EMAIL && !WEBHOOK_URL) return;

  const identity = user?.email || metadata?.email || 'unknown user';
  const throttleKey = `${event}:${user?._id || identity}`;
  if (isThrottled(throttleKey)) return;

  const when = new Date().toISOString();
  const ip = req?.ip || 'unknown IP';
  const ua = req?.headers?.['user-agent'] || 'unknown device';

  const text = [
    `🚨 [${severity.toUpperCase()}] ${event}`,
    `User: ${identity}${user?._id ? ` (${user._id})` : ''}`,
    `IP: ${ip}`,
    `Device: ${ua}`,
    `When: ${when}`,
    ...(metadata ? [`Details: ${JSON.stringify(metadata)}`] : []),
  ].join('\n');

  try {
    await Promise.all([
      sendEmailAlert({ event, identity, ip, ua, when, metadata, severity }),
      sendWebhookAlert(text),
    ]);
  } catch (err) {
    console.error(`Failed to dispatch security alert for "${event}": ${err.message}`);
  }
};

module.exports = { sendSecurityAlert };
