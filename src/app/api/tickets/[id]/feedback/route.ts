import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedAgent: {
          select: { name: true, email: true },
        },
      },
    });

    if (!ticket) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Ticket Not Found</title></head>
          <body style="font-family: Arial, sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc; margin:0;">
            <div style="background:white; padding:32px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05); text-align:center; max-width:400px;">
              <h2 style="color:#e11d48; margin:0 0 8px 0;">Ticket Not Found</h2>
              <p style="color:#64748b; margin:0;">The requested ticket could not be located.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (action === 'SOLVED') {
      // 1. Mark ticket as RESOLVED
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
        },
      });

      // 2. Add System Message
      await prisma.message.create({
        data: {
          ticketId,
          senderType: 'SYSTEM',
          content: '🎉 Customer confirmed their issue was resolved using the AI Knowledge Base troubleshooting steps.',
        },
      });

      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Issue Resolved - HelpDesk</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; margin:0; padding:20px;">
            <div style="background:white; padding:40px; border-radius:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); text-align:center; max-width:460px; border:1px solid #e2e8f0;">
              <div style="width:64px; height:64px; background:#dcfce7; color:#16a34a; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; font-size:28px;">
                ✓
              </div>
              <h2 style="color:#0f172a; margin:0 0 8px 0; font-size:24px; font-weight:800;">Awesome! Issue Resolved</h2>
              <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 24px 0;">
                We're so glad the AI troubleshooting guide solved your issue for ticket <strong>#${ticketId.slice(0, 8)}</strong>. Your ticket has been marked as resolved.
              </p>
              <div style="background:#f1f5f9; padding:12px; border-radius:12px; font-size:12px; color:#475569;">
                If you ever encounter another issue, feel free to submit a new ticket or reply to our email!
              </div>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // NEED_HUMAN - Transfer to Live Human Agent Queue
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'OPEN',
        },
      });

      await prisma.message.create({
        data: {
          ticketId,
          senderType: 'SYSTEM',
          content: '👤 Customer requested live human support agent assistance after reviewing AI troubleshooting steps.',
        },
      });

      // Notify staff
      const staff = await prisma.user.findMany({
        where: { role: { in: ['AGENT', 'ADMIN'] }, status: 'ACTIVE' },
      });

      for (const member of staff) {
        await prisma.notification.create({
          data: {
            userId: member.id,
            title: `👤 Agent Needed: Ticket #${ticketId.slice(0, 8)}`,
            message: `Customer reviewed AI steps and requested human agent assistance for: ${ticket.subject}`,
            type: 'AI_FALLBACK',
            link: `/dashboard/tickets/${ticketId}`,
          },
        }).catch(() => {});
      }

      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Connecting With Support Agent - HelpDesk</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc; margin:0; padding:20px;">
            <div style="background:white; padding:40px; border-radius:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); text-align:center; max-width:460px; border:1px solid #e2e8f0;">
              <div style="width:64px; height:64px; background:#eff6ff; color:#2563eb; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto; font-size:28px;">
                👤
              </div>
              <h2 style="color:#0f172a; margin:0 0 8px 0; font-size:24px; font-weight:800;">Support Team Notified!</h2>
              <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 24px 0;">
                No worries at all! We have escalated ticket <strong>#${ticketId.slice(0, 8)}</strong> directly to our human support agents. An agent will review your issue and respond shortly.
              </p>
              <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:14px; border-radius:12px; font-size:12px; color:#475569; text-align:left;">
                <p style="margin:0 0 4px 0; font-weight:700; color:#1e293b;">Next Steps:</p>
                <p style="margin:0; line-height:1.4;">You will receive an email as soon as an agent replies. You can also reply directly with more details or screenshots if needed.</p>
              </div>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (error) {
    console.error('Error handling ticket feedback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
