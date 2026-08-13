import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const content = formData.get('content') as string;
    const isInternal = formData.get('isInternal') === 'true';
    const files = formData.getAll('files') as File[];

    if (!content) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }
    const ticketId = resolvedParams.id;

    // Ensure the ticket exists
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // First find if there's any recent email message ID we should thread to
    const lastUserMessage = await prisma.message.findFirst({
      where: {
        ticketId,
        senderType: 'STUDENT',
        emailMessageId: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    let sentEmailMessageId: string | null = null;

    if (!isInternal) {
      // Send email to student
      const messageId = await sendEmail({
        to: ticket.studentEmail,
        subject: `Re: [Ticket #${ticket.id.slice(0, 8)}] ${ticket.subject}`,
        text: content,
        replyToMessageId: lastUserMessage?.emailMessageId || undefined,
        references: ticket.emailMessageId ? [ticket.emailMessageId] : undefined,
      });
      if (messageId) sentEmailMessageId = messageId;
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderType: isInternal ? 'INTERNAL_NOTE' : 'AGENT',
        ticketId,
        emailMessageId: sentEmailMessageId,
      }
    });

    if (files && files.length > 0) {
      for (const file of files) {
        if (file instanceof File) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const base64Data = buffer.toString('base64');
          const dataUri = `data:${file.type || 'application/octet-stream'};base64,${base64Data}`;
          
          await prisma.attachment.create({
            data: {
              filename: file.name,
              url: dataUri,
              mimeType: file.type,
              size: file.size,
              messageId: message.id
            }
          });
        }
      }
    }

    // If the ticket was previously NEW or something else, a reply by agent means it's now OPEN or in progress.
    // We can auto-update the status if it's NEW
    if (ticket.status === 'NEW') {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'OPEN' }
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
