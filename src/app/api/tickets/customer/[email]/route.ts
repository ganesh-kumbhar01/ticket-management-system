import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    const resolvedParams = await params;
    const email = decodeURIComponent(resolvedParams.email);
    
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
      where: { studentEmail: email },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch customer tickets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
