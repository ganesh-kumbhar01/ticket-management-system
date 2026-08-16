import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'AGENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = resolvedParams.id;
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // 🔒 ATOMIC CONCURRENCY CHECK:
    // Update ONLY if assignedAgentId is currently NULL.
    // If 2 agents click at the same millisecond, PostgreSQL executes this atomically.
    const result = await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        assignedAgentId: null, // STRICT CONCURRENCY GUARD
      },
      data: {
        assignedAgentId: payload.userId,
        status: 'OPEN',
      },
    });

    // If 0 rows were updated, someone else already claimed it or ticket doesn't exist
    if (result.count === 0) {
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          assignedAgent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!currentTicket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      if (currentTicket.assignedAgentId) {
        const ownerName = currentTicket.assignedAgent?.name || currentTicket.assignedAgent?.email || 'another teammate';
        return NextResponse.json(
          {
            error: 'ALREADY_CLAIMED',
            message: `This ticket was already claimed by ${ownerName}.`,
            assignedAgent: currentTicket.assignedAgent,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: 'Unable to claim ticket' }, { status: 400 });
    }

    // SUCCESS: The user won the atomic claim
    const claimingUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true },
    });

    const displayName = claimingUser?.name || claimingUser?.email || (payload.role === 'ADMIN' ? 'Admin' : 'Agent');

    // Record system activity message
    await prisma.message.create({
      data: {
        ticketId,
        senderType: 'SYSTEM',
        content: `⚡ Ticket claimed by ${displayName}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Ticket claimed successfully!',
        assignedAgentId: payload.userId,
        assignedAgentName: displayName,
        status: 'OPEN',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error claiming ticket:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
