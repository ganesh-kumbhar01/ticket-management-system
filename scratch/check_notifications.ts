import { prisma } from '../src/lib/db';
import 'dotenv/config';

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log(JSON.stringify(notifications, null, 2));
}
main();
