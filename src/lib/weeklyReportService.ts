import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();
  return `"${str}"`;
}

export async function generateAndSendWeeklyReport() {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const startDateFormatted = sevenDaysAgo.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const endDateFormatted = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const dateStamp = today.toISOString().split('T')[0];

    // 1. Fetch all tickets from the past 7 days (or all open tickets)
    const allTickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true },
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

    const weeklyTickets = allTickets.filter(
      (t) => new Date(t.createdAt) >= sevenDaysAgo
    );

    // 2. Fetch active Admin accounts for recipients
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationEmail: true,
      },
    });

    const recipientEmails = Array.from(
      new Set(
        admins
          .map((user) => user.notificationEmail?.trim() || user.email?.trim())
          .filter((email): email is string => Boolean(email && email.length > 0))
      )
    );

    // Fallback recipient if none configured
    if (recipientEmails.length === 0) {
      recipientEmails.push('kumbharganesh929@gmail.com');
    }

    // 3. Compute Weekly Performance Metrics
    const totalCreatedThisWeek = weeklyTickets.length;
    const resolvedThisWeek = weeklyTickets.filter(
      (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
    ).length;
    const openBacklog = allTickets.filter(
      (t) => t.status === 'NEW' || t.status === 'OPEN' || t.status === 'PENDING_CUSTOMER'
    ).length;
    const slaBreachedCount = weeklyTickets.filter((t) => t.isSlaBreached).length;

    const resolutionRate =
      totalCreatedThisWeek > 0
        ? Math.round((resolvedThisWeek / totalCreatedThisWeek) * 100)
        : 100;

    const slaComplianceRate =
      totalCreatedThisWeek > 0
        ? Math.round(((totalCreatedThisWeek - slaBreachedCount) / totalCreatedThisWeek) * 100)
        : 100;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    weeklyTickets.forEach((t) => {
      const cat = t.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Priority breakdown
    const urgentCount = weeklyTickets.filter((t) => t.priority === 'URGENT').length;
    const highCount = weeklyTickets.filter((t) => t.priority === 'HIGH').length;
    const normalCount = weeklyTickets.filter((t) => t.priority === 'NORMAL').length;
    const lowCount = weeklyTickets.filter((t) => t.priority === 'LOW').length;

    // 4. Agent Performance Scorecard (Leaderboard)
    const agents = await prisma.user.findMany({
      where: {
        role: { in: ['AGENT', 'ADMIN'] },
        status: 'ACTIVE',
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const agentScorecard = agents
      .map((agent) => {
        const agentAssignedWeekly = weeklyTickets.filter(
          (t) => t.assignedAgentId === agent.id
        );
        const agentResolvedWeekly = agentAssignedWeekly.filter(
          (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
        ).length;
        const agentOpenBacklog = allTickets.filter(
          (t) =>
            t.assignedAgentId === agent.id &&
            (t.status === 'NEW' || t.status === 'OPEN' || t.status === 'PENDING_CUSTOMER')
        ).length;
        const rate =
          agentAssignedWeekly.length > 0
            ? Math.round((agentResolvedWeekly / agentAssignedWeekly.length) * 100)
            : 0;

        return {
          name: agent.name || agent.email.split('@')[0],
          email: agent.email,
          role: agent.role,
          assigned: agentAssignedWeekly.length,
          resolved: agentResolvedWeekly,
          backlog: agentOpenBacklog,
          rate,
        };
      })
      .sort((a, b) => b.resolved - a.resolved || b.assigned - a.assigned);

    // 5. Generate Weekly CSV Attachment
    const csvHeaders = [
      'Ticket ID',
      'Subject',
      'Status',
      'Priority',
      'Category',
      'Support Tier',
      'Student / Customer Email',
      'Assigned Agent Name',
      'Assigned Agent Email',
      'SLA Breached',
      'Total Messages',
      'Created Date (ISO)',
      'Updated Date (ISO)',
    ];

    const csvRows = weeklyTickets.map((t) => [
      escapeCsv(t.id),
      escapeCsv(t.subject),
      escapeCsv(t.status),
      escapeCsv(t.priority),
      escapeCsv(t.category),
      escapeCsv(t.currentTier),
      escapeCsv(t.studentEmail),
      escapeCsv(t.assignedAgent?.name || 'Unassigned'),
      escapeCsv(t.assignedAgent?.email || 'N/A'),
      escapeCsv(t.isSlaBreached ? 'YES' : 'NO'),
      escapeCsv(t.messages.length),
      escapeCsv(t.createdAt.toISOString()),
      escapeCsv(t.updatedAt.toISOString()),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.join(',')),
    ].join('\r\n');

    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    // 6. Construct Executive HTML Email Template
    const agentRowsHtml =
      agentScorecard.length > 0
        ? agentScorecard
            .map(
              (a, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 12px; font-weight: bold; color: #1e293b;">
              ${idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}${a.name}
              <div style="font-size: 11px; color: #64748b; font-weight: normal;">${a.email} (${a.role})</div>
            </td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: #3b82f6;">${a.assigned}</td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: #10b981;">${a.resolved}</td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: #f59e0b;">${a.backlog}</td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: ${a.rate >= 80 ? '#10b981' : '#64748b'};">${a.rate}%</td>
          </tr>`
            )
            .join('')
        : '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b;">No active agents found.</td></tr>';

    const categoryBadgesHtml = Object.entries(categoryCounts)
      .map(
        ([cat, count]) => `
        <span style="display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 3px;">
          ${cat}: ${count}
        </span>`
      )
      .join('');

    const emailHtml = `
      <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); padding: 32px 24px; color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="background: rgba(255,255,255,0.15); color: #c7d2fe; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                📈 Executive Operations Briefing
              </span>
              <span style="font-size: 12px; color: #e0e7ff; font-weight: 600;">
                7-Day Analysis
              </span>
            </div>
            <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
              Weekly Support Performance Report
            </h1>
            <p style="margin: 0; font-size: 14px; color: #c7d2fe;">
              Period: <strong>${startDateFormatted}</strong> to <strong>${endDateFormatted}</strong>
            </p>
          </div>

          <div style="padding: 24px;">
            
            <!-- Key Executive KPIs Grid -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
              <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Weekly Volume</div>
                <div style="font-size: 26px; font-weight: 900; color: #0f172a; margin-top: 4px;">${totalCreatedThisWeek}</div>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase;">Resolved</div>
                <div style="font-size: 26px; font-weight: 900; color: #059669; margin-top: 4px;">${resolvedThisWeek}</div>
              </div>
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase;">Resolution Rate</div>
                <div style="font-size: 26px; font-weight: 900; color: #2563eb; margin-top: 4px;">${resolutionRate}%</div>
              </div>
              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px; text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase;">Active Backlog</div>
                <div style="font-size: 26px; font-weight: 900; color: #e11d48; margin-top: 4px;">${openBacklog}</div>
              </div>
            </div>

            <!-- SLA & Compliance Section -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #1e293b;">
                🛡️ SLA & Operations Health
              </h3>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; color: #475569;">7-Day SLA Compliance:</span>
                <strong style="font-size: 14px; color: ${slaComplianceRate >= 90 ? '#10b981' : '#f59e0b'};">${slaComplianceRate}%</strong>
              </div>
              <div style="background: #e2e8f0; border-radius: 8px; height: 8px; overflow: hidden; margin-bottom: 12px;">
                <div style="background: ${slaComplianceRate >= 90 ? '#10b981' : '#f59e0b'}; height: 100%; width: ${slaComplianceRate}%;"></div>
              </div>
              <div style="font-size: 12px; color: #64748b;">
                SLA Breaches Recorded: <strong>${slaBreachedCount}</strong> • Urgent Tickets: <strong>${urgentCount}</strong> • High Priority: <strong>${highCount}</strong>
              </div>
            </div>

            <!-- Categories -->
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 800; color: #1e293b;">
                📂 Issue Categories Distribution
              </h3>
              <div>${categoryBadgesHtml || '<span style="color: #64748b; font-size: 13px;">No tickets created this week.</span>'}</div>
            </div>

            <!-- Agent Performance Leaderboard -->
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #1e293b;">
                👥 Agent Performance & Workload Leaderboard
              </h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                  <thead>
                    <tr style="background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1;">
                      <th style="padding: 10px 12px;">Agent</th>
                      <th style="padding: 10px 12px; text-align: center;">Assigned</th>
                      <th style="padding: 10px 12px; text-align: center;">Resolved</th>
                      <th style="padding: 10px 12px; text-align: center;">Backlog</th>
                      <th style="padding: 10px 12px; text-align: center;">Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${agentRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Attachment Notice -->
            <div style="background: #eef2ff; border: 1px dashed #6366f1; border-radius: 12px; padding: 14px; text-align: center; margin-top: 24px;">
              <p style="margin: 0; font-size: 13px; color: #3730a3; font-weight: 600;">
                📎 <strong>weekly-support-report-${dateStamp}.csv</strong> is attached with granular line-item ticket logs.
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              Automated Support Operations System • Generated on ${today.toLocaleDateString()} at ${today.toLocaleTimeString()}
            </p>
          </div>

        </div>
      </div>
    `;

    const subject = `📊 [Weekly Executive Support Report] ${startDateFormatted} - ${endDateFormatted} • ${totalCreatedThisWeek} Tickets (${resolutionRate}% Resolved)`;

    const info = await sendEmail({
      to: recipientEmails,
      subject,
      text: `Weekly Executive Support Report (${startDateFormatted} - ${endDateFormatted})\n\nTotal Created: ${totalCreatedThisWeek}\nTotal Resolved: ${resolvedThisWeek}\nResolution Rate: ${resolutionRate}%\nActive Backlog: ${openBacklog}\nSLA Compliance: ${slaComplianceRate}%\n\nPlease view the attached CSV for complete logs.`,
      html: emailHtml,
      attachments: [
        {
          filename: `weekly-support-report-${dateStamp}.csv`,
          content: csvBuffer,
          contentType: 'text/csv',
        },
      ],
    });

    console.log(`[Weekly Report] Delivered report to ${recipientEmails.join(', ')} (Message-ID: ${info})`);

    return {
      success: true,
      recipientsCount: recipientEmails.length,
      ticketsCount: weeklyTickets.length,
      message: `Weekly report successfully delivered to ${recipientEmails.length} admin mailboxes with spreadsheet attached.`,
    };
  } catch (error: any) {
    console.error('[Weekly Report] Error generating report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate weekly report',
    };
  }
}
