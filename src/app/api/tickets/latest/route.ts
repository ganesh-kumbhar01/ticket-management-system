import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

// We add force-dynamic to ensure this API is never statically cached
export const dynamic = 'force-dynamic';

export async function GET() {
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

    const latestTicket = await prisma.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        studentEmail: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ ticket: latestTicket }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch latest ticket error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
