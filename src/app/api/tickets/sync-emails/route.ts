import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { ImapFlow } from 'imapflow';
import { processEmailSource } from '@/lib/emailParser';
import { prisma } from '@/lib/db';

const imapConfig = {
  host: process.env.IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.IMAP_PORT || '993', 10),
  secure: process.env.IMAP_SECURE === 'true' || true,
  auth: {
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASS || '',
  },
  logger: false as const,
};

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

    if (!imapConfig.auth.user || !imapConfig.auth.pass) {
      return NextResponse.json({ error: 'IMAP credentials not configured.' }, { status: 500 });
    }

    const client = new ImapFlow(imapConfig);
    
    await client.connect();
    let processedCount = 0;
    
    let lock = await client.getMailboxLock('INBOX');
    try {
      // Search for recent emails (last 2 days) to avoid missing any that were marked as read by other clients
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const searchResult = await client.search({ since: twoDaysAgo });
      
      if (searchResult && searchResult.length > 0) {
        for (const seq of searchResult) {
          // First fetch only the envelope to get the messageId (very fast)
          const msgInfo = await client.fetchOne(seq, { envelope: true });
          const emailMessageId = msgInfo && typeof msgInfo !== 'boolean' ? msgInfo.envelope?.messageId : undefined;
          
          if (emailMessageId) {
            // Check if we already have it in the DB
            const existingMessage = await prisma.message.findUnique({
              where: { emailMessageId }
            });
            const existingProcessed = await prisma.processedEmail.findUnique({
              where: { emailMessageId }
            });

            // If we don't have it, fetch the full source (which includes heavy attachments)
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
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({ success: true, processedCount });
  } catch (err) {
    console.error('Error syncing emails:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
