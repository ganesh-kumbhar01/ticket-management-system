import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { triggerAiFirstResponse } from '@/lib/aiFirstResponder';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'AGENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = resolvedParams.id;
    const result = await triggerAiFirstResponse(ticketId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to run AI First-Responder' }, { status: 500 });
    }

    return NextResponse.json({ success: true, aiReplyText: result.aiReplyText }, { status: 200 });
  } catch (error: any) {
    console.error('Error running AI First-Responder:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
