import { NextResponse } from 'next/server';
import { generateAndSendWeeklyReport } from '@/lib/weeklyReportService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await generateAndSendWeeklyReport();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to run weekly report cron' }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
