import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ticketId = resolvedParams.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.messages.length === 0) return NextResponse.json({ error: 'No messages to summarize' }, { status: 400 });

    const fullConversation = ticket.messages
      .map(m => `${m.senderType === 'STUDENT' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n\n');

    const prompt = `
    You are an expert customer support analyst.
    Please provide a concise, 2-3 sentence summary of the following customer support ticket conversation.
    Highlight the main issue the customer is facing and the current status of the resolution.

    --- CONVERSATION ---
    ${fullConversation}
    --------------------

    Summary:
    `;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt
    });

    return NextResponse.json({ summary: aiResponse.text }, { status: 200 });
  } catch (error: any) {
    console.error('Summary API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
