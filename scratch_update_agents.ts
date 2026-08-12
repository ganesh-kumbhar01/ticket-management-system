import 'dotenv/config';
import { prisma } from './src/lib/db';

async function main() {
    await prisma.user.update({
      where: { id: '83026b4b-c2aa-41c6-ad3a-1cc8ce8ff4ef' },
      data: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      }
    });
    console.log('Updated Agent B to Jane Smith (jane.smith@example.com)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
