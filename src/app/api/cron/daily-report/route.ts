import { NextResponse } from 'next/server';
import { generateAndSendDailyReport } from '@/lib/dailyReportService';

export async function GET() {
  try {
    const result = await generateAndSendDailyReport();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run daily report cron' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await generateAndSendDailyReport();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run daily report cron' }, { status: 500 });
  }
}
