import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { updatePresence, getPresence } from '@/lib/presenceStore';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = resolvedParams.id;

    // Update current user's presence
    updatePresence(ticketId, payload.userId, payload.email);

    // Get other active users
    const activeUsers = getPresence(ticketId, payload.userId);

    return NextResponse.json({ activeUsers }, { status: 200 });
  } catch (error: any) {
    console.error('Presence API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
