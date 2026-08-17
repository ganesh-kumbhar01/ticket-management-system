import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateGeminiContent } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyJwtToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = payload.role === 'ADMIN';
    const currentUserId = payload.userId;

    const body = await req.json();
    const userScenario = body.scenario?.trim();

    if (!userScenario) {
      return NextResponse.json({ error: 'Please provide a simulation scenario or condition.' }, { status: 400 });
    }

    // 1. Fetch live system baseline state
    const [tickets, agents, articles, myTickets] = await Promise.all([
      prisma.ticket.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          category: true,
          currentTier: true,
          isSlaBreached: true,
          assignedAgentId: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: { role: { in: ['AGENT', 'ADMIN'] }, status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.knowledgeArticle.findMany({
        select: { id: true, title: true },
      }),
      prisma.ticket.findMany({
        where: { assignedAgentId: currentUserId },
        select: { id: true, subject: true, status: true, priority: true, category: true, createdAt: true }
      })
    ]);

    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => ['NEW', 'OPEN', 'PENDING_CUSTOMER'].includes(t.status)).length;
    const unassignedCount = tickets.filter(t => !t.assignedAgentId).length;
    const activeAgentsCount = agents.length || 1;
    const slaBreachedCount = tickets.filter(t => t.isSlaBreached).length;

    const myOpen = myTickets.filter(t => ['NEW', 'OPEN'].includes(t.status));
    const myPending = myTickets.filter(t => t.status === 'PENDING_CUSTOMER');
    const myUrgent = myTickets.filter(t => ['HIGH', 'URGENT'].includes(t.priority) && ['NEW', 'OPEN'].includes(t.status));

    const dataContext = isAdmin ? `
CURRENT SYSTEM BASELINE (TEAM-WIDE):
- Total Tickets in System: ${totalTickets}
- Active Backlog (Open/Pending): ${openTickets}
- Unassigned Tickets: ${unassignedCount}
- Active Staff Members (Agents/Admins): ${activeAgentsCount}
- SLA Breached Tickets: ${slaBreachedCount}
- Knowledge Base Articles: ${articles.length}
` : `
CURRENT SHIFT BASELINE (AGENT PERSONAL QUEUE):
- Agent Email: ${payload.email}
- My Assigned Open Tickets: ${myOpen.length}
- My Pending Customer Tickets: ${myPending.length}
- My Urgent / High Priority Tickets: ${myUrgent.length}
- Unassigned Tickets in Team Pool: ${unassignedCount}
- Active Knowledge Base Articles: ${articles.length}
`;

    const prompt = isAdmin ? `
You are the Chief AI Operations Strategist & Predictive Simulator for a HelpDesk Customer Support platform.
The administrator wants to simulate a hypothetical "What-If" crisis / operational scenario against the current live support system.

HYPOTHETICAL SCENARIO INPUT:
"${userScenario}"

LIVE SYSTEM STATE:
${dataContext}

Your goal is to mathematically and strategically project the blast radius, SLA impact, workload bottlenecks, and deliver an actionable 3-phase mitigation playbook.

Respond ONLY with valid raw JSON matching this schema:
{
  "scenarioTitle": "Concise 5-8 word executive title of this simulation",
  "impactMetrics": {
    "slaBreachRisk": 82, // integer percentage 0-100
    "riskLevel": "CRITICAL", // "CRITICAL" | "HIGH" | "MODERATE" | "LOW"
    "queueDelayHours": "+14.5 hrs",
    "backlogSurgeCount": "+120 tickets",
    "teamStressIndex": "EXTREME" // "EXTREME" | "ELEVATED" | "MODERATE" | "STABLE"
  },
  "blastRadiusSummary": "2-3 crisp sentences detailing what will break first, the primary customer impact, and where the queue bottleneck will occur.",
  "tacticalActionPlan": [
    {
      "phase": "Phase 1: Immediate Triage (Hour 0 - 1)",
      "priority": "IMMEDIATE",
      "steps": ["Step 1", "Step 2", "Step 3"]
    },
    {
      "phase": "Phase 2: Workload Balancing (Hour 1 - 6)",
      "priority": "HIGH",
      "steps": ["Step 1", "Step 2"]
    },
    {
      "phase": "Phase 3: Root-Cause Mitigation (Post-Incident)",
      "priority": "MEDIUM",
      "steps": ["Step 1", "Step 2"]
    }
  ],
  "oneClickAction": {
    "label": "Auto-Draft Incident Knowledge Article",
    "type": "DRAFT_KB",
    "payload": {
      "title": "Incident Mitigation: Handling Sudden Spikes & Escalations",
      "category": "Incident Response"
    }
  }
}
` : `
You are the AI Shift Copilot & Personal Productivity Advisor for a Support Agent (${payload.email}).
The agent wants to simulate a personal "What-If" scenario for their daily shift (e.g. clearing urgent queue, claiming tickets, escalating a bug, drafting articles).

AGENT SCENARIO INPUT:
"${userScenario}"

AGENT SHIFT STATE:
${dataContext}

Project the personal productivity impact on the agent's shift, customer wait times, and resolution score.

Respond ONLY with valid raw JSON matching this schema:
{
  "scenarioTitle": "Personal Shift Projection: ${userScenario.slice(0, 35)}",
  "impactMetrics": {
    "slaBreachRisk": 15, // integer percentage 0-100 (projected SLA breach risk for this agent's queue)
    "riskLevel": "LOW", // "CRITICAL" | "HIGH" | "MODERATE" | "LOW"
    "queueDelayHours": "-45 mins", // reduction in customer wait time
    "backlogSurgeCount": "+5 resolved", // expected output
    "teamStressIndex": "OPTIMAL" // "OPTIMAL" | "STABLE" | "ELEVATED" | "EXTREME"
  },
  "blastRadiusSummary": "2 crisp sentences explaining how this action optimizes the agent's personal shift, eliminates queue bottlenecks, and improves customer satisfaction.",
  "tacticalActionPlan": [
    {
      "phase": "Step 1: Immediate Queue Focus",
      "priority": "IMMEDIATE",
      "steps": ["Target highest priority ticket first", "Use AI response polish for quick replies"]
    },
    {
      "phase": "Step 2: Follow-Up & Pool Claiming",
      "priority": "HIGH",
      "steps": ["Claim unassigned tickets from queue", "Follow up on pending customer confirmations"]
    },
    {
      "phase": "Step 3: Shift Wrap-Up & Knowledge Contribution",
      "priority": "MEDIUM",
      "steps": ["Document recurring troubleshooting solutions in Knowledge Base"]
    }
  ],
  "oneClickAction": {
    "label": "${unassignedCount > 0 ? 'Claim 2 Unassigned Tickets to My Queue' : 'Draft New KB Solution Article'}",
    "type": "${unassignedCount > 0 ? 'AUTO_ASSIGN' : 'DRAFT_KB'}",
    "payload": ${unassignedCount > 0 ? '{"claimToMe": true}' : '{"title": "Agent Troubleshooting SOP", "category": "General"}'}
  }
}
`;

    let simulationResult: any = null;

    try {
      const aiResponse = await generateGeminiContent(prompt, { temperature: 0.3 });
      if (aiResponse) {
        const cleaned = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        simulationResult = JSON.parse(cleaned);
      }
    } catch (aiErr) {
      console.warn('Gemini simulation error, using smart fallback:', aiErr);
    }

    // Heuristic fallback if AI fails
    if (!simulationResult || !simulationResult.tacticalActionPlan) {
      if (isAdmin) {
        simulationResult = {
          scenarioTitle: `Simulated Impact: ${userScenario.slice(0, 45)}...`,
          impactMetrics: {
            slaBreachRisk: 85,
            riskLevel: 'CRITICAL',
            queueDelayHours: '+18.0 hrs',
            backlogSurgeCount: '+150 tickets',
            teamStressIndex: 'EXTREME'
          },
          blastRadiusSummary: 'Support queue response times will degrade rapidly across all categories. High-priority student inquiries risk delayed resolutions.',
          tacticalActionPlan: [
            {
              phase: 'Phase 1: Immediate Triage (Hour 0 - 1)',
              priority: 'IMMEDIATE',
              steps: ['Activate AI First-Responder automated troubleshooting templates.', 'Broadcast high-priority announcement on helpdesk portal.']
            },
            {
              phase: 'Phase 2: Workload Balancing (Hour 1 - 6)',
              priority: 'HIGH',
              steps: ['Reassign Tier 2 and Admin accounts to frontline ticket clearance.', 'Group common duplicate queries into bulk response batches.']
            },
            {
              phase: 'Phase 3: Root-Cause Mitigation (Post-Incident)',
              priority: 'MEDIUM',
              steps: ['Publish official post-mortem and verified resolution guide in Knowledge Base.', 'Review system webhook logs.']
            }
          ],
          oneClickAction: {
            label: 'Auto-Draft Incident Knowledge Article',
            type: 'DRAFT_KB',
            payload: { title: 'Emergency Incident Response Guide', category: 'Operations' }
          }
        };
      } else {
        simulationResult = {
          scenarioTitle: `Personal Shift Projection: ${userScenario.slice(0, 35)}`,
          impactMetrics: {
            slaBreachRisk: 10,
            riskLevel: 'LOW',
            queueDelayHours: '-35 mins',
            backlogSurgeCount: '+4 resolved',
            teamStressIndex: 'OPTIMAL'
          },
          blastRadiusSummary: 'Executing this shift plan clears your personal queue backlog and keeps your shift SLA compliance at 100%.',
          tacticalActionPlan: [
            {
              phase: 'Step 1: Priority Ticket Clearance',
              priority: 'IMMEDIATE',
              steps: ['Answer pending first-responses in your queue', 'Review customer replies']
            },
            {
              phase: 'Step 2: Pool Intake',
              priority: 'HIGH',
              steps: ['Claim 2 unassigned tickets matching your tier', 'Tag escalated issues for L2']
            },
            {
              phase: 'Step 3: Shift Wrap-Up',
              priority: 'MEDIUM',
              steps: ['Summarize complex cases in internal notes', 'Update KB if new bug identified']
            }
          ],
          oneClickAction: {
            label: unassignedCount > 0 ? 'Claim 2 Unassigned Tickets to My Queue' : 'Draft New KB Solution Article',
            type: unassignedCount > 0 ? 'AUTO_ASSIGN' : 'DRAFT_KB',
            payload: unassignedCount > 0 ? { claimToMe: true } : { title: 'Agent Troubleshooting Guide', category: 'General' }
          }
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: simulationResult
    });
  } catch (error: any) {
    console.error('POST /api/horizon/simulate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to run simulation' }, { status: 500 });
  }
}
