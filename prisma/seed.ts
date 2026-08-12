import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding the database...');

  const adminEmail = 'admin@system.com';
  const adminPassword = 'AdminPassword123!';
  const agentEmail = 'agent@system.com';
  const agentPassword = 'AgentPassword123!';

  // Seed Admin
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash: hashedPassword, role: 'ADMIN' }
    });
    console.log(`Created Admin: ${adminEmail}`);
  }

  // Seed Agent
  let agent = await prisma.user.findUnique({ where: { email: agentEmail } });
  if (!agent) {
    const hashedPassword = await bcrypt.hash(agentPassword, 10);
    agent = await prisma.user.create({
      data: { email: agentEmail, passwordHash: hashedPassword, role: 'AGENT' }
    });
    console.log(`Created Agent: ${agentEmail}`);
  }

  // Seed Some Dummy Tickets
  const existingTickets = await prisma.ticket.count();
  if (existingTickets === 0) {
    console.log('Creating dummy tickets...');
    await prisma.ticket.createMany({
      data: [
        { subject: 'Login issue on website', studentEmail: 'student1@test.com', status: 'NEW', priority: 'HIGH' },
        { subject: 'Cannot access my course', studentEmail: 'student2@test.com', status: 'OPEN', priority: 'URGENT', assignedAgentId: agent?.id },
        { subject: 'Payment failed but money deducted', studentEmail: 'student3@test.com', status: 'PENDING_CUSTOMER', priority: 'NORMAL', assignedAgentId: agent?.id },
        { subject: 'How to change password?', studentEmail: 'student4@test.com', status: 'RESOLVED', priority: 'LOW', assignedAgentId: agent?.id },
      ]
    });
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
