require('dotenv').config();
const { sendSecurityAlert } = require('../src/utils/securityAlertService');

async function main() {
  if (!process.env.SECURITY_ALERT_EMAIL && !process.env.SECURITY_ALERT_WEBHOOK_URL) {
    console.error(
      'Neither SECURITY_ALERT_EMAIL nor SECURITY_ALERT_WEBHOOK_URL is set — nothing to test.'
    );
    process.exit(1);
  }

  console.log('Dispatching a test security alert...');

  await sendSecurityAlert({
    event: 'ACCOUNT_LOCKED',
    user: { _id: 'test-user-id', email: 'test-user@example.com' },
    req: { ip: '127.0.0.1', headers: { 'user-agent': 'securityAlertSmokeTest.js' } },
    metadata: { note: 'This is a smoke test, not a real lockout.' },
    severity: 'high',
  });

  console.log(
    'Done. Check the configured inbox/webhook channel for the alert (email delivery can take a few seconds).'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
