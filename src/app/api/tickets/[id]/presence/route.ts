import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updatePresence, getPresence, removePresence } from '@/lib/presenceStore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = resolvedParams.id;

    // Fetch user name for high-fidelity collision badges
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true, role: true }
    });

    const displayName = user?.name || user?.email?.split('@')[0] || payload.email?.split('@')[0] || 'Teammate';
    const displayRole = user?.role || payload.role || 'AGENT';

    // Update current user's presence in database + memory
    await updatePresence(ticketId, payload.userId, displayName, displayRole);

    // Get other active users viewing this ticket
    const activeUsers = await getPresence(ticketId, payload.userId);

    return NextResponse.json({ activeUsers }, { status: 200 });
  } catch (error: any) {
    console.error('Presence API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = resolvedParams.id;
    const activeUsers = await getPresence(ticketId, payload.userId);

    return NextResponse.json({ activeUsers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = resolvedParams.id;
    await removePresence(ticketId, payload.userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
