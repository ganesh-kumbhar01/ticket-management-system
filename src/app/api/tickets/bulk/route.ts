import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  ticketIds: z.array(z.string()).min(1, 'At least one ticket ID is required'),
});

export async function DELETE(req: Request) {
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
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { ticketIds } = parsed.data;

    // Verify permissions if needed here (for now we allow agents/admins to delete)

    // Delete associated messages first
    await prisma.message.deleteMany({
      where: { ticketId: { in: ticketIds } },
    });

    // Delete the tickets
    await prisma.ticket.deleteMany({
      where: { id: { in: ticketIds } },
    });

    return NextResponse.json({ success: true, count: ticketIds.length });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete tickets' }, { status: 500 });
  }
}
