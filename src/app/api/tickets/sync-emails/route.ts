import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { ImapFlow } from 'imapflow';
import { processEmailSource } from '@/lib/emailParser';
import { prisma } from '@/lib/db';
import { checkAndEscalateSlaBreaches } from '@/lib/slaService';

export async function POST(req: Request) {
  try {
    // Verify user is an agent/admin
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'AGENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imapUser = process.env.IMAP_USER;
    const imapPass = process.env.IMAP_PASS;

    if (!imapUser || !imapPass) {
      return NextResponse.json({ error: 'IMAP credentials not configured.' }, { status: 500 });
    }

    const client = new ImapFlow({
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      secure: true,
      auth: {
        user: imapUser,
        pass: imapPass,
      },
      logger: false,
    });
    
    await client.connect();
    let processedCount = 0;
    
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search for recent emails (last 3 days)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const searchResult = await client.search({ since: threeDaysAgo });
      
      if (searchResult && searchResult.length > 0) {
        for (const seq of searchResult) {
          try {
            // First fetch only envelope to check messageId
            const msgInfo = await client.fetchOne(seq, { envelope: true });
            const emailMessageId = msgInfo && typeof msgInfo !== 'boolean' ? msgInfo.envelope?.messageId : undefined;
            
            if (emailMessageId) {
              const existingMessage = await prisma.message.findUnique({
                where: { emailMessageId },
                select: { id: true },
              });
              const existingProcessed = await prisma.processedEmail.findUnique({
                where: { emailMessageId },
                select: { id: true },
              });

              // If new, fetch full source and create ticket
              if (!existingMessage && !existingProcessed) {
                const fullMsg = await client.fetchOne(seq, { source: true });
                if (fullMsg && fullMsg.source) {
                  const processed = await processEmailSource(fullMsg.source);
                  if (processed) {
                    processedCount++;
                  }
                }
              }
            }
          } catch (itemErr) {
            console.error(`Error processing email seq ${seq}:`, itemErr);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // Trigger SLA breach check in background
    checkAndEscalateSlaBreaches().catch((err) => console.error('SLA background check error:', err));

    return NextResponse.json({ success: true, processedCount });
  } catch (err: any) {
    console.error('Error syncing emails:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
