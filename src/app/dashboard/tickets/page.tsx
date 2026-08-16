import { prisma } from '@/lib/db';
import TicketClient from './TicketClient';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkAndEscalateSlaBreaches } from '@/lib/slaService';

export default async function TicketsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyJwtToken(token);
  if (!payload) {
    redirect('/login');
  }

  // Trigger background SLA check non-blockingly
  checkAndEscalateSlaBreaches().catch(() => {});

  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return <TicketClient initialTickets={tickets} currentUserId={payload.userId} isAdmin={payload.role === 'ADMIN'} />;
}
