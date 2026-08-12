import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const prompt = `
    You are an expert customer support agent.
    Your task is to polish and enhance the following drafted response to a customer.
    Make it sound professional, empathetic, and grammatically correct, while preserving the original meaning and intent.
    Do not add extra information or promises that are not in the original draft.
    Output ONLY the polished response.

    --- ORIGINAL DRAFT ---
    ${content}
    `;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt
    });

    const polishedReply = aiResponse.text;

    return NextResponse.json({ polishedReply }, { status: 200 });
  } catch (error: any) {
    console.error('Polish API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
