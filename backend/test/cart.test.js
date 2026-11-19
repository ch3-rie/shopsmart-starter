import dotenv from 'dotenv';
import test from 'node:test';
import assert from 'node:assert/strict';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://shopsmart_user:shopsmart_dev@localhost:5432/shopsmart?schema=public';
}

const { cartSchema } = await import('../src/validators/schemas.js');
const { toCartItems } = await import('../src/routes/cart.js');

const product = (overrides = {}) => ({ name: 'Wireless Mouse', price: '650.00', stock: 12, active: true, ...overrides });

test('a valid saved cart passes validation, including an empty cart', () => {
  assert.equal(cartSchema.safeParse({ items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }] }).success, true);
  assert.equal(cartSchema.safeParse({ items: [] }).success, true);
});

test('a saved cart rejects duplicates, zero quantities and missing items', () => {
  assert.equal(cartSchema.safeParse({ items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] }).success, false);
  assert.equal(cartSchema.safeParse({ items: [{ productId: 1, quantity: 0 }] }).success, false);
  assert.equal(cartSchema.safeParse({}).success, false);
});

test('saved cart items use catalog prices and stock, not stored values', () => {
  const items = toCartItems([{ productId: 1, quantity: 3, product: product({ price: '599.50' }) }]);
  assert.deepEqual(items, [{ productId: 1, name: 'Wireless Mouse', price: 599.5, stock: 12, quantity: 3 }]);
});

test('saved cart drops inactive or sold-out products and caps quantity at stock', () => {
  const items = toCartItems([
    { productId: 1, quantity: 15, product: product({ stock: 4 }) },
    { productId: 2, quantity: 1, product: product({ name: 'Old Item', active: false }) },
    { productId: 3, quantity: 1, product: product({ name: 'Sold Out', stock: 0 }) }
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 4);
});
