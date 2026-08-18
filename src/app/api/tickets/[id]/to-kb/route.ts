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
    if (!payload || (payload.role !== 'AGENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = resolvedParams.id;

    // 1. Fetch ticket and messages
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.messages.length === 0) {
      return NextResponse.json({ error: 'No messages found in ticket to summarize.' }, { status: 400 });
    }

    // 2. Format thread for Gemini
    const threadText = ticket.messages
      .map((m) => `[${m.senderType}]: ${m.content}`)
      .join('\n\n');

    const prompt = `
You are an expert technical writer and knowledge base manager.
Analyze the following support ticket conversation thread. Extract the core problem reported by the user, and the final solution provided by the agent.
Write a clear, professional Knowledge Base article that can be used to solve this issue in the future.

Thread:
"""
${threadText}
"""

Return ONLY a valid JSON object with the following schema, and no other text or markdown formatting:
{
  "title": "A short, descriptive title for the KB article",
  "content": "The full article content, formatted professionally. Include the 'Problem' and 'Solution' clearly."
}
`;

    // 3. Generate content with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    let generatedText = response.text || '';
    generatedText = generatedText.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();

    let kbData;
    try {
      kbData = JSON.parse(generatedText);
    } catch (e) {
      console.error('Failed to parse AI output as JSON:', generatedText);
      return NextResponse.json({ error: 'Failed to generate a valid KB article format from AI.' }, { status: 500 });
    }

    if (!kbData.title || !kbData.content) {
      return NextResponse.json({ error: 'AI returned incomplete KB data.' }, { status: 500 });
    }

    // 4. Generate Embedding for the new KB article
    let embeddingStr = '';
    try {
      const embedResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: `Title: ${kbData.title}\n\nContent: ${kbData.content}`
      });
      const embedding = embedResponse.embeddings?.[0]?.values;
      if (!embedding) throw new Error('Failed to generate embedding');
      
      // Format for pgvector: '[0.1, 0.2, ... ]'
      embeddingStr = `[${embedding.join(',')}]`;
    } catch (e: any) {
      console.error('Embedding error:', e);
      return NextResponse.json({ error: 'Failed to generate embedding with Gemini.' }, { status: 500 });
    }

    // 5. Save to Postgres via Raw Query
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeArticle" (id, title, content, embedding, "updatedAt")
      VALUES (gen_random_uuid(), ${kbData.title}, ${kbData.content}, ${embeddingStr}::vector, NOW())
    `;

    return NextResponse.json({ success: true, message: 'Knowledge article created successfully', title: kbData.title }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating KB from ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
