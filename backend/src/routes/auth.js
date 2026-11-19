import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import {
  SESSION_COOKIE, createSession, deleteSession, readCookie, sessionCookieOptions, verifyPassword
} from '../lib/auth.js';
import { loginSchema } from '../validators/schemas.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Please try again later.' } }
});

const INVALID_LOGIN = { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } };

router.post('/login', loginLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return response.status(401).json(INVALID_LOGIN);

    const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
    const valid = customer ? await verifyPassword(parsed.data.password, customer.passwordHash) : false;
    if (!valid) return response.status(401).json(INVALID_LOGIN);

    const token = await createSession(customer.id);
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return response.json({ customer: { id: customer.id, email: customer.email, name: customer.name } });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (request, response, next) => {
  try {
    await deleteSession(readCookie(request.headers.cookie, SESSION_COOKIE));
    const options = sessionCookieOptions();
    delete options.maxAge;
    response.clearCookie(SESSION_COOKIE, options);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

// Returns { customer: null } for guests so the frontend can check without a 401 in the console.
router.get('/me', (request, response) => response.json({ customer: request.customer }));

export default router;
