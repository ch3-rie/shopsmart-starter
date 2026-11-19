import dotenv from 'dotenv';
import test from 'node:test';
import assert from 'node:assert/strict';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public';
}

const { hashPassword, verifyPassword, readCookie, sessionCookieOptions } = await import('../src/lib/auth.js');
const { createApp } = await import('../src/app.js');

async function withServer(run) {
  const server = createApp().listen(0);
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}/api`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('a password hash verifies only the original password', async () => {
  const stored = await hashPassword('practice-password-1');
  assert.match(stored, /^scrypt\$/);
  assert.equal(stored.includes('practice-password-1'), false);
  assert.equal(await verifyPassword('practice-password-1', stored), true);
  assert.equal(await verifyPassword('practice-password-2', stored), false);
  assert.equal(await verifyPassword('anything', 'not-a-hash'), false);
});

test('readCookie finds only the named cookie', () => {
  assert.equal(readCookie('a=1; shopsmart_session=abc%2D1; b=2', 'shopsmart_session'), 'abc-1');
  assert.equal(readCookie('other=1', 'shopsmart_session'), null);
  assert.equal(readCookie(undefined, 'shopsmart_session'), null);
});

test('the session cookie is HttpOnly, scoped to /api, and Secure in production', () => {
  assert.equal(sessionCookieOptions({ NODE_ENV: 'production' }).secure, true);
  assert.equal(sessionCookieOptions({ NODE_ENV: 'development' }).secure, false);
  assert.equal(sessionCookieOptions({}).httpOnly, true);
  assert.equal(sessionCookieOptions({}).path, '/api');
});

test('a guest is refused every order route before any database work', async () => {
  await withServer(async (base) => {
    const list = await fetch(`${base}/orders`);
    assert.equal(list.status, 401);
    assert.equal((await list.json()).error.code, 'AUTH_REQUIRED');

    const single = await fetch(`${base}/orders/1`);
    assert.equal(single.status, 401);

    const create = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'Guest Test', email: 'guest@example.com', address: '1 Example Street', items: [{ productId: 1, quantity: 1 }] })
    });
    assert.equal(create.status, 401);
  });
});

test('/api/auth/me reports no customer for a guest', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/auth/me`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { customer: null });
  });
});
