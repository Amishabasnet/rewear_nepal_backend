/**
 * RBAC audit script — logs in as a buyer and an admin, then hits each
 * endpoint below as: no auth, buyer, and admin. Flags anything that
 * doesn't match the expected access-control result.
 *
 * Usage:
 *   BASE_URL=http://localhost:5000/api \
 *   BUYER_EMAIL=... BUYER_PASSWORD=... \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   BUYER_CAPTCHA_TOKEN=x ADMIN_CAPTCHA_TOKEN=x \
 *   node scripts/rbacAudit.js
 *
 * Notes:
 * - CAPTCHA token can be any string while RECAPTCHA_SECRET_KEY is still
 *   Google's test key.
 * - Test accounts must NOT have MFA enabled.
 * - Writes RBAC_AUDIT_REPORT.md — paste into your report.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

const ENDPOINTS = [
  // -- Admin-only --
  { method: 'GET', url: '/admin/dashboard', expect: { none: 401, buyer: 403, admin: 200 } },
  { method: 'GET', url: '/admin/users', expect: { none: 401, buyer: 403, admin: 200 } },
  { method: 'GET', url: '/admin/products', expect: { none: 401, buyer: 403, admin: 200 } },
  { method: 'GET', url: '/admin/products/pending', expect: { none: 401, buyer: 403, admin: 200 } },
  { method: 'GET', url: '/admin/audit-logs', expect: { none: 401, buyer: 403, admin: 200 } },
  { method: 'GET', url: '/admin/recent-orders', expect: { none: 401, buyer: 403, admin: 200 } },
  { method: 'GET', url: '/auth/users', expect: { none: 401, buyer: 403, admin: 200 } },

  // -- Any authenticated user (buyer or admin), never anonymous --
  { method: 'GET', url: '/auth/profile', expect: { none: 401, buyer: 200, admin: 200 } },
  { method: 'GET', url: '/cart', expect: { none: 401, buyer: 200, admin: 200 } },
  { method: 'GET', url: '/wishlist', expect: { none: 401, buyer: 200, admin: 200 } },
  { method: 'GET', url: '/addresses', expect: { none: 401, buyer: 200, admin: 200 } },
  { method: 'GET', url: '/orders/my-orders', expect: { none: 401, buyer: 200, admin: 200 } },
  { method: 'POST', url: '/auth/mfa/setup', expect: { none: 401, buyer: 200, admin: 200 } },

  // -- Public --
  { method: 'GET', url: '/products', expect: { none: 200, buyer: 200, admin: 200 } },
  { method: 'GET', url: '/categories', expect: { none: 200, buyer: 200, admin: 200 } },
];

async function login(email, password, captchaToken) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, captchaToken }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const cookieHeader = setCookie
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${body}`);
  }
  return cookieHeader;
}

async function hit(method, url, cookie) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: cookie ? { Cookie: cookie } : {},
  });
  return res.status;
}

async function main() {
  console.log('Logging in as buyer and admin...');
  const buyerCookie = await login(
    process.env.BUYER_EMAIL,
    process.env.BUYER_PASSWORD,
    process.env.BUYER_CAPTCHA_TOKEN
  );
  const adminCookie = await login(
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD,
    process.env.ADMIN_CAPTCHA_TOKEN
  );

  const rows = [];
  let failures = 0;

  for (const ep of ENDPOINTS) {
    const [noneStatus, buyerStatus, adminStatus] = await Promise.all([
      hit(ep.method, ep.url, null),
      hit(ep.method, ep.url, buyerCookie),
      hit(ep.method, ep.url, adminCookie),
    ]);

    const results = { none: noneStatus, buyer: buyerStatus, admin: adminStatus };
    const pass =
      results.none === ep.expect.none &&
      results.buyer === ep.expect.buyer &&
      results.admin === ep.expect.admin;

    if (!pass) failures++;

    rows.push({ ...ep, results, pass });
  }

  const lines = [
    '# RBAC Audit Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    '',
    `**${rows.length - failures}/${rows.length} endpoints passed** their expected access-control matrix.`,
    '',
    '| Method | Endpoint | No Auth (expect) | Buyer (expect) | Admin (expect) | Result |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => {
      const c = (actual, expected) => (actual === expected ? `${actual}` : `**${actual}** (expected ${expected})`);
      return `| ${r.method} | \`${r.url}\` | ${c(r.results.none, r.expect.none)} | ${c(r.results.buyer, r.expect.buyer)} | ${c(r.results.admin, r.expect.admin)} | ${r.pass ? '✅ PASS' : '❌ FAIL'} |`;
    }),
    '',
  ];

  const outPath = path.join(__dirname, '..', 'RBAC_AUDIT_REPORT.md');
  fs.writeFileSync(outPath, lines.join('\n'));

  console.log(lines.join('\n'));
  console.log(`\nReport written to ${outPath}`);

  if (failures > 0) {
    console.error(`\n${failures} endpoint(s) did not match the expected access-control matrix.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
