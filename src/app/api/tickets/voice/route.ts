import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert file to Buffer then Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    
    // Default MIME type mapping if browser doesn't provide it
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'mp3') mimeType = 'audio/mp3';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'm4a') mimeType = 'audio/m4a';
        else if (ext === 'webm') mimeType = 'audio/webm';
        else mimeType = 'audio/mp3';
    }

    const prompt = `
    You are an expert Helpdesk Support Assistant. 
    Listen to the following audio recording. It is either a live phone call recording with a customer or a voice memo dictated by an agent summarizing a customer's issue.
    
    Extract the following information from the audio and return ONLY a strict JSON object with these exact keys:
    {
      "subject": "A brief 4-7 word summary of the issue",
      "studentEmail": "The customer's email address if mentioned. If not explicitly mentioned, use 'phone-customer@system.local'",
      "category": "One of: 'Technical', 'Billing', 'General', 'Account'",
      "priority": "One of: 'LOW', 'NORMAL', 'HIGH', 'URGENT' based on urgency",
      "description": "A clear, professional, and detailed written summary of the customer's problem based on the audio."
    }
    
    Return ONLY valid JSON. Do not include markdown blocks like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: prompt }
          ]
        }
      ]
    });

    const aiText = response.text || '';
    // Clean up potential markdown formatting
    const cleanedText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let extractedData;
    try {
      extractedData = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Failed to parse Gemini JSON:", aiText);
      return NextResponse.json({ error: 'Failed to extract structured data from audio.' }, { status: 500 });
    }

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        subject: extractedData.subject || 'Phone Call Support Request',
        studentEmail: extractedData.studentEmail || 'phone-customer@system.local',
        category: extractedData.category || 'General',
        priority: extractedData.priority || 'NORMAL',
        status: 'NEW',
        messages: {
          create: {
            content: `[🎙️ Generated from Audio Recording/Voice Memo]\n\n${extractedData.description || 'No description extracted.'}`,
            senderType: 'AGENT',
          }
        }
      }
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: any) {
    console.error('Audio processing error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process audio' }, { status: 500 });
  }
}
