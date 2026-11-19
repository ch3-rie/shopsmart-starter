import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { prisma } from './prisma.js';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SESSION_HOURS = 8;

export const SESSION_COOKIE = 'shopsmart_session';

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltText, hashText] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64url');
  const derived = await scrypt(String(password), Buffer.from(saltText, 'base64url'), expected.length);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function readCookie(header, name) {
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

// Secure is on in production so the cookie is only sent over HTTPS.
// Path /api keeps the cookie off static frontend requests.
export function sessionCookieOptions(env = process.env) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api',
    maxAge: SESSION_HOURS * 60 * 60 * 1000
  };
}

export async function createSession(customerId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      customerId,
      expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
    }
  });
  return token;
}

export async function deleteSession(token) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

// Attaches request.customer when a valid, unexpired session cookie is present.
// Requests without a cookie never touch the database here.
export async function loadCustomer(request, _response, next) {
  request.customer = null;
  try {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    if (!token) return next();
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { customer: { select: { id: true, email: true, name: true } } }
    });
    if (session && session.expiresAt > new Date()) request.customer = session.customer;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireCustomer(request, response, next) {
  if (!request.customer) {
    return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } });
  }
  return next();
}
