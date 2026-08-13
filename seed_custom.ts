import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = 'postgresql://neondb_owner:npg_Z4zrJBpL1Alj@ep-winter-paper-aye4wlx5.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('Password123!', 10);

  const users = [
    { email: 'superadmin@gmail.com', name: 'Super Admin', role: 'ADMIN' },
    { email: 'onkark@gmail.com', name: 'onkar k', role: 'AGENT' },
    { email: 'abhishek@gmail.com', name: 'Abhishek', role: 'AGENT' },
    { email: 'bhiravk@gmail.com', name: 'Bhairav k', role: 'AGENT' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role as any,
        passwordHash: password
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role as any,
        passwordHash: password,
        status: 'ACTIVE'
      }
    });
    console.log(`Upserted ${u.role}: ${u.name} (${u.email}) with password 'Password123!'`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
