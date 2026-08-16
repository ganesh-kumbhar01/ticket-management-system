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
  let client: ImapFlow | null = null;

  try {
    const imapUser = (process.env.IMAP_USER || 'kumbharganesh929@gmail.com').trim();
    const imapPass = (process.env.IMAP_PASS || 'axusmowxmwvhtozq').replace(/\s+/g, '');

    client = new ImapFlow({
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      secure: true,
      auth: {
        user: imapUser,
        pass: imapPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
      emitLogs: false,
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      let searchResult: number[] = [];
      try {
        const recentDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        const res = await client.search({ since: recentDate });
        if (Array.isArray(res)) {
          searchResult = res;
        }
      } catch (searchErr) {
        console.warn('[IMAP Syncer] Search with date failed, falling back to all messages:', searchErr);
        const res = await client.search({ all: true });
        if (Array.isArray(res)) {
          searchResult = res;
        }
      }

      if (searchResult && searchResult.length > 0) {
        const reversedSeqs = [...searchResult].reverse();

        for (const seq of reversedSeqs) {
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

    try {
      await client.logout();
    } catch (logoutErr) {
      // ignore
    }

    // Trigger SLA breach check in background
    checkAndEscalateSlaBreaches().catch((err) => console.error('[IMAP Syncer] SLA background check error:', err));

    return { success: true, processedCount };
  } catch (error: any) {
    console.error('[IMAP Syncer] Fatal sync error:', error);
    if (client) {
      try {
        await client.logout();
      } catch (e) {
        // ignore
      }
    }
    return { success: false, error: error.message || 'Failed to sync emails', processedCount: 0 };
  } finally {
    isSyncInProgress = false;
  }
}
