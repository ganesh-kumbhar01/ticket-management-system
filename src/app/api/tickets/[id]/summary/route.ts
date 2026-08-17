import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const conversationHistory = ticket.messages.map(m => {
      return `[${m.senderType} - ${new Date(m.createdAt).toLocaleTimeString()}]: ${m.content}`;
    }).join('\n');

    const prompt = `
    You are an AI Ticket Assistant. Summarize this customer support ticket thread concisely.
    
    Ticket Subject: ${ticket.subject}
    Customer: ${ticket.studentEmail}
    Category: ${ticket.category}
    Status: ${ticket.status}

    --- CONVERSATION ---
    ${conversationHistory}
    --------------------

    Provide:
    1. A 1-2 sentence core summary of the problem.
    2. Key facts (e.g. error codes, transaction IDs, browser).
    3. Current action items or what needs to happen next.
    `;

    const summary = await generateGeminiContent(prompt, {
      systemInstruction: 'You are an executive summary generator for customer tickets.',
      temperature: 0.2,
    });

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error: any) {
    console.error('Summary API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
