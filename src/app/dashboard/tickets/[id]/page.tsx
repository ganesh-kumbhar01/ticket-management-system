import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import TicketDetailClient from './TicketDetailClient';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { checkAndEscalateSlaBreaches } from '@/lib/slaService';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyJwtToken(token);
  if (!payload) redirect('/login');

  // Trigger background SLA check non-blockingly
  checkAndEscalateSlaBreaches().catch(() => {});

  const ticket = await prisma.ticket.findUnique({
    where: { id: resolvedParams.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          attachments: true,
        }
      },
      assignedAgent: {
        select: {
          email: true,
        }
      }
    }
  });

  if (!ticket) {
    notFound();
  }

  const agents = await prisma.user.findMany({
    where: { role: { in: ['AGENT', 'ADMIN'] } },
    select: { id: true, email: true }
  });

  return <TicketDetailClient ticket={ticket} agents={agents} currentUserId={payload.userId} isAdmin={payload.role === 'ADMIN'} />;
}
