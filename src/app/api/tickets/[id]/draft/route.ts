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

    // 1. Fetch Ticket Context
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.messages.length === 0) return NextResponse.json({ error: 'No messages to analyze' }, { status: 400 });

    // Get the most recent problem description (first message or most recent student message)
    // A simple approach is just joining the last 3 messages.
    const conversationHistory = ticket.messages
      .slice(-3)
      .map(m => `${m.senderType === 'STUDENT' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n');

    // 2. Generate Embedding for the conversation history
    let kbContext = 'No relevant knowledge base articles found.';
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: conversationHistory
      });
      const queryEmbedding = response.embeddings?.[0]?.values;
      if (queryEmbedding) {
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        // 3. Vector Search (RAG)
        // We find the top 3 most similar articles.
        const articles = await prisma.$queryRaw<any[]>`
          SELECT id, title, content, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
          FROM "KnowledgeArticle"
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT 3
        `;

        if (articles.length > 0) {
          kbContext = articles.map(a => `Article: ${a.title}\nContent: ${a.content}`).join('\n\n');
        }
      }
    } catch (err) {
      console.warn('Vector search failed or pgvector not installed, proceeding without KB context.', err);
    }

    // 4. Construct Prompt for LLM

    const prompt = `
    You are an expert customer support agent. Your goal is to draft a polite, helpful, and professional reply to the customer's latest message.
    
    Use the provided Knowledge Base articles to answer their question. If the knowledge base does not contain the answer, provide a polite generic response stating that you are looking into it and will get back to them shortly.
    
    Do NOT invent facts outside the Knowledge Base.
    Do NOT include placeholders like [Your Name] – just end the message professionally.

    --- KNOWLEDGE BASE CONTEXT ---
    ${kbContext}
    ------------------------------

    --- TICKET CONVERSATION HISTORY ---
    ${conversationHistory}
    -----------------------------------

    Draft the reply now:
    `;

    // 5. Generate Reply
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    });

    const draftReply = aiResponse.text;

    return NextResponse.json({ draftReply }, { status: 200 });
  } catch (error: any) {
    console.error('Draft API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
