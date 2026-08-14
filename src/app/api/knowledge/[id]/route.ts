import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const updateKbSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const article: any[] = await prisma.$queryRaw`
      SELECT id, title, content, "createdAt", "updatedAt"
      FROM "KnowledgeArticle"
      WHERE id = ${resolvedParams.id}
      LIMIT 1
    `;

    if (!article || article.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article: article[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateKbSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { title, content } = parsed.data;
    const id = resolvedParams.id;

    // 1. Generate updated Embedding using Gemini
    let embeddingStr = '';
    try {
      if (process.env.GEMINI_API_KEY) {
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: `Title: ${title}\n\nContent: ${content}`
        });
        const embedding = response.embeddings?.[0]?.values;
        if (embedding) {
          embeddingStr = `[${embedding.join(',')}]`;
        }
      }
    } catch (e: any) {
      console.warn('Failed to update embedding with Gemini:', e);
    }

    // 2. Update in Postgres
    if (embeddingStr) {
      await prisma.$executeRaw`
        UPDATE "KnowledgeArticle"
        SET title = ${title}, content = ${content}, embedding = ${embeddingStr}::vector, "updatedAt" = NOW()
        WHERE id = ${id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "KnowledgeArticle"
        SET title = ${title}, content = ${content}, "updatedAt" = NOW()
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ message: 'Knowledge article updated successfully' });
  } catch (error: any) {
    console.error('PUT /api/knowledge/[id] error:', error);
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
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = resolvedParams.id;

    await prisma.$executeRaw`
      DELETE FROM "KnowledgeArticle"
      WHERE id = ${id}
    `;

    return NextResponse.json({ message: 'Knowledge article deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/knowledge/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
