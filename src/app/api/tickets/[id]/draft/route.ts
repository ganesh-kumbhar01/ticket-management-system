import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // 1. Fetch Ticket & Messages
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

    // 2. Fetch all Knowledge Base articles for context
    const articles = await prisma.knowledgeArticle.findMany({
      select: { title: true, content: true },
      take: 5
    });

    const kbContext = articles.length > 0 
      ? articles.map(a => `Title: ${a.title}\nContent: ${a.content}`).join('\n\n')
      : 'No knowledge base articles found.';

    // 3. Format Conversation History
    const conversationHistory = ticket.messages.map(m => {
      return `[${m.senderType}]: ${m.content}`;
    }).join('\n');

    // 4. Construct Prompt
    const prompt = `
    You are an empathetic, professional support agent responding to a customer ticket.
    Ticket Subject: ${ticket.subject}
    Ticket Category: ${ticket.category}
    
    Use the provided Knowledge Base articles to answer their question. If the knowledge base does not contain the answer, provide a polite helpful response tailored to their specific problem.
    
    Do NOT invent facts outside the Knowledge Base.
    Do NOT include placeholders like [Your Name] – just end the message professionally as Support Team.

    --- KNOWLEDGE BASE CONTEXT ---
    ${kbContext}
    ------------------------------

    --- TICKET CONVERSATION HISTORY ---
    ${conversationHistory}
    -----------------------------------

    Draft the reply now:
    `;

    // 5. Generate Reply
    const draftReply = await generateGeminiContent(prompt, {
      systemInstruction: 'You are an empathetic, professional customer support specialist drafting responses.',
      temperature: 0.3,
    });

    return NextResponse.json({ draftReply }, { status: 200 });
  } catch (error: any) {
    console.error('Draft API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
