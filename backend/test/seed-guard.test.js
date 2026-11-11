import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
const { prisma } = await import('../src/lib/prisma.js');

const backendRoot = fileURLToPath(new URL('..', import.meta.url));

function runSeed(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['prisma/seed.js'], {
      cwd: backendRoot,
      env: { ...process.env, ...env }
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

test('seed refuses to delete data unless confirmation is explicit', async () => {
  const ordersBefore = await prisma.order.count();
  const productsBefore = await prisma.product.count();
  const result = await runSeed({ SHOPSMART_ALLOW_SEED: 'no' });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Refusing to seed/);
  assert.equal(result.stderr.includes('postgresql://'), false);
  assert.equal(await prisma.order.count(), ordersBefore);
  assert.equal(await prisma.product.count(), productsBefore);
  await prisma.$disconnect();
});

test('local migration authoring and production deployment stay separate commands', () => {
  const backend = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const root = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(backend.scripts['db:migrate'], 'prisma migrate dev --name initial_schema');
  assert.equal(backend.scripts['db:migrate:deploy'], 'prisma migrate deploy');
  assert.equal(root.scripts['db:migrate:deploy'], 'npm run db:migrate:deploy --workspace backend');
});
