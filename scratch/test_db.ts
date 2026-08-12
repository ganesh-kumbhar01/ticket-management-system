import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany();
  console.log(notifications);
  const users = await prisma.user.findMany();
  console.log(users);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
