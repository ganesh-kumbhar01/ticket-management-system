import { NextResponse } from 'next/server';
import { syncInboundEmails } from '@/lib/emailSyncService';

export async function POST(req: Request) {
  try {
    const result = await syncInboundEmails();
    if (!result.success && result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Error in sync-emails API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const result = await syncInboundEmails();
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
