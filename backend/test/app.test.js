import dotenv from 'dotenv';
import test from 'node:test';
import assert from 'node:assert/strict';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public';
}

const { createApp, resolveCorsOrigin } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');

async function withServer(run) {
  const server = createApp().listen(0);
  try {
    const { port } = server.address();
    await run(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('malformed JSON returns a generic client error and a request id', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad'
    });
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.error.code, 'INVALID_JSON');
    assert.equal(payload.error.message, 'Request body must be valid JSON.');
    assert.equal(typeof payload.error.traceId, 'string');
    assert.equal(response.headers.get('x-request-id'), payload.error.traceId);
    assert.equal(JSON.stringify(payload).includes('Expected property'), false);
    assert.equal(JSON.stringify(payload).includes('{bad'), false);
  });
});

test('an unexpected server failure stays generic and keeps the trace id', async () => {
  const original = prisma.product.findMany;
  prisma.product.findMany = async () => {
    throw new Error('database password secret-do-not-leak');
  };
  try {
    await withServer(async (port) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/products`);
      const payload = await response.json();
      assert.equal(response.status, 500);
      assert.equal(payload.error.code, 'INTERNAL_ERROR');
      assert.equal(payload.error.message, 'The server could not complete the request.');
      assert.equal(response.headers.get('x-request-id'), payload.error.traceId);
      assert.equal(JSON.stringify(payload).includes('secret-do-not-leak'), false);
    });
  } finally {
    prisma.product.findMany = original;
  }
});

test('health reports ok only after the database answers', async () => {
  let calls = 0;
  const original = prisma.$queryRaw;
  prisma.$queryRaw = async () => {
    calls += 1;
    return [{ ok: 1 }];
  };
  try {
    await withServer(async (port) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      const payload = await response.json();
      assert.equal(response.status, 200);
      assert.deepEqual(payload, { status: 'ok' });
      assert.equal(calls, 1);
    });
  } finally {
    prisma.$queryRaw = original;
  }
});

test('health stays generic when the database check fails', async () => {
  const original = prisma.$queryRaw;
  prisma.$queryRaw = async () => {
    throw new Error('postgresql://shopsmart_user:secret-do-not-leak@localhost:5432/shopsmart');
  };
  try {
    await withServer(async (port) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      const payload = await response.json();
      assert.equal(response.status, 503);
      assert.deepEqual(payload, { status: 'unavailable' });
      assert.equal(JSON.stringify(payload).includes('secret-do-not-leak'), false);
      assert.equal(JSON.stringify(payload).includes('postgresql://'), false);
    });
  } finally {
    prisma.$queryRaw = original;
  }
});

test('cors allows the local frontend and rejects a missing production origin or a wildcard', () => {
  assert.equal(resolveCorsOrigin({}), 'http://localhost:5173');
  assert.equal(resolveCorsOrigin({ FRONTEND_URL: ' https://shop.example ' }), 'https://shop.example');
  assert.throws(() => resolveCorsOrigin({ NODE_ENV: 'production' }), /FRONTEND_URL must be set/);
  assert.throws(() => resolveCorsOrigin({ FRONTEND_URL: '*' }), /one site origin/);
});
