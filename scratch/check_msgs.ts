import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const msgs = await prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { ticket: true } });
  console.log(JSON.stringify(msgs, null, 2));
}
main().finally(() => prisma.$disconnect());
