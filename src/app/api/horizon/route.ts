import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJwtToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // 1. Gather all live data
    const [
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      unassignedTickets,
      highPriorityTickets,
      allActiveAgents,
      recentTicketsWithMessages,
      recentArticles
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'PENDING_CUSTOMER' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.findMany({
        where: { assignedAgentId: null, status: { in: ['NEW', 'OPEN'] } },
        select: { id: true, subject: true, category: true, priority: true, createdAt: true, studentEmail: true }
      }),
      prisma.ticket.findMany({
        where: { priority: { in: ['HIGH', 'URGENT'] }, status: { in: ['NEW', 'OPEN'] } },
        select: { id: true, subject: true, priority: true, category: true }
      }),
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          assignedTickets: {
            where: { status: { in: ['NEW', 'OPEN', 'PENDING_CUSTOMER'] } },
            select: { id: true, status: true, priority: true }
          }
        }
      }),
      prisma.ticket.findMany({
        take: 15,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          subject: true,
          status: true,
          category: true,
          priority: true,
          assignedAgent: { select: { name: true, email: true } },
          messages: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { content: true, senderType: true, createdAt: true }
          }
        }
      }),
      prisma.knowledgeArticle.findMany({
        take: 10,
        select: { id: true, title: true }
      })
    ]);

    const activeTicketsCount = openTickets + unassignedTickets.length;
    const resolutionRate = totalTickets > 0 
      ? Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100) 
      : 100;

    // Build agent workload summary
    const agentWorkloadSummary = allActiveAgents.map(a => ({
      name: a.name || a.email.split('@')[0],
      email: a.email,
      role: a.role,
      openTickets: a.assignedTickets.length
    }));

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    recentTicketsWithMessages.forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    const dataContext = JSON.stringify({
      totalTickets,
      openTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      unassignedCount: unassignedTickets.length,
      unassignedTicketsSample: unassignedTickets.slice(0, 5),
      highPriorityCount: highPriorityTickets.length,
      resolutionRate: `${resolutionRate}%`,
      agents: agentWorkloadSummary,
      recentTickets: recentTicketsWithMessages.map(t => ({
        id: t.id.slice(0, 8),
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedAgent?.name || t.assignedAgent?.email || 'Unassigned',
        snippet: t.messages[0]?.content?.slice(0, 120) || ''
      })),
      existingKbArticles: recentArticles.map(a => a.title)
    });

    // Default fallback in case AI is disabled or fails
    let analysisResult: any = {
      healthScore: unassignedTickets.length > 3 ? 68 : 92,
      healthStatus: unassignedTickets.length > 3 ? 'ATTENTION' : 'HEALTHY',
      dailySummary: {
        headline: unassignedTickets.length > 0
          ? `System active with ${activeTicketsCount} active tickets and ${unassignedTickets.length} unassigned backlog.`
          : `All systems operating at peak performance with a ${resolutionRate}% resolution rate.`,
        keyHighlights: [
          `${activeTicketsCount} active tickets in queue`,
          `${unassignedTickets.length} unassigned tickets awaiting routing`,
          `${allActiveAgents.length} active agents on duty`
        ]
      },
      whatIfHero: {
        title: unassignedTickets.length > 0 ? 'Auto-Route Unassigned Tickets' : 'Optimize Peak Knowledge Base',
        currentPain: unassignedTickets.length > 0 
          ? `${unassignedTickets.length} customer tickets are waiting without an assigned agent.` 
          : 'Tickets are flowing smoothly with no major bottlenecks.',
        projectedOutcome: unassignedTickets.length > 0
          ? 'Instantly reduces average customer first-response wait time by ~45%.'
          : 'Further reduces repeat inquiries by pre-answering common questions.',
        actionLabel: unassignedTickets.length > 0 ? 'Auto-Assign All Unassigned' : 'Generate New KB Draft',
        actionType: unassignedTickets.length > 0 ? 'AUTO_ASSIGN' : 'DRAFT_KB',
        actionPayload: unassignedTickets.length > 0 ? {} : { title: 'Standard Troubleshooting Guide', category: 'General' }
      },
      insights: [
        {
          id: 'insight-1',
          tag: 'Workload & Queue',
          severity: unassignedTickets.length > 0 ? 'WARNING' : 'POSITIVE',
          what: unassignedTickets.length > 0 
            ? `${unassignedTickets.length} tickets are unassigned in the queue.` 
            : 'All incoming tickets are properly assigned.',
          why: unassignedTickets.length > 0 
            ? 'Incoming customer emails recently arrived and require agent assignment.' 
            : 'Active agents are actively claiming incoming tickets.',
          whatIf: 'Evenly balancing queue across active agents ensures no customer waits over 30 minutes.',
          action: {
            label: 'Auto-Assign to Agents',
            type: 'AUTO_ASSIGN',
            payload: {}
          }
        },
        {
          id: 'insight-2',
          tag: 'Self-Service Deflection',
          severity: 'OPTIMIZATION',
          what: 'Customer inquiries regarding common questions can be deflected with Knowledge Articles.',
          why: 'Self-service articles allow customers to resolve issues without waiting for an agent.',
          whatIf: 'Publishing targeted FAQ guides typically reduces incoming support volume by 25-35%.',
          action: {
            label: 'Draft Common Guide',
            type: 'DRAFT_KB',
            payload: {
              title: 'Frequently Asked Questions & Account Guide',
              category: 'General'
            }
          }
        }
      ]
    };

    // Attempt Gemini AI Synthesis
    try {
      if (process.env.GEMINI_API_KEY) {
        const prompt = `
You are the AI Operations & Strategy Director for an enterprise customer support HelpDesk system named "Horizon".
Analyze the following live support data JSON and generate a structured operational diagnosis with concrete root causes, what-if predictions, and 1-click action plans.

DATA SNAPSHOT:
${dataContext}

Respond ONLY with valid, raw JSON (no markdown formatting, no code block backticks) matching this exact schema:
{
  "healthScore": 85,
  "healthStatus": "HEALTHY", // or "ATTENTION" or "CRITICAL"
  "dailySummary": {
    "headline": "One clear, professional 1-2 sentence executive briefing of today's operational state.",
    "keyHighlights": [
      "Short key bullet point 1",
      "Short key bullet point 2",
      "Short key bullet point 3"
    ]
  },
  "whatIfHero": {
    "title": "Clear title of the single highest-impact action right now",
    "currentPain": "What is the current problem or limitation in 1 sentence",
    "projectedOutcome": "What will specifically improve if this action is taken (e.g. 'Reduces wait time by ~40%')",
    "actionLabel": "Auto-Assign All Tickets", // or "Draft KB Guide" or "Escalate Priority"
    "actionType": "AUTO_ASSIGN", // must be one of: "AUTO_ASSIGN", "DRAFT_KB", "ESCALATE_STALE"
    "actionPayload": {}
  },
  "insights": [
    {
      "id": "insight-1",
      "tag": "Short badge tag (e.g. Backlog Alert, Knowledge Gap, Velocity)",
      "severity": "WARNING", // one of: "CRITICAL", "WARNING", "OPTIMIZATION", "POSITIVE"
      "what": "Clear explanation of what is happening right now in plain English.",
      "why": "Clear root-cause explanation of WHY it is happening based on the actual ticket/agent data.",
      "whatIf": "What specific positive outcome will occur in the future if the action plan is executed.",
      "action": {
        "label": "Button text (e.g. Auto-Assign 3 Tickets)",
        "type": "AUTO_ASSIGN", // one of: "AUTO_ASSIGN", "DRAFT_KB", "ESCALATE_STALE"
        "payload": {
          "suggestedTitle": "Title if drafting KB",
          "suggestedCategory": "Category if drafting KB"
        }
      }
    }
  ]
}

Ensure the output is 100% valid JSON, simple to understand for an admin, and contains 2 to 4 insights.
`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        if (aiResponse.text) {
          const cleanedText = aiResponse.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed && parsed.dailySummary && parsed.insights) {
            analysisResult = parsed;
          }
        }
      }
    } catch (aiErr) {
      console.warn('AI generation skipped or failed, using dynamic heuristics:', aiErr);
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
      rawMetrics: {
        totalTickets,
        activeTicketsCount,
        unassignedCount: unassignedTickets.length,
        resolutionRate,
        agentCount: allActiveAgents.length,
        highPriorityCount: highPriorityTickets.length
      }
    });
  } catch (error: any) {
    console.error('GET /api/horizon error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
