import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (!user.passwordHash.startsWith('$2')) {
      console.log(`Hashing password for user: ${user.email}`);
      const hashedPassword = await bcrypt.hash(user.passwordHash, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
      });
      console.log(`Updated password for ${user.email}`);
    }
  }
  console.log('Password hash check complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
