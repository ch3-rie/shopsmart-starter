import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireCustomer } from '../lib/auth.js';
import { orderSchema } from '../validators/schemas.js';
const router = Router();

function serializeOrder(order) {
  return {
    ...order,
    total: Number(order.total),
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice)
    }))
  };
}

const ORDER_INCLUDE = { items: { include: { product: { select: { name: true } } } } };

// Every order route requires a signed-in customer.
router.use(requireCustomer);

router.post('/', async (request, response, next) => {
  try {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ORDER', message: 'Check the customer and cart information.', details: parsed.error.flatten() } });

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) return response.status(422).json({ error: { code: 'PRODUCT_UNAVAILABLE', message: 'One or more products are unavailable.' } });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = parsed.data.items.map((item) => ({ ...item, product: productMap.get(item.productId) }));
    const unavailable = normalizedItems.find((item) => item.quantity > item.product.stock);
    if (unavailable) return response.status(409).json({ error: { code: 'INSUFFICIENT_STOCK', message: `Only ${unavailable.product.stock} unit(s) of ${unavailable.product.name} are available.` } });

    const total = normalizedItems.reduce((sum, item) => sum.plus(new Prisma.Decimal(item.product.price).times(item.quantity)), new Prisma.Decimal(0));
    const order = await prisma.$transaction(async (transaction) => {
      for (const item of normalizedItems) {
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order.'), { status: 409, code: 'STOCK_CHANGED' });
      }
      // The order now holds these items, so the customer's saved cart is emptied.
      await transaction.cartItem.deleteMany({ where: { customerId: request.customer.id } });
      return transaction.order.create({
        data: {
          customerName: parsed.data.customerName, email: parsed.data.email, address: parsed.data.address, total,
          customerId: request.customer.id,
          items: { create: normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.product.price })) }
        },
        include: ORDER_INCLUDE
      });
    });
    response.status(201).json(serializeOrder(order));
  } catch (error) { next(error); }
});

// The signed-in customer's own orders only.
router.get('/', async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: request.customer.id },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    response.json({ orders: orders.map(serializeOrder) });
  } catch (error) { next(error); }
});

// Ownership is part of the query. Another customer's order and a missing order
// both return 404, so the API does not reveal which order numbers exist.
router.get('/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Order ID must be a positive integer.' } });
    const order = await prisma.order.findFirst({ where: { id, customerId: request.customer.id }, include: ORDER_INCLUDE });
    if (!order) return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order could not be found.' } });
    response.json(serializeOrder(order));
  } catch (error) { next(error); }
});

export default router;
