import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/db';
import { triggerAiFirstResponse } from '@/lib/aiFirstResponder';


async function saveAttachment(attachment: any, messageId: string) {
  // Vercel serverless functions have a read-only filesystem.
  // We convert attachments to Base64 Data URIs and store them directly in PostgreSQL.
  let dataUri = '';
  try {
    const base64Data = attachment.content.toString('base64');
    dataUri = `data:${attachment.contentType || 'application/octet-stream'};base64,${base64Data}`;
  } catch (e) {
    console.error('Failed to convert attachment to base64', e);
    return null;
  }

  return await prisma.attachment.create({
    data: {
      filename: attachment.filename || 'unknown_file',
      url: dataUri,
      mimeType: attachment.contentType,
      size: attachment.size,
      messageId
    }
  });
}

async function determineRouting(subject: string, text: string) {
  const textLower = (subject + ' ' + text).toLowerCase();
  
  if (textLower.match(/\b(billing|invoice|payment|refund|charge|money)\b/)) {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (admin) return { assignedAgentId: admin.id, category: 'Billing' };
  }
  
  if (textLower.match(/\b(bug|error|crash|broken|login|password|app)\b/)) {
    const agent = await prisma.user.findFirst({ where: { role: 'AGENT', status: 'ACTIVE' } });
    if (agent) return { assignedAgentId: agent.id, category: 'Technical' };
  }

  return { assignedAgentId: null, category: 'General' };
}

export async function processEmailSource(source: Buffer): Promise<boolean> {
  try {
    const parsed = await simpleParser(source);
    
    const messageId = parsed.messageId;
    const subject = parsed.subject || 'No Subject';
    const text = parsed.text || '';
    const from = parsed.from?.value[0]?.address;
    const inReplyTo = parsed.inReplyTo;
    const references = typeof parsed.references === 'string' 
      ? [parsed.references] 
      : (parsed.references || []);

    if (!from) {
      console.log('Skipping email with no sender.');
      return false;
    }

    const systemEmails = [
      process.env.IMAP_USER?.toLowerCase(),
      process.env.SMTP_USER?.toLowerCase(),
      'kumbharganesh929@gmail.com' // Hardcoded based on user feedback to guarantee blocking loop
    ].filter(Boolean);

    if (systemEmails.includes(from.toLowerCase())) {
      console.log(`Skipping email sent by system itself to prevent loops: ${from}`);
      // Mark it as processed so we don't keep checking it
      if (messageId) {
         await prisma.processedEmail.create({ data: { emailMessageId: messageId } }).catch(() => {});
      }
      return false;
    }

    console.log(`Processing email from ${from}: ${subject}`);

    // Check if we already processed this messageId
    if (messageId) {
      const existingMessage = await prisma.message.findUnique({
        where: { emailMessageId: messageId }
      });
      const existingProcessed = await prisma.processedEmail.findUnique({
        where: { emailMessageId: messageId }
      });
      if (existingMessage || existingProcessed) {
        console.log('Email already processed.');
        return false;
      }
    }

    // Try to find if this is a reply to an existing ticket
    let ticketId: string | null = null;

    // 1. Check References / In-Reply-To
    const possibleReplyIds = [inReplyTo, ...references].filter(Boolean) as string[];
    if (possibleReplyIds.length > 0) {
      const parentMessage = await prisma.message.findFirst({
        where: { emailMessageId: { in: possibleReplyIds } }
      });
      if (parentMessage) {
        ticketId = parentMessage.ticketId;
      }
    }

    // 2. Check Subject for [Ticket #id]
    if (!ticketId) {
      const match = subject.match(/\[Ticket #([a-zA-Z0-9-]+)\]/);
      if (match && match[1]) {
        const possibleTicketId = match[1];
        // The regex captures a prefix of the ID. Let's find a ticket starting with this ID.
        const ticket = await prisma.ticket.findFirst({
          where: { id: { startsWith: possibleTicketId } }
        });
        if (ticket) {
          ticketId = ticket.id;
        }
      }
    }

    if (ticketId) {
      // Append message to existing ticket
      const newMessage = await prisma.message.create({
        data: {
          content: text,
          senderType: 'STUDENT',
          ticketId,
          emailMessageId: messageId,
        }
      });

      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          await saveAttachment(attachment, newMessage.id);
        }
      }

      // Re-open ticket if it was pending customer, resolved, or closed
      const oldTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (oldTicket && (oldTicket.status === 'PENDING_CUSTOMER' || oldTicket.status === 'RESOLVED' || oldTicket.status === 'CLOSED')) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'OPEN' }
        });

        await prisma.message.create({
          data: {
            ticketId,
            senderType: 'SYSTEM' as any,
            content: `Status changed to OPEN because the customer replied. Escalated to live agent queue.`
          }
        });
      }

      if (messageId) {
        await prisma.processedEmail.create({ data: { emailMessageId: messageId } }).catch(() => {});
      }
      console.log(`Appended to ticket ${ticketId}`);
      return true;
    } else {
      // Create a new ticket
      const routing = await determineRouting(subject, text);
      
      const newTicket = await prisma.ticket.create({
        data: {
          subject,
          studentEmail: from,
          emailMessageId: messageId,
          category: routing.category,
          assignedAgentId: routing.assignedAgentId,
          messages: {
            create: {
              content: text,
              senderType: 'STUDENT',
              emailMessageId: messageId,
            }
          }
        },
        include: {
          messages: true
        }
      });

      const firstMessageId = newTicket.messages[0].id;
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          await saveAttachment(attachment, firstMessageId);
        }
      }

      // Notify all admins about the new ticket
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: 'New Ticket Received',
            message: `New ticket: ${subject}`,
            type: 'NEW_TICKET',
            link: `/dashboard/tickets/${newTicket.id}`,
          }))
        });
      }

      // Also notify the assigned agent if routing assigned it to one
      if (routing.assignedAgentId) {
        const isAlreadyAdmin = admins.some(a => a.id === routing.assignedAgentId);
        if (!isAlreadyAdmin) {
          await prisma.notification.create({
            data: {
              userId: routing.assignedAgentId,
              title: 'Ticket Assigned',
              message: `A new ticket was automatically routed to you: ${subject}`,
              type: 'NEW_TICKET',
              link: `/dashboard/tickets/${newTicket.id}`,
            }
          });
        }
      }

      if (messageId) {
        await prisma.processedEmail.create({ data: { emailMessageId: messageId } }).catch(() => {});
      }

      // 🤖 Trigger Autonomous AI Knowledge First-Response to customer
      triggerAiFirstResponse(newTicket.id).catch((err) =>
        console.error('[AI First-Responder] Async trigger error:', err)
      );

      console.log(`Created new ticket ${newTicket.id}`);
      return true;
    }
  } catch (err) {
    console.error('Error processing email:', err);
    return false;
  }
}
