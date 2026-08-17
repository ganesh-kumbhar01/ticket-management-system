import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateGeminiContent } from '@/lib/gemini';
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
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = payload.role === 'ADMIN';
    const currentUserId = payload.userId;

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
      recentArticles,
      myAssignedTickets
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
        select: { id: true, subject: true, priority: true, category: true, assignedAgentId: true }
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
          assignedAgentId: true,
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
      }),
      prisma.ticket.findMany({
        where: { assignedAgentId: currentUserId },
        select: { id: true, subject: true, status: true, priority: true, category: true, updatedAt: true }
      })
    ]);

    const myOpenTickets = myAssignedTickets.filter(t => t.status === 'OPEN' || t.status === 'NEW');
    const myPendingTickets = myAssignedTickets.filter(t => t.status === 'PENDING_CUSTOMER');
    const myResolvedTickets = myAssignedTickets.filter(t => t.status === 'RESOLVED');
    const myHighPriority = myAssignedTickets.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT');

    const activeTicketsCount = openTickets + unassignedTickets.length;
    const resolutionRate = totalTickets > 0 
      ? Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100) 
      : 100;

    const myResolutionRate = myAssignedTickets.length > 0
      ? Math.round((myResolvedTickets.length / myAssignedTickets.length) * 100)
      : 100;

    // Build agent workload summary (Admin only sees all, Agent sees general overview)
    const agentWorkloadSummary = allActiveAgents.map(a => ({
      name: a.name || a.email.split('@')[0],
      email: a.email,
      role: a.role,
      openTickets: a.assignedTickets.length
    }));

    // Data Context for Gemini
    const dataContext = JSON.stringify({
      userRole: payload.role,
      userEmail: payload.email,
      isAdmin,
      // Personal Queue Context (Primary for Agents)
      agentPersonalQueue: {
        totalAssigned: myAssignedTickets.length,
        openQueue: myOpenTickets.length,
        awaitingCustomer: myPendingTickets.length,
        resolved: myResolvedTickets.length,
        urgentTickets: myHighPriority.length,
        resolutionRate: `${myResolutionRate}%`,
        sampleOpenTickets: myOpenTickets.slice(0, 5)
      },
      // Pool Context
      systemOverview: {
        totalTickets,
        unassignedCount: unassignedTickets.length,
        unassignedTicketsSample: unassignedTickets.slice(0, 5),
        activeTicketsCount,
        resolutionRate: `${resolutionRate}%`,
        activeAgentCount: allActiveAgents.length,
        ...(isAdmin ? { agentWorkload: agentWorkloadSummary } : {})
      },
      existingKbArticles: recentArticles.map(a => a.title)
    });

    // Default Fallback Data (Heuristic)
    let analysisResult: any;

    if (isAdmin) {
      analysisResult = {
        healthScore: unassignedTickets.length > 3 ? 68 : 92,
        healthStatus: unassignedTickets.length > 3 ? 'ATTENTION' : 'HEALTHY',
        dailySummary: {
          headline: unassignedTickets.length > 0
            ? `System active with ${activeTicketsCount} active tickets and ${unassignedTickets.length} unassigned backlog.`
            : `All support channels operating at peak performance with a ${resolutionRate}% resolution rate.`,
          keyHighlights: [
            `${activeTicketsCount} active tickets across all queues`,
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
              : 'Active agents are actively handling assigned tickets.',
            whatIf: 'Distributing tickets evenly across agents prevents response SLA breaches.',
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
    } else {
      // Agent-Specific Fallback
      analysisResult = {
        healthScore: myOpenTickets.length > 5 ? 74 : 95,
        healthStatus: myOpenTickets.length > 5 ? 'ATTENTION' : 'HEALTHY',
        dailySummary: {
          headline: `Agent Shift Briefing: You have ${myOpenTickets.length} active tickets assigned and ${unassignedTickets.length} unassigned tickets available in the pool.`,
          keyHighlights: [
            `${myOpenTickets.length} open tickets in your personal queue`,
            `${myPendingTickets.length} tickets awaiting customer replies`,
            `${unassignedTickets.length} unassigned tickets ready to claim`
          ]
        },
        whatIfHero: {
          title: unassignedTickets.length > 0 ? 'Claim Available Queue Tickets' : 'Draft Solution Article for Common Issue',
          currentPain: unassignedTickets.length > 0
            ? `There are ${unassignedTickets.length} unassigned tickets in the pool waiting for an agent.`
            : 'Your queue is up-to-date with no pending backlogs.',
          projectedOutcome: unassignedTickets.length > 0
            ? 'Claiming available tickets helps resolve student issues faster and increases team throughput.'
            : 'Documenting known solutions speeds up your future ticket resolutions.',
          actionLabel: unassignedTickets.length > 0 ? 'Claim Unassigned Tickets' : 'Draft Solution Article',
          actionType: unassignedTickets.length > 0 ? 'AUTO_ASSIGN' : 'DRAFT_KB',
          actionPayload: unassignedTickets.length > 0 ? { claimToMe: true } : { title: 'Common Solution Guide', category: 'General' }
        },
        insights: [
          {
            id: 'insight-agent-1',
            tag: 'Personal Queue',
            severity: myOpenTickets.length > 5 ? 'WARNING' : 'POSITIVE',
            what: myOpenTickets.length > 0 
              ? `You have ${myOpenTickets.length} active tickets requiring your review.`
              : 'Your personal ticket queue is clear.',
            why: 'Active student tickets assigned to your shift require responses.',
            whatIf: 'Prioritizing urgent tickets first ensures highest customer satisfaction.',
            action: {
              label: unassignedTickets.length > 0 ? 'Claim 2 Unassigned Tickets' : 'Draft New KB Article',
              type: unassignedTickets.length > 0 ? 'AUTO_ASSIGN' : 'DRAFT_KB',
              payload: unassignedTickets.length > 0 ? { claimToMe: true } : { title: 'Support Resolution Guide' }
            }
          },
          {
            id: 'insight-agent-2',
            tag: 'Knowledge Contribution',
            severity: 'OPTIMIZATION',
            what: 'You can document frequent questions into Knowledge Base articles.',
            why: 'Adding verified solutions allows AI to draft auto-replies for you and other agents.',
            whatIf: 'Saves 3-5 minutes per ticket on repeat customer questions.',
            action: {
              label: 'Draft Solution Guide',
              type: 'DRAFT_KB',
              payload: {
                title: 'HelpDesk Troubleshooting Guide',
                category: 'General'
              }
            }
          }
        ]
      };
    }

    // AI Synthesis using Gemini
    try {
      if (process.env.GEMINI_API_KEY) {
        const prompt = `
You are the AI Assistant in "Horizon" for a HelpDesk support platform.
The user viewing this is: ${isAdmin ? 'an ADMINISTRATOR overseeing the entire team' : `a SUPPORT AGENT (${payload.email}) managing their assigned tickets`}.

DATA SNAPSHOT:
${dataContext}

${isAdmin 
  ? 'Provide an executive team-level operations briefing, team workload health score, and organization-wide actions.'
  : 'Provide an AGENT-FOCUSED briefing tailored to this agent’s shift, their personal open queue, urgent tickets waiting for them, and fast claiming of unassigned tickets.'
}

Respond ONLY with valid, raw JSON (no markdown formatting, no code block backticks) matching this exact schema:
{
  "healthScore": 85,
  "healthStatus": "HEALTHY", // or "ATTENTION" or "CRITICAL"
  "dailySummary": {
    "headline": "One clear, professional 1-2 sentence briefing matching the user's role.",
    "keyHighlights": [
      "Short key bullet point 1",
      "Short key bullet point 2",
      "Short key bullet point 3"
    ]
  },
  "whatIfHero": {
    "title": "Clear title of the single highest-impact action right now",
    "currentPain": "What is the current problem or limitation in 1 sentence",
    "projectedOutcome": "What will specifically improve if this action is taken",
    "actionLabel": "${isAdmin ? 'Auto-Assign All Tickets' : 'Claim Available Tickets'}",
    "actionType": "AUTO_ASSIGN", // must be one of: "AUTO_ASSIGN", "DRAFT_KB", "ESCALATE_STALE"
    "actionPayload": ${isAdmin ? '{}' : '{"claimToMe": true}'}
  },
  "insights": [
    {
      "id": "insight-1",
      "tag": "Short badge tag",
      "severity": "WARNING", // one of: "CRITICAL", "WARNING", "OPTIMIZATION", "POSITIVE"
      "what": "Clear explanation of what is happening in plain English.",
      "why": "Clear root-cause explanation of WHY based on actual data.",
      "whatIf": "What specific positive outcome will occur if action is taken.",
      "action": {
        "label": "Button text",
        "type": "AUTO_ASSIGN", // one of: "AUTO_ASSIGN", "DRAFT_KB", "ESCALATE_STALE"
        "payload": {}
      }
    }
  ]
}

Ensure the output is 100% valid JSON, simple to understand, and contains 2 to 3 insights.
`;

        const resText = await generateGeminiContent(prompt, {
          temperature: 0.2,
        });

        if (resText) {
          const cleanedText = resText.replace(/```json/gi, '').replace(/```/gi, '').trim();
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
        totalTickets: isAdmin ? totalTickets : myAssignedTickets.length,
        activeTicketsCount: isAdmin ? activeTicketsCount : myOpenTickets.length,
        unassignedCount: unassignedTickets.length,
        resolutionRate: isAdmin ? resolutionRate : myResolutionRate,
        agentCount: allActiveAgents.length,
        highPriorityCount: isAdmin ? highPriorityTickets.length : myHighPriority.length
      }
    });
  } catch (error: any) {
    console.error('GET /api/horizon error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
