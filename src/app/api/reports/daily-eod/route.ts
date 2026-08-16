import { NextResponse } from 'next/server';
import { generateAndSendDailyReport } from '@/lib/dailyReportService';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'AGENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateAndSendDailyReport();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Failed to trigger daily report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const result = await generateAndSendDailyReport();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
