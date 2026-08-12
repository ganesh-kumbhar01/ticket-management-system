import { ImapFlow } from 'imapflow';
import { processEmailSource } from '@/lib/emailParser';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

async function start() {
  if (!imapConfig.auth.user || !imapConfig.auth.pass) {
    console.error('IMAP credentials not configured. Please set IMAP_USER and IMAP_PASS.');
    process.exit(1);
  }

  const client = new ImapFlow(imapConfig);

  client.on('error', err => {
    console.error('IMAP connection error:', err);
  });

  try {
    await client.connect();
    console.log('Connected to IMAP server');

    let lock = await client.getMailboxLock('INBOX');
    try {
      console.log('Listening for new emails in INBOX...');
      
      // Listen for new messages
      client.on('exists', async (data) => {
        console.log(`New message arrived. Total messages: ${data.count}`);
        
        // Fetch the newest message
        const message = await client.fetchOne(data.count, { source: true });
        if (message && message.source) {
          await processEmailSource(message.source);
        }
      });

      // Keep the process running
      await new Promise(() => {}); 
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('Failed to connect to IMAP:', err);
    await client.logout();
  }
}

start().catch(err => console.error(err));
