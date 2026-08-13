import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  console.log('Admin user created/updated successfully:');
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
