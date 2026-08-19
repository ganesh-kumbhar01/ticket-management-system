import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function checkAndEscalateSlaBreaches() {
  try {
    // 3 hours threshold for unassigned critical tickets
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    // Ignore extremely old tickets (e.g. from previous tests)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Find all unassigned critical tickets older than 3 hours that have not been escalated yet
    const breachedTickets = await prisma.ticket.findMany({
      where: {
        assignedAgentId: null,
        status: { in: ['NEW', 'OPEN'] },
        priority: { in: ['URGENT', 'HIGH'] },
        isSlaBreached: false,
        createdAt: { 
          lte: threeHoursAgo,
          gte: twentyFourHoursAgo // Do not trigger for old tickets
        },
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (breachedTickets.length === 0) {
      return { breachedCount: 0, message: 'No SLA breaches found.' };
    }

    // 2. Fetch all active Admin accounts to retrieve their active alert/notification emails
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
        receiveAlerts: true, // Only admins who opted-in via toggle
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationEmail: true,
      },
    });

    if (admins.length === 0) {
      console.warn('No active admins found with receiveAlerts enabled.');
      return { breachedCount: breachedTickets.length, message: 'No active admins configured for alerts.' };
    }

    // Extract unique active alert mailboxes (priority: notificationEmail -> admin email)
    const rawAdminAlertEmails = Array.from(
      new Set(
        admins
          .map((admin) => admin.notificationEmail?.trim() || admin.email?.trim())
          .filter((email): email is string => Boolean(email && email.length > 0))
      )
    );
    
    // As per user request, strictly enforce delivery to the requested address only
    const adminAlertEmails = rawAdminAlertEmails.filter(email => email === 'kumbharganesh815@gmail.com');
    
    if (adminAlertEmails.length === 0) {
      console.warn('Admin target email kumbharganesh815@gmail.com is not among the enabled admins.');
    }

    const now = new Date();

    // 3. Process each breached ticket
    for (const ticket of breachedTickets) {
      const waitHours = ((now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)).toFixed(1);
      const ticketSnippet = ticket.messages[0]?.content?.slice(0, 200) || 'No initial description provided.';

      // Send alert email to all active admin alert mailboxes
      for (const email of adminAlertEmails) {
        try {
          await sendEmail({
            to: email,
            subject: `🚨 [SLA BREACH ALERT] Ticket #${ticket.id.slice(0, 8)} - Unassigned for ${waitHours} hrs (${ticket.priority})`,
            text: `SLA BREACH ALERT!\n\nTicket #${ticket.id.slice(0, 8)} is ${ticket.priority} priority and has remained unassigned for ${waitHours} hours.\n\nSubject: ${ticket.subject}\nCustomer: ${ticket.studentEmail}\nCategory: ${ticket.category}\n\nPlease assign an agent immediately.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #ea580c, #dc2626); padding: 24px; color: white;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                    🚨 SLA Breach Escalation Warning
                  </h2>
                  <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">
                    Critical unassigned ticket exceeded the 3-Hour Response SLA.
                  </p>
                </div>

                <div style="padding: 24px;">
                  <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #9a3412; font-size: 13px; font-weight: 700;">
                      Waiting Time: <span style="font-size: 15px; color: #c2410c;">${waitHours} hours</span> (Pending Assignment)
                    </p>
                  </div>

                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 35%;">Ticket ID:</td>
                      <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">#${ticket.id.slice(0, 8)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Priority:</td>
                      <td style="padding: 10px 0;">
                        <span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">
                          ${ticket.priority}
                        </span>
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Subject:</td>
                      <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${ticket.subject}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Customer Email:</td>
                      <td style="padding: 10px 0; color: #2563eb; font-weight: 600;">${ticket.studentEmail}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Category:</td>
                      <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${ticket.category}</td>
                    </tr>
                  </table>

                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 24px;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Message Preview:</p>
                    <p style="margin: 0; color: #334155; font-size: 13px; line-height: 1.5; font-style: italic;">
                      "${ticketSnippet}..."
                    </p>
                  </div>

                  <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                    This escalation alert was automatically generated because this ticket exceeded the 3-hour SLA window without agent assignment.
                  </p>
                </div>
              </div>
            `,
          });
        } catch (mailErr) {
          console.error(`Failed to send SLA breach email to ${email}:`, mailErr);
        }
      }

      // Create In-App Notification for all admins
      for (const admin of admins) {
        try {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: `🚨 SLA Breach: Ticket #${ticket.id.slice(0, 8)}`,
              message: `Ticket "${ticket.subject}" (${ticket.priority}) has remained unassigned for over 3 hours.`,
              type: 'SLA_BREACH',
              link: `/dashboard/tickets/${ticket.id}`,
            },
          });
        } catch (notifErr) {
          console.error('Failed to create in-app SLA notification:', notifErr);
        }
      }

      // 4. Mark ticket as SLA Breached so duplicate emails are never sent
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          isSlaBreached: true,
          slaBreachedAt: now,
        },
      });
    }

    return {
      breachedCount: breachedTickets.length,
      message: `Successfully escalated ${breachedTickets.length} SLA breached tickets to active admin alert mailboxes.`,
    };
  } catch (error) {
    console.error('Error during SLA breach check:', error);
    return { error: 'Internal SLA check error' };
  }
}
