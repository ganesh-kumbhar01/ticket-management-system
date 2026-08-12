import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  studentEmail: z.string().email('Invalid customer email'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  description: z.string().min(1, 'Description is required'),
});

export async function POST(req: Request) {
  try {
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
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { subject, studentEmail, category, priority, description } = parsed.data;

    // Create the ticket and the initial message in a single transaction
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        studentEmail,
        category,
        priority,
        status: 'NEW',
        messages: {
          create: {
            content: description,
            senderType: payload.role === 'ADMIN' ? 'AGENT' : 'STUDENT', // Defaulting manual entry as if the agent typed it, or we could just use AGENT.
          }
        }
      }
    });

    // Force the senderType to be AGENT for manually created tickets to differentiate from actual incoming emails (if desired)
    // Actually, if an agent is logging a call on behalf of a student, maybe senderType = STUDENT is better?
    // Let's use AGENT so it's clear who created the ticket in the dashboard context.
    await prisma.message.updateMany({
      where: { ticketId: ticket.id },
      data: { senderType: 'AGENT' }
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
