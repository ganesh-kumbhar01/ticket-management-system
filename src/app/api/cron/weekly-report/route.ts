import { NextResponse } from 'next/server';
import { generateAndSendWeeklyReport } from '@/lib/weeklyReportService';

export const dynamic = 'force-dynamic';

const checkCronAuth = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return false;
  }
  return true;
};

export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await generateAndSendWeeklyReport();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to run weekly report cron' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
