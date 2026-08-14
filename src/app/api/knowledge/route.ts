import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const createKbSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = createKbSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { title, content } = parsed.data;

    // 1. Generate Embedding using Gemini
    let embeddingStr = '';
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: `Title: ${title}\n\nContent: ${content}`
      });
      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) throw new Error('Failed to generate embedding');
      
      // Format for pgvector: '[0.1, 0.2, ... ]'
      embeddingStr = `[${embedding.join(',')}]`;
    } catch (e: any) {
      console.error('Embedding error:', e);
      return NextResponse.json({ error: 'Failed to generate embedding with Gemini. Ensure GEMINI_API_KEY is correct.' }, { status: 500 });
    }

    // 2. Save to Postgres via Raw Query to support vector type
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeArticle" (id, title, content, embedding, "updatedAt")
      VALUES (gen_random_uuid(), ${title}, ${content}, ${embeddingStr}::vector, NOW())
    `;

    return NextResponse.json({ message: 'Knowledge article created successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Retrieve without the embedding column to save bandwidth
    const articles = await prisma.$queryRaw`
      SELECT id, title, content, "createdAt", "updatedAt"
      FROM "KnowledgeArticle"
      ORDER BY "createdAt" DESC
    `;

    return NextResponse.json({ articles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
