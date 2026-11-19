import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireCustomer } from '../lib/auth.js';
import { cartSchema } from '../validators/schemas.js';

const router = Router();
// Same per-product limit as an order line (orderSchema).
const MAX_PER_PRODUCT = 20;

// Every cart route belongs to the signed-in customer only.
router.use(requireCustomer);

// Name, price and stock always come from the current catalog. Products that were
// deactivated or sold out are left out, and quantities are capped at the stock.
export function toCartItems(rows) {
  return rows
    .filter((row) => row.product.active && row.product.stock > 0)
    .map((row) => ({
      productId: row.productId,
      name: row.product.name,
      price: Number(row.product.price),
      stock: row.product.stock,
      quantity: Math.min(row.quantity, row.product.stock, MAX_PER_PRODUCT)
    }));
}

async function readCart(customerId) {
  const rows = await prisma.cartItem.findMany({
    where: { customerId },
    include: { product: true },
    orderBy: { id: 'asc' }
  });
  return toCartItems(rows);
}

router.get('/', async (request, response, next) => {
  try {
    response.json({ items: await readCart(request.customer.id) });
  } catch (error) { next(error); }
});

// Replaces the whole saved cart with what the browser sends. Only product IDs and
// quantities are accepted from the browser; unknown or unavailable products are dropped.
router.put('/', async (request, response, next) => {
  try {
    const parsed = cartSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(422).json({ error: { code: 'INVALID_CART', message: 'Check the cart items.', details: parsed.error.flatten() } });
    }

    const productIds = parsed.data.items.map((item) => item.productId);
    const products = productIds.length === 0 ? [] : await prisma.product.findMany({
      where: { id: { in: productIds }, active: true, stock: { gt: 0 } },
      select: { id: true, stock: true }
    });
    const stockById = new Map(products.map((product) => [product.id, product.stock]));
    const rows = parsed.data.items
      .filter((item) => stockById.has(item.productId))
      .map((item) => ({
        customerId: request.customer.id,
        productId: item.productId,
        quantity: Math.min(item.quantity, stockById.get(item.productId), MAX_PER_PRODUCT)
      }));

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { customerId: request.customer.id } }),
      prisma.cartItem.createMany({ data: rows })
    ]);
    return response.json({ items: await readCart(request.customer.id) });
  } catch (error) { return next(error); }
});

export default router;
