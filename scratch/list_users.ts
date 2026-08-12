import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, name: true }
  });
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
