import { NextResponse } from 'next/server';
import { checkAndEscalateSlaBreaches } from '@/lib/slaService';

export async function POST() {
  try {
    const result = await checkAndEscalateSlaBreaches();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run SLA check' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await checkAndEscalateSlaBreaches();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run SLA check' }, { status: 500 });
  }
}
