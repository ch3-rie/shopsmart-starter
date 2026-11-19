import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';
import authRouter from './routes/auth.js';
import cartRouter from './routes/cart.js';
import { loadCustomer } from './lib/auth.js';
import { prisma } from './lib/prisma.js';

export function resolveCorsOrigin(env = process.env) {
  const configured = typeof env.FRONTEND_URL === 'string' ? env.FRONTEND_URL.trim() : '';
  if (configured === '*') throw new Error('FRONTEND_URL must name one site origin.');
  if (configured) return configured;
  if (env.NODE_ENV === 'production') throw new Error('FRONTEND_URL must be set when NODE_ENV is production.');
  return 'http://localhost:5173';
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Behind Nginx on EC2, trust exactly one proxy hop so rate limits use the
  // visitor's address from X-Forwarded-For instead of 127.0.0.1.
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet());
  // credentials: true lets the local dev frontend (port 5173) send the session cookie to port 3000.
  app.use(cors({ origin: resolveCorsOrigin(), credentials: true }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(':method :url :status :response-time ms'));
  app.use('/api', loadCustomer);

  app.get('/api/health', async (request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ status: 'ok' });
    } catch {
      console.error(`[${request.id}] database health check failed`);
      response.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    const traceId = request.id || crypto.randomUUID();
    if (!response.getHeader('X-Request-ID')) response.setHeader('X-Request-ID', traceId);
    console.error(`[${traceId}]`, error);
    if (error?.type === 'entity.parse.failed') {
      return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.', traceId } });
    }
    const status = Number.isInteger(error.status) ? error.status : 500;
    const applicationError = status < 500 && typeof error.code === 'string';
    response.status(status).json({
      error: {
        code: applicationError ? error.code : 'INTERNAL_ERROR',
        message: applicationError ? error.message : 'The server could not complete the request.',
        traceId
      }
    });
  });
  return app;
}
