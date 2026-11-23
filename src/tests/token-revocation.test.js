import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  NODE_ENV: 'test', TOKEN_ALGORITHM: 'HS256', ACCESS_EXPIRES_IN: '600',
  REFRESH_EXPIRES_IN: '3600', JWT_ACCESS_ADMIN_SECRET: 'test-admin-access',
  JWT_REFRESH_ADMIN_SECRET: 'test-admin-refresh', JWT_ACCESS_USER_SECRET: 'test-user-access',
  JWT_REFRESH_USER_SECRET: 'test-user-refresh',
  ENC_KEY: Buffer.alloc(32, 7).toString('base64'), ALGORITHM: 'aes-256-gcm',
});
const { createToken, verifyToken } = await import('../common/security/jwt.js');
const { TokenType } = await import('../common/enums/tokenType.enum.js');
const { ROLE } = await import('../common/enums/role.enum.js');
const { AUTH_ENUM } = await import('../common/enums/auth.enum.js');
const { authenticate } = await import('../common/middleware/authentication.middleware.js');
const { authorize } = await import('../common/middleware/authorization.middleware.js');
const { rotateToken, logout } = await import('../module/auth/auth.services.js');
const { logoutEnum } = await import('../common/enums/logout.enum.js');
const { userRepo } = await import('../repo/user.repo.js');
const { User } = await import('../database/models/user.model.js');
const { client } = await import('../database/connections/redis.connection.js');
const { revokeToken, isTokenRevoked } = await import('../common/security/token-revocation.js');
const revoked = new Map();
const userId = '507f1f77bcf86cd799439011';
let user;
beforeEach(() => {
  revoked.clear();
  user = { id: userId, _id: userId, role: ROLE.ADMIN, tokenVersion: 0, isVerified: true };
  userRepo.findById = async () => user;
  userRepo.findOne = async () => { throw new Error('Basic must not query users here'); };
  client.exists = async key => revoked.has(key) ? 1 : 0;
  client.set = async (key, value, options) => {
    assert.ok(options.EX > 0);
    if (options.NX && revoked.has(key)) return null;
    revoked.set(key, value);
    return 'OK';
  };
  User.updateOne = async (filter, update) => {
    assert.equal(filter._id, userId);
    user.tokenVersion += update.$inc.tokenVersion;
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };
});
const pair = (role = ROLE.ADMIN, tokenVersion = 0) => createToken({
  role, payload: { tokenVersion }, accessOptions: { subject: userId }, refreshOptions: { subject: userId },
});
const decodeAccess = token => verifyToken({ token, tokenType: TokenType.accessTokenType });
async function auth(token, options = {}) {
  const req = { headers: { authorization: `Bearer ${token}` } };
  const result = { status: 200, next: false };
  const res = { status(n) { result.status = n; return this; }, json(body) { result.body = body; return this; } };
  await authenticate({ tokenType: TokenType.accessTokenType, ...options })(req, res, () => { result.next = true; });
  return { ...result, req };
}

test('token pairs have distinct unique token IDs and retain role/version', () => {
  const first = pair(); const second = pair();
  const access = decodeAccess(first.accessToken);
  const refresh = verifyToken({ token: first.refreshToken, tokenType: TokenType.refreshTokenType });
  assert.notEqual(access.jti, refresh.jti);
  assert.notEqual(access.jti, decodeAccess(second.accessToken).jti);
  assert.equal(access.role, ROLE.ADMIN); assert.equal(access.tokenVersion, 0);
});
test('rotation revokes the old refresh token and preserves admin role/version', async () => {
  const original = pair(ROLE.ADMIN, 4);
  const fresh = await rotateToken(original.refreshToken);
  const old = verifyToken({ token: original.refreshToken, tokenType: TokenType.refreshTokenType });
  assert.equal(await isTokenRevoked({ jti: old.jti }), true);
  assert.equal(decodeAccess(fresh.accessToken).role, ROLE.ADMIN);
  assert.equal(decodeAccess(fresh.accessToken).tokenVersion, 4);
});
test('a refresh token cannot be rotated twice, including concurrent requests', async () => {
  const original = pair();
  const results = await Promise.allSettled([rotateToken(original.refreshToken), rotateToken(original.refreshToken)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
});
test('revoked refresh token is rejected by middleware after rotation', async () => {
  const original = pair(); await rotateToken(original.refreshToken);
  const result = await auth(original.refreshToken, { tokenType: TokenType.refreshTokenType });
  assert.equal(result.status, 401); assert.equal(result.next, false);
});
test('a valid access token authenticates; a missing user gives controlled 401', async () => {
  const original = pair();
  assert.equal((await auth(original.accessToken)).next, true);
  user = null;
  const result = await auth(original.accessToken);
  assert.equal(result.status, 401);
  assert.equal(result.body.message, 'User not found');
});
test('logout ALL invalidates old access and refresh tokens', async () => {
  const original = pair(); await logout({ userId, logoutType: logoutEnum.ALL });
  assert.equal((await auth(original.accessToken)).status, 401);
  assert.equal((await auth(original.refreshToken, { tokenType: TokenType.refreshTokenType })).status, 401);
  assert.equal((await auth(pair(ROLE.ADMIN, 1).accessToken)).next, true);
});
test('DEVICE logout returns an explicit client error and does not revoke all sessions', async () => {
  await assert.rejects(logout({ userId, logoutType: logoutEnum.DEVICE }), error => error.statusCode === 400);
  assert.equal(user.tokenVersion, 0);
});
test('invalid logout mode is a client error', async () => {
  await assert.rejects(logout({ userId, logoutType: 99 }), error => error.statusCode === 400);
});
test('Bearer-only middleware rejects Basic before querying credentials', async () => {
  let queried = false; userRepo.findOne = async () => { queried = true; return null; };
  const req = { headers: { authorization: `Basic ${Buffer.from('test:password').toString('base64')}` } };
  let status; const res = { status(n) { status = n; return this; }, json() {} };
  await authenticate({ tokenType: TokenType.refreshTokenType, allowedSchemes: [AUTH_ENUM.BEARER] })(req, res, () => assert.fail('must reject Basic'));
  assert.equal(status, 401); assert.equal(queried, false);
});
test('admin authorization still permits admin and denies normal users', () => {
  for (const [role, expected] of [[ROLE.ADMIN, 200], [ROLE.USER, 403]]) {
    let status = 200; let passed = false;
    const res = { status(n) { status = n; return this; }, json() {} };
    authorize(ROLE.ADMIN)({ user: { role } }, res, () => { passed = true; });
    assert.equal(status, expected); assert.equal(passed, role === ROLE.ADMIN);
  }
});
test('expired token revocation does not write a Redis key', async () => {
  assert.equal(await revokeToken({ jti: 'expired', exp: Math.floor(Date.now() / 1000) - 1 }), false);
  assert.equal(revoked.size, 0);
});

const { default: app } = await import('../app.js');
async function request(path, token, body, language = 'en') {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'accept-language': language },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  } finally { await new Promise(resolve => server.close(resolve)); }
}
test('HTTP logout ALL returns a translated success and old tokens fail authentication', async () => {
  const original = pair();
  const result = await request('/auth/logout', original.refreshToken, { logoutType: logoutEnum.ALL });
  assert.equal(result.status, 200); assert.equal(result.body.message, 'Logged out successfully');
  assert.equal((await auth(original.accessToken)).status, 401);
});
test('HTTP DEVICE logout is 400, and invalid input is rejected by validation', async () => {
  assert.equal((await request('/auth/logout', pair().refreshToken, { logoutType: logoutEnum.DEVICE })).status, 400);
  const invalid = await request('/auth/logout', pair().refreshToken, { logoutType: 99 });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.errors[0].message, 'Invalid logout type');
});
test('HTTP refresh rotates once then rejects reuse', async () => {
  const original = pair();
  const first = await request('/auth/rotate-token', original.refreshToken, {});
  assert.equal(first.status, 200);
  assert.equal((await request('/auth/rotate-token', original.refreshToken, {})).status, 401);
});
