import { ImapFlow } from 'imapflow';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: true,
    auth: {
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '',
    },
    logger: false as any
  });

  await client.connect();
  console.log('Connected to IMAP');
  let lock = await client.getMailboxLock('INBOX');
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    console.log('Searching since:', twoDaysAgo);
    const searchResult = await client.search({ since: twoDaysAgo });
    console.log(`Found ${searchResult.length} emails since 2 days ago`);
    
    for (const seq of searchResult.slice(-5)) {
      const msgInfo = await client.fetchOne(seq, { envelope: true });
      const emailMessageId = msgInfo && typeof msgInfo !== 'boolean' ? msgInfo.envelope?.messageId : undefined;
      const subject = msgInfo && typeof msgInfo !== 'boolean' ? msgInfo.envelope?.subject : undefined;
      console.log(`[Seq ${seq}] MessageID: ${emailMessageId} | Subject: ${subject}`);
    }
  } finally {
    lock.release();
    await client.logout();
  }
}
main().catch(console.error);
