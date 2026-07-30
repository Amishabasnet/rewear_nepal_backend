const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const CAPTCHA_TOKEN = process.env.TEST_CAPTCHA_TOKEN;

if (!EMAIL || !PASSWORD) {
  console.error('TEST_EMAIL and TEST_PASSWORD are required.');
  process.exit(1);
}

const newJar = () => ({});

const mergeSetCookie = (jar, res) => {
  const raw = res.headers.get('set-cookie') || '';
  // Split on commas that start a new "name=value" pair, not commas inside
  // a single cookie's Expires date.
  const parts = raw.split(/,(?=[^;]+?=)/).filter(Boolean);
  for (const part of parts) {
    const [nameValue] = part.split(';');
    const eq = nameValue.indexOf('=');
    if (eq === -1) continue;
    const name = nameValue.slice(0, eq).trim();
    const value = nameValue.slice(eq + 1).trim();
    jar[name] = value;
  }
  return jar;
};

const cookieHeader = (jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

const request = async (method, url, jar, body) => {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(Object.keys(jar).length ? { Cookie: cookieHeader(jar) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const nextJar = mergeSetCookie({ ...jar }, res);
  let parsedBody = null;
  try {
    parsedBody = await res.json();
  } catch {
    /* non-JSON body, ignore */
  }
  return { status: res.status, jar: nextJar, body: parsedBody };
};

const login = () =>
  request('POST', '/auth/login', newJar(), {
    email: EMAIL,
    password: PASSWORD,
    captchaToken: CAPTCHA_TOKEN,
  });

// --- checks ---

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

async function main() {
  console.log(`Running refresh-token audit against ${BASE_URL}\n`);

  const first = await login();
  check(
    '1. Login returns 200 and sets both token + refreshToken cookies',
    first.status === 200 && !!first.jar.token && !!first.jar.refreshToken,
    `status=${first.status}, cookies=${Object.keys(first.jar).join(',')}`
  );

  const profile = await request('GET', '/auth/profile', first.jar);
  check('2. /auth/profile succeeds with the fresh session', profile.status === 200, `status=${profile.status}`);

  const preRotateRefreshToken = first.jar.refreshToken;
  const rotated = await request('POST', '/auth/refresh', first.jar);
  const postRotateRefreshToken = rotated.jar.refreshToken;
  check(
    '3. /auth/refresh succeeds and issues a new (different) refresh token',
    rotated.status === 200 &&
      !!postRotateRefreshToken &&
      postRotateRefreshToken !== preRotateRefreshToken,
    `status=${rotated.status}`
  );

  const jarWithOldToken = { ...rotated.jar, refreshToken: preRotateRefreshToken };
  const replay = await request('POST', '/auth/refresh', jarWithOldToken);
  check(
    '4. Replaying the pre-rotation refresh token is rejected (reuse detection)',
    replay.status === 401,
    `status=${replay.status}, message=${replay.body?.message}`
  );

  const afterReuse = await request('POST', '/auth/refresh', rotated.jar);
  check(
    '5. After reuse was detected, the legitimately-rotated token is also revoked',
    afterReuse.status === 401,
    `status=${afterReuse.status}`
  );

  const second = await login();
  const loggedOut = await request('POST', '/auth/logout', second.jar);
  check('6a. /auth/logout succeeds', loggedOut.status === 200, `status=${loggedOut.status}`);

  const afterLogout = await request('POST', '/auth/refresh', {
    refreshToken: second.jar.refreshToken,
  });
  check(
    '6b. Refresh token from a logged-out session is rejected',
    afterLogout.status === 401,
    `status=${afterLogout.status}`
  );

  const deviceA = await login();
  const deviceB = await login();
  const logoutAll = await request('POST', '/auth/logout-all-devices', deviceA.jar);
  check('7a. /auth/logout-all-devices succeeds', logoutAll.status === 200, `status=${logoutAll.status}`);

  const deviceARefreshAfter = await request('POST', '/auth/refresh', {
    refreshToken: deviceA.jar.refreshToken,
  });
  const deviceBRefreshAfter = await request('POST', '/auth/refresh', {
    refreshToken: deviceB.jar.refreshToken,
  });
  check(
    '7b. Device A refresh token is dead after logout-all-devices',
    deviceARefreshAfter.status === 401,
    `status=${deviceARefreshAfter.status}`
  );
  check(
    '7c. Device B refresh token is ALSO dead (logout-all really means all)',
    deviceBRefreshAfter.status === 401,
    `status=${deviceBRefreshAfter.status}`
  );

  const noCookie = await request('POST', '/auth/refresh', newJar());
  check(
    '8. /auth/refresh with no refresh token cookie returns 401 (not 500)',
    noCookie.status === 401,
    `status=${noCookie.status}`
  );

  const failures = results.filter((r) => !r.pass).length;

  const lines = [
    '# Refresh Token Audit Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    '',
    `**${results.length - failures}/${results.length} checks passed.**`,
    '',
    '| # | Check | Result | Detail |',
    '|---|---|---|---|',
    ...results.map(
      (r, i) => `| ${i + 1} | ${r.name} | ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.detail || ''} |`
    ),
    '',
  ];

  const outPath = path.join(__dirname, '..', 'REFRESH_TOKEN_AUDIT_REPORT.md');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`\nReport written to ${outPath}`);

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
