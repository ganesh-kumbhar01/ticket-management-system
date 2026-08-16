import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        messages: { select: { id: true, emailMessageId: true } },
      },
    });

    const emailIds = [
      ...tickets.map((t) => t.emailMessageId),
      ...tickets.flatMap((t) => t.messages.map((m) => m.emailMessageId)),
    ].filter(Boolean) as string[];

    if (emailIds.length > 0) {
      await prisma.processedEmail.createMany({
        data: emailIds.map((emailMessageId) => ({ emailMessageId })),
        skipDuplicates: true,
      });
    }

    await prisma.attachment.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.notification.deleteMany({});

    return NextResponse.json({ success: true, message: 'All tickets deleted cleanly' });
  } catch (err: any) {
    console.error('Error clearing tickets:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
