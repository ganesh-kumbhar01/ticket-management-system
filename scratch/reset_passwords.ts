import 'dotenv/config';
import { prisma } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const password = await bcrypt.hash('password123', 10);
  await prisma.user.updateMany({
    data: { passwordHash: password }
  });
  console.log('All passwords reset to: password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
