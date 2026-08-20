import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role !== 'AGENT' && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, notificationEmail: true, role: true, supportTier: true },
    });
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const body = await req.json();
    const { targetTier, assignedAgentId, handoverNote } = body;

    if (!targetTier || !['TIER_1', 'TIER_2', 'TIER_3'].includes(targetTier)) {
      return NextResponse.json({ error: 'Invalid target support tier' }, { status: 400 });
    }

    if (!handoverNote || !handoverNote.trim()) {
      return NextResponse.json({ error: 'A handover note is required for escalation' }, { status: 400 });
    }

    // 1. Fetch current ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true, notificationEmail: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Resolve Target Assignee
    let targetAgent: { id: string; name: string | null; email: string; notificationEmail: string | null } | null = null;
    if (assignedAgentId && assignedAgentId !== 'unassigned') {
      targetAgent = await prisma.user.findUnique({
        where: { id: assignedAgentId },
        select: { id: true, name: true, email: true, notificationEmail: true },
      });
    }

    const previousTier = ticket.currentTier;
    const tierLabels: Record<string, string> = {
      TIER_1: 'Layer 1 (L1 Frontline)',
      TIER_2: 'Layer 2 (L2 Technical Specialist)',
      TIER_3: 'Layer 3 (L3 Engineering / Senior)',
    };

    const prevTierLabel = tierLabels[previousTier] || previousTier;
    const nextTierLabel = tierLabels[targetTier] || targetTier;
    const escalatingStaffName = currentUser.name || currentUser.email;

    // 3. Update Ticket in Database
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        currentTier: targetTier as any,
        assignedAgentId: targetAgent ? targetAgent.id : null,
        escalationReason: handoverNote.trim(),
        status: 'OPEN',
      },
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // 4. Record Internal Handover Note in Ticket Thread
    const handoverMessageContent = `🔺 **ESCALATION HANDOVER: ${prevTierLabel} ➔ ${nextTierLabel}**\n\n**Escalated By:** ${escalatingStaffName} (${currentUser.email})\n**New Assignee:** ${targetAgent ? targetAgent.name || targetAgent.email : `Unassigned (${nextTierLabel} Queue)`}\n\n**Handover Note & Troubleshooting Performed:**\n${handoverNote.trim()}`;

    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        senderType: 'INTERNAL_NOTE',
        content: handoverMessageContent,
      },
    });

    // 5. Fetch Admins and Staff to notify & CC
    const admins = await prisma.user.findMany({
      where: { 
        role: 'ADMIN', 
        status: 'ACTIVE',
        receiveAlerts: true,
        email: { not: 'kumbharganesh929@gmail.com' } // Prevent sending to system inbox
      },
      select: { id: true, email: true, notificationEmail: true },
    });

    // Determine TO recipients:
    let toEmails: string[] = [];
    if (targetAgent) {
      const email = targetAgent.notificationEmail && targetAgent.notificationEmail.trim()
        ? targetAgent.notificationEmail.trim()
        : targetAgent.email.trim();
      toEmails.push(email);
    } else {
      // If unassigned in target tier, find active agents in target tier
      const tierAgents = await prisma.user.findMany({
        where: { supportTier: targetTier as any, status: 'ACTIVE' },
        select: { email: true, notificationEmail: true },
      });
      toEmails = tierAgents.map((a) => (a.notificationEmail && a.notificationEmail.trim() ? a.notificationEmail.trim() : a.email.trim()));
      if (toEmails.length === 0) {
        // Fallback to admins
        toEmails = admins.map((a) => (a.notificationEmail && a.notificationEmail.trim() ? a.notificationEmail.trim() : a.email.trim()));
      }
    }

    // Determine CC recipients (Admins + Escalating Agent):
    const ccEmailsSet = new Set<string>();

    // Add escalating agent
    const escalatingAgentEmail = currentUser.notificationEmail && currentUser.notificationEmail.trim()
      ? currentUser.notificationEmail.trim()
      : currentUser.email.trim();
    ccEmailsSet.add(escalatingAgentEmail);

    // Add all admins
    admins.forEach((admin) => {
      const mail = admin.notificationEmail && admin.notificationEmail.trim() ? admin.notificationEmail.trim() : admin.email.trim();
      ccEmailsSet.add(mail);
    });

    // Remove duplicates that are already in 'TO'
    toEmails.forEach((toMail) => ccEmailsSet.delete(toMail));
    const ccEmails = Array.from(ccEmailsSet).filter(email => email !== 'kumbharganesh929@gmail.com');
    toEmails = toEmails.filter(email => email !== 'kumbharganesh929@gmail.com');

    // 6. In-App Notifications
    if (targetAgent) {
      await prisma.notification.create({
        data: {
          userId: targetAgent.id,
          title: `🔺 Ticket Escalated to You (${nextTierLabel})`,
          message: `${escalatingStaffName} escalated Ticket #${ticket.id.slice(0, 8)}: ${ticket.subject}`,
          type: 'ESCALATION',
          link: `/dashboard/tickets/${ticket.id}`,
        },
      }).catch(() => {});
    }

    for (const admin of admins) {
      if (admin.id !== currentUser.id) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `🔺 Ticket Escalated: ${prevTierLabel} ➔ ${nextTierLabel}`,
            message: `${escalatingStaffName} escalated Ticket #${ticket.id.slice(0, 8)} to ${targetAgent ? targetAgent.name || targetAgent.email : nextTierLabel}`,
            type: 'ESCALATION',
            link: `/dashboard/tickets/${ticket.id}`,
          },
        }).catch(() => {});
      }
    }

    // 7. Dispatch Escalation Notification Email with CC
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const ticketUrl = `${baseUrl}/dashboard/tickets/${ticket.id}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 24px; color: white;">
          <span style="background: rgba(255,255,255,0.2); color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
            🔺 TIER ESCALATION HANDOVER
          </span>
          <h2 style="margin: 10px 0 4px 0; font-size: 20px; font-weight: 800;">
            [${nextTierLabel}] ${ticket.subject}
          </h2>
          <p style="margin: 0; opacity: 0.9; font-size: 13px;">
            Ticket #${ticket.id.slice(0, 8)} • Escalated from ${prevTierLabel}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <!-- Handover Details Box -->
          <div style="background: #fff7ed; border: 1px solid #ffedd5; border-left: 4px solid #ea580c; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #9a3412; text-transform: uppercase;">
              Handover Note from ${escalatingStaffName}:
            </p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
${handoverNote.trim()}
            </p>
          </div>

          <!-- Metadata Grid -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 35%;">Customer:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${ticket.studentEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Priority / Category:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${ticket.priority} • ${ticket.category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">New Assignee:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${targetAgent ? targetAgent.name || targetAgent.email : `Unassigned (${nextTierLabel} Queue)`}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">CC'd in Loop:</td>
              <td style="padding: 8px 0; color: #475569; font-size: 12px;">${ccEmails.join(', ')}</td>
            </tr>
          </table>

          <!-- Action Button -->
          <div style="text-align: center; margin: 24px 0 10px 0;">
            <a href="${ticketUrl}" style="display: inline-block; background: #ea580c; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
              View & Handle Escalated Ticket →
            </a>
          </div>
        </div>
      </div>
    `;

    if (toEmails.length > 0) {
      await sendEmail({
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: `🔺 [ESCALATION] [${nextTierLabel}] Ticket #${ticket.id.slice(0, 8)}: ${ticket.subject}`,
        text: `Ticket #${ticket.id.slice(0, 8)} has been escalated to ${nextTierLabel} by ${escalatingStaffName}.\n\nHandover Note:\n${handoverNote.trim()}\n\nView Ticket: ${ticketUrl}`,
        html: emailHtml,
      });
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `Ticket successfully escalated to ${nextTierLabel}`,
    });
  } catch (error: any) {
    console.error('Error escalating ticket:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
