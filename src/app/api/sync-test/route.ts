import { NextResponse } from 'next/server';
import { syncInboundEmails } from '@/lib/emailSyncService';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  try {
    const syncRes = await syncInboundEmails();
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        subject: true,
        studentEmail: true,
        status: true,
        createdAt: true,
      },
    });

    const totalCount = await prisma.ticket.count();

    return NextResponse.json({
      success: true,
      syncResult: syncRes,
      totalTicketsInDatabase: totalCount,
      recentTickets: tickets,
      envCheck: {
        hasImapUser: Boolean(process.env.IMAP_USER),
        hasImapPass: Boolean(process.env.IMAP_PASS),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || String(err),
      stack: err.stack,
    }, { status: 500 });
  }
}
