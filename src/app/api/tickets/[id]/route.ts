import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateTicketSchema = z.object({
  status: z.enum(['NEW', 'OPEN', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  assignedAgentId: z.string().nullable().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { status, priority, category, assignedAgentId } = parsed.data;
    const id = resolvedParams.id;

    // Fetch old ticket for comparison
    const oldTicket = await prisma.ticket.findUnique({ where: { id } });
    
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
        ...(assignedAgentId !== undefined && { assignedAgentId }),
      }
    });

    // Check what changed and log SYSTEM messages
    if (oldTicket) {
      const messages = [];
      
      if (status && oldTicket.status !== status) {
        messages.push({
          ticketId: id,
          senderType: 'SYSTEM' as const,
          content: `Status changed to ${status} by ${payload.role === 'ADMIN' ? 'Admin' : 'Agent'}`,
        });
      }

      if (assignedAgentId !== undefined && oldTicket.assignedAgentId !== assignedAgentId) {
        let assignMsg = 'Ticket unassigned';
        if (assignedAgentId) {
          if (assignedAgentId === payload.userId) {
            assignMsg = `Ticket claimed by ${payload.email}`;
          } else {
            // We could fetch the agent's email here but let's just keep it simple
            assignMsg = `Ticket assigned to another agent by ${payload.email}`;
          }
        }
        messages.push({
          ticketId: id,
          senderType: 'SYSTEM' as const,
          content: assignMsg,
        });
      }

      if (messages.length > 0) {
        await prisma.message.createMany({ data: messages });
      }
      
      // Create Notification for Admins and Assigned Agent if reassigned
      if (assignedAgentId !== undefined && oldTicket.assignedAgentId !== assignedAgentId) {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
        const notifications = [];
        
        let assignedToEmail = 'Unassigned';
        if (assignedAgentId) {
          const assignedUser = await prisma.user.findUnique({ where: { id: assignedAgentId }, select: { email: true } });
          if (assignedUser) assignedToEmail = assignedUser.email;
        }

        const assignTitle = 'Ticket Reassigned';
        const assignMsg = `Ticket #${id.slice(0,8)} was reassigned to ${assignedToEmail} by ${payload.email}`;
        const link = `/dashboard/tickets/${id}`;

        // Notify admins
        admins.forEach(admin => {
          // Always notify admins for audit purposes and visibility, even if they made the change
          notifications.push({
            userId: admin.id,
            title: assignTitle,
            message: assignMsg,
            type: 'REASSIGNED',
            link,
          });
        });

        // Notify the newly assigned agent (if it's not unassigned, and they aren't the actor, and they aren't an admin we already notified)
        if (assignedAgentId && assignedAgentId !== payload.userId) {
          const isAlreadyAdmin = admins.some(a => a.id === assignedAgentId);
          if (!isAlreadyAdmin) {
            notifications.push({
              userId: assignedAgentId,
              title: 'Ticket Assigned To You',
              message: `You have been assigned Ticket #${id.slice(0,8)}`,
              type: 'REASSIGNED',
              link,
            });
          }
        }

        if (notifications.length > 0) {
          await prisma.notification.createMany({ data: notifications });
        }
      }
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('PUT /api/tickets/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only admins can delete tickets' }, { status: 403 });
    }

    const id = resolvedParams.id;

    // 1. Fetch ticket and messages to track emailMessageIds
    const ticketToDelete = await prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: {
          select: { id: true, emailMessageId: true },
        },
      },
    });

    if (ticketToDelete) {
      const emailIdsToBlock = [
        ticketToDelete.emailMessageId,
        ...ticketToDelete.messages.map((m) => m.emailMessageId),
      ].filter(Boolean) as string[];

      if (emailIdsToBlock.length > 0) {
        await prisma.processedEmail.createMany({
          data: emailIdsToBlock.map((emailMessageId) => ({ emailMessageId })),
          skipDuplicates: true,
        });
      }

      // Delete attachments for these messages
      const msgIds = ticketToDelete.messages.map((m) => m.id);
      if (msgIds.length > 0) {
        await prisma.attachment.deleteMany({
          where: { messageId: { in: msgIds } },
        });
      }

      // Delete messages
      await prisma.message.deleteMany({
        where: { ticketId: id },
      });

      // Delete the ticket
      await prisma.ticket.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
