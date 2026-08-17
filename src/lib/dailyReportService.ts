import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();
  return `"${str}"`;
}

export async function generateAndSendDailyReport() {
  try {
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const dateStamp = today.toISOString().split('T')[0];

    // 1. Fetch all tickets with agent & message history
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            senderType: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    // 2. Fetch active staff (Admins and Agents) who set an Alert / Notification Email or Admin email
    const staffMembers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'AGENT'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        notificationEmail: true,
      },
    });

    const recipientEmails = Array.from(
      new Set(
        staffMembers
          .map((user) => user.notificationEmail?.trim() || (user.role === 'ADMIN' ? user.email?.trim() : ''))
          .filter((email): email is string => Boolean(email && email.length > 0))
      )
    );

    if (recipientEmails.length === 0) {
      return { 
        success: false, 
        message: 'No alert emails configured. Please set an Alert/Notification Email in your Profile (Dashboard > Profile) or User Management.' 
      };
    }

    // 3. Compute High-Level Metrics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t) => ['NEW', 'OPEN', 'PENDING_CUSTOMER'].includes(t.status)).length;
    const resolvedCount = tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
    const slaBreaches = tickets.filter(
      (t) => t.isSlaBreached || (!t.assignedAgentId && ['URGENT', 'HIGH'].includes(t.priority) && Date.now() - new Date(t.createdAt).getTime() > 3 * 3600 * 1000)
    ).length;

    // 4. Build CSV Rows with accurate Progress & Action Summaries
    const csvHeaders = [
      'Ticket ID',
      'Subject',
      'Customer Email',
      'Category',
      'Priority',
      'Assigned Agent',
      'Current Status',
      'Ticket Arrival Time',
      'First Response Time (FRT)',
      'Last Updated Time',
      'SLA Status',
      'Current Progress & Action Summary',
    ];

    const csvRows = [csvHeaders.map(escapeCsv).join(',')];

    for (const t of tickets) {
      const ticketId = `#${t.id.slice(0, 8)}`;
      const subject = t.subject;
      const customerEmail = t.studentEmail;
      const category = t.category;
      const priority = t.priority;
      const agentName = t.assignedAgent?.name
        ? `${t.assignedAgent.name} (${t.assignedAgent.email})`
        : t.assignedAgent?.email || 'Unassigned';
      const status = t.status;
      const arrivalTime = new Date(t.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const lastUpdateTime = new Date(t.updatedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // Calculate First Response Time (FRT)
      const firstCustomerMsg = t.messages.find((m) => m.senderType === 'STUDENT');
      const firstAgentMsg = t.messages.find((m) => m.senderType === 'AGENT');
      let frtText = 'Awaiting First Reply';
      if (firstCustomerMsg && firstAgentMsg) {
        const diffMs = new Date(firstAgentMsg.createdAt).getTime() - new Date(firstCustomerMsg.createdAt).getTime();
        const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
        if (diffMins < 60) {
          frtText = `${diffMins} mins`;
        } else {
          frtText = `${(diffMins / 60).toFixed(1)} hrs`;
        }
      }

      // SLA Status
      const isBreached =
        t.isSlaBreached ||
        (!t.assignedAgentId && ['URGENT', 'HIGH'].includes(t.priority) && Date.now() - new Date(t.createdAt).getTime() > 3 * 3600 * 1000);
      const slaText = isBreached ? '🚨 SLA Breached (>3h)' : 'Normal / On Track';

      // Current Progress & Action Summary (Meaningful Short Summary)
      let progressSummary = '';
      const lastMsg = t.messages[t.messages.length - 1];
      const lastMsgSnippet = lastMsg?.content ? lastMsg.content.slice(0, 80).replace(/\r?\n/g, ' ') : '';

      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        progressSummary = `Resolved: Resolution delivered to customer. Last Note: "${lastMsgSnippet}"`;
      } else if (t.status === 'PENDING_CUSTOMER') {
        progressSummary = `Waiting on Customer: Details requested from student. Last Note: "${lastMsgSnippet}"`;
      } else if (t.status === 'OPEN') {
        progressSummary = `In Progress by ${t.assignedAgent?.name || 'Agent'}. Last Note: "${lastMsgSnippet}"`;
      } else {
        // NEW / Unassigned
        progressSummary = `Unassigned: Awaiting agent triage. Customer Note: "${lastMsgSnippet}"`;
      }

      csvRows.push(
        [
          escapeCsv(ticketId),
          escapeCsv(subject),
          escapeCsv(customerEmail),
          escapeCsv(category),
          escapeCsv(priority),
          escapeCsv(agentName),
          escapeCsv(status),
          escapeCsv(arrivalTime),
          escapeCsv(frtText),
          escapeCsv(lastUpdateTime),
          escapeCsv(slaText),
          escapeCsv(progressSummary),
        ].join(',')
      );
    }

    const csvContent = csvRows.join('\n');
    const csvFilename = `Support_EOD_Report_${dateStamp}.csv`;

    // 5. Build HTML Email Digest
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 28px; color: white;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="background: #2563eb; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                Daily Operations Digest
              </span>
              <h1 style="margin: 10px 0 4px 0; font-size: 22px; font-weight: 800;">
                📊 7:00 PM End-of-Day (EOD) Support Report
              </h1>
              <p style="margin: 0; opacity: 0.8; font-size: 13px;">
                ${dateFormatted} • Automated Shift Summary
              </p>
            </div>
          </div>
        </div>

        <!-- Metric Cards -->
        <div style="padding: 24px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Active</p>
              <h3 style="margin: 6px 0 0 0; font-size: 22px; color: #0f172a; font-weight: 900;">${totalTickets}</h3>
            </div>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Pending / Open</p>
              <h3 style="margin: 6px 0 0 0; font-size: 22px; color: #2563eb; font-weight: 900;">${openTickets}</h3>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Resolved</p>
              <h3 style="margin: 6px 0 0 0; font-size: 22px; color: #16a34a; font-weight: 900;">${resolvedCount}</h3>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #991b1b; font-weight: 700; text-transform: uppercase;">SLA Breaches</p>
              <h3 style="margin: 6px 0 0 0; font-size: 22px; color: #dc2626; font-weight: 900;">${slaBreaches}</h3>
            </div>
          </div>

          <!-- Attachment Callout -->
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: #0369a1; display: flex; align-items: center; gap: 6px;">
              📎 Complete Spreadsheet Attached: <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${csvFilename}</code>
            </p>
            <p style="margin: 0; font-size: 12.5px; color: #0c4a6e; line-height: 1.5;">
              The attached spreadsheet contains detailed columns including <strong>Ticket ID, Subject, Customer Email, Priority, Assigned Agent, FRT (First Response Time), Last Activity, SLA Status, and Current Progress & Action Summary</strong>. You can open it in Microsoft Excel or Google Sheets.
            </p>
          </div>

          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
            This automated report is dispatched daily at 7:00 PM to all staff members' active alert mailboxes.
          </p>
        </div>
      </div>
    `;

    // 6. Send Email with CSV Attachment to all active staff mailboxes
    for (const email of recipientEmails) {
      try {
        await sendEmail({
          to: email,
          subject: `📊 [Daily EOD Support Report] ${dateFormatted} - ${openTickets} Pending, ${resolvedCount} Resolved`,
          text: `Daily Support Operations Report (${dateFormatted})\n\nTotal Tickets: ${totalTickets}\nPending/Open: ${openTickets}\nResolved: ${resolvedCount}\nSLA Breaches: ${slaBreaches}\n\nPlease find the attached CSV spreadsheet (${csvFilename}) for complete ticket progress breakdown.`,
          html: htmlEmail,
          attachments: [
            {
              filename: csvFilename,
              content: csvContent,
              contentType: 'text/csv; charset=utf-8',
            },
          ],
        });
      } catch (err) {
        console.error(`Failed to send daily report email to ${email}:`, err);
      }
    }

    // 7. Create In-App Notification for all staff members
    for (const user of staffMembers) {
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: `📊 Daily 7:00 PM EOD Report Generated`,
            message: `The daily support operations report for ${dateFormatted} has been dispatched with ${totalTickets} total tickets tracked.`,
            type: 'DAILY_REPORT',
            link: `/dashboard/tickets`,
          },
        });
      } catch (notifErr) {
        console.error('Failed to create in-app notification:', notifErr);
      }
    }

    return {
      success: true,
      recipientsCount: recipientEmails.length,
      ticketsCount: totalTickets,
      message: `Daily report successfully delivered to ${recipientEmails.length} staff mailboxes with spreadsheet attached.`,
    };
  } catch (error) {
    console.error('Error generating daily report:', error);
    return { error: 'Failed to generate daily report' };
  }
}
