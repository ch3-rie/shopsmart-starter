// Creates or updates one FICTIONAL classroom customer account.
// Usage (from the backend folder):
//   node scripts/create-customer.js ana.test@example.com "Ana Test" "a-practice-password"
// Use example.com addresses and practice passwords only. Never use a real person's details.
import 'dotenv/config';
import { hashPassword } from '../src/lib/auth.js';
import { prisma } from '../src/lib/prisma.js';

const [rawEmail, name, password] = process.argv.slice(2);

if (!rawEmail || !name || !password || password.length < 8) {
  console.error('Usage: node scripts/create-customer.js <email> "<name>" <password of at least 8 characters>');
  process.exit(1);
}

const email = rawEmail.trim().toLowerCase();
const passwordHash = await hashPassword(password);

try {
  const customer = await prisma.customer.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash }
  });
  console.log(`Customer #${customer.id} is ready: ${customer.email}`);
} finally {
  await prisma.$disconnect();
}
