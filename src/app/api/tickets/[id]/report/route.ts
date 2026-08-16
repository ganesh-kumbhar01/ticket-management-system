import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (remainingMins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const ticketId = resolvedParams.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            supportTier: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const createdAt = new Date(ticket.createdAt);
    const now = new Date();

    // 1. Calculate First Response Time
    let firstResponseAt: Date | null = null;
    const firstAgentOrAiMsg = ticket.messages.find(
      (m) => m.senderType === 'AGENT' || (m as any).isAi === true
    );
    if (firstAgentOrAiMsg) {
      firstResponseAt = new Date(firstAgentOrAiMsg.createdAt);
    }

    const firstResponseMinutes = firstResponseAt
      ? Math.max(0, (firstResponseAt.getTime() - createdAt.getTime()) / (1000 * 60))
      : null;

    // 2. Calculate Resolution Time
    let resolvedAt: Date | null = null;
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      const resolvedSystemMsg = [...ticket.messages]
        .reverse()
        .find(
          (m) =>
            m.senderType === 'SYSTEM' &&
            (m.content.toLowerCase().includes('resolved') || m.content.toLowerCase().includes('closed'))
        );
      resolvedAt = resolvedSystemMsg ? new Date(resolvedSystemMsg.createdAt) : new Date(ticket.updatedAt);
    }

    const resolutionMinutes = resolvedAt
      ? Math.max(0, (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60))
      : null;

    // 3. SLA Compliance Status
    const isSlaBreached =
      ticket.isSlaBreached ||
      (!ticket.assignedAgentId &&
        ['URGENT', 'HIGH'].includes(ticket.priority) &&
        Date.now() - createdAt.getTime() > 3 * 3600 * 1000);

    // 4. Activity breakdown
    const customerMessagesCount = ticket.messages.filter((m) => m.senderType === 'STUDENT').length;
    const agentMessagesCount = ticket.messages.filter((m) => m.senderType === 'AGENT').length;
    const internalNotesCount = ticket.messages.filter((m) => m.senderType === 'INTERNAL_NOTE').length;
    const systemLogsCount = ticket.messages.filter((m) => m.senderType === 'SYSTEM').length;
    const allAttachments = ticket.messages.flatMap((m) => m.attachments || []);

    // 5. Generate AI Executive Summary & Resolution Analysis
    let aiExecutiveSummary = '';
    try {
      if (ticket.messages.length > 0) {
        const conversationText = ticket.messages
          .map(
            (m) =>
              `[${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${
                m.senderType === 'STUDENT'
                  ? 'Customer'
                  : m.senderType === 'INTERNAL_NOTE'
                  ? 'Internal Note'
                  : m.senderType === 'SYSTEM'
                  ? 'System'
                  : 'Agent'
              }: ${m.content}`
          )
          .join('\n');

        const prompt = `
You are a Lead QA and Customer Support Operations Analyst.
Generate an executive case report summary for Ticket #${ticket.id} (${ticket.subject}).

Ticket Details:
- Priority: ${ticket.priority}
- Category: ${ticket.category}
- Status: ${ticket.status}
- Support Tier: ${ticket.currentTier}
- Customer: ${ticket.studentEmail}
- Assigned Agent: ${ticket.assignedAgent?.name || ticket.assignedAgent?.email || 'Unassigned'}
- Handover / Escalation Note: ${ticket.escalationReason || 'None'}

Conversation Thread:
${conversationText}

Format your output in clean, professional markdown with exactly these 3 brief sections (keep each 1-2 bullet points):
1. **Core Problem**: What issue the customer reported.
2. **Investigation & Action**: What troubleshooting was done by support/AI.
3. **Current Resolution / Outcome**: Final fix provided or current blocker.
`;

        const aiRes = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });

        aiExecutiveSummary = aiRes.text || '';
      }
    } catch (aiErr) {
      console.warn('AI Summary Generation fallback:', aiErr);
      aiExecutiveSummary = `**Core Problem**: Customer reported an inquiry regarding "${ticket.subject}".\n**Investigation & Action**: Support team reviewed the case and provided technical guidance across ${ticket.messages.length} message updates.\n**Current Resolution**: Status is marked as ${ticket.status}.`;
    }

    const reportData = {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        studentEmail: ticket.studentEmail,
        currentTier: ticket.currentTier,
        escalationReason: ticket.escalationReason,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      assignedAgent: ticket.assignedAgent,
      timelines: {
        createdAt: createdAt.toISOString(),
        firstResponseAt: firstResponseAt ? firstResponseAt.toISOString() : null,
        firstResponseFormatted: firstResponseMinutes !== null ? formatDuration(firstResponseMinutes) : 'Awaiting Response',
        resolvedAt: resolvedAt ? resolvedAt.toISOString() : null,
        resolutionFormatted: resolutionMinutes !== null ? formatDuration(resolutionMinutes) : 'In Progress',
        slaStatus: isSlaBreached ? 'BREACHED' : 'COMPLIANT',
      },
      stats: {
        totalMessages: ticket.messages.length,
        customerMessagesCount,
        agentMessagesCount,
        internalNotesCount,
        systemLogsCount,
        attachmentsCount: allAttachments.length,
      },
      aiExecutiveSummary,
      timelineEvents: ticket.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        isAi: (m as any).isAi || false,
        content: m.content,
        createdAt: m.createdAt,
        attachments: m.attachments || [],
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: payload.userId,
        name: (payload as any).name || payload.email,
        role: payload.role,
      },
    };

    return NextResponse.json(reportData, { status: 200 });
  } catch (error: any) {
    console.error('Ticket Report API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate ticket report' }, { status: 500 });
  }
}
