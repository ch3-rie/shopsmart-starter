import { describe, expect, it } from 'vitest';
import { mergeCarts } from './cart.js';

const mouse = { productId: 1, name: 'Wireless Mouse', price: 650, stock: 12 };
const keyboard = { productId: 2, name: 'Compact Mechanical Keyboard', price: 1850, stock: 8 };

describe('mergeCarts', () => {
  it('restores the saved cart when nothing was added as a guest', () => {
    expect(mergeCarts([{ ...mouse, quantity: 2 }], [])).toEqual([{ ...mouse, quantity: 2 }]);
  });

  it('keeps guest items and adds up matching products', () => {
    const merged = mergeCarts([{ ...mouse, quantity: 2 }], [{ ...mouse, quantity: 1 }, { ...keyboard, quantity: 1 }]);
    expect(merged).toEqual([{ ...mouse, quantity: 3 }, { ...keyboard, quantity: 1 }]);
  });

  it('never goes above the available stock', () => {
    expect(mergeCarts([{ ...keyboard, quantity: 6 }], [{ ...keyboard, quantity: 5 }])[0].quantity).toBe(8);
  });

  it('does not change the carts it was given', () => {
    const saved = [{ ...mouse, quantity: 2 }];
    mergeCarts(saved, [{ ...mouse, quantity: 1 }]);
    expect(saved[0].quantity).toBe(2);
  });
});
