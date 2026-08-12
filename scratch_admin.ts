import 'dotenv/config';
import { prisma } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'superadmin@example.com';
  const password = 'AdminPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
      role: 'ADMIN',
      name: 'Super Admin'
    },
    create: {
      email,
      passwordHash: hashedPassword,
      role: 'ADMIN',
      name: 'Super Admin',
      status: 'ACTIVE'
    }
  });

  console.log('Admin user created successfully:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
