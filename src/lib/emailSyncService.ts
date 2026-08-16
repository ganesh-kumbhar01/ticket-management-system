import { ImapFlow } from 'imapflow';
import { processEmailSource } from '@/lib/emailParser';
import { prisma } from '@/lib/db';
import { checkAndEscalateSlaBreaches } from '@/lib/slaService';

let isSyncInProgress = false;

export async function syncInboundEmails() {
  if (isSyncInProgress) {
    return { success: true, message: 'Sync already in progress', processedCount: 0 };
  }

  isSyncInProgress = true;
  let processedCount = 0;

  try {
    const imapUser = (process.env.IMAP_USER || 'kumbharganesh929@gmail.com').trim();
    const imapPass = (process.env.IMAP_PASS || 'axusmowxmwvhtozq').replace(/\s+/g, '');

    if (!imapUser || !imapPass) {
      console.warn('[IMAP Syncer] Missing IMAP credentials.');
      return { success: false, error: 'IMAP credentials not configured.', processedCount: 0 };
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
      emitLogs: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Search for recent emails (last 4 days)
      const recentDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const searchResult = await client.search({ since: recentDate });

      if (searchResult && searchResult.length > 0) {
        for (const seq of searchResult) {
          try {
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
            console.error(`[IMAP Syncer] Error processing email seq ${seq}:`, itemErr);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // Trigger SLA breach check in background
    checkAndEscalateSlaBreaches().catch((err) => console.error('[IMAP Syncer] SLA background check error:', err));

    return { success: true, processedCount };
  } catch (error: any) {
    console.error('[IMAP Syncer] Fatal sync error:', error);
    return { success: false, error: error.message || 'Failed to sync emails', processedCount: 0 };
  } finally {
    isSyncInProgress = false;
  }
}
