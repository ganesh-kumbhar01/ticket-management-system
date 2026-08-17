import { NextResponse } from 'next/server';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, tone } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const prompt = `
    You are an expert communication coach and customer service writing specialist.
    Rewrite and polish the following draft response intended for a customer.
    
    Target Tone: ${tone || 'Professional & Empathetic'}
    
    Rules:
    - Keep the core information intact.
    - Improve clarity, grammar, formatting, and professionalism.
    - Do NOT wrap the answer in quotes or markdown intro fluff. Just return the polished text.

    --- DRAFT TEXT ---
    ${text}
    ------------------
    `;

    const polishedText = await generateGeminiContent(prompt, {
      systemInstruction: 'You are a communication polishing specialist.',
      temperature: 0.2,
    });

    return NextResponse.json({ polishedText }, { status: 200 });
  } catch (error: any) {
    console.error('Polish API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
