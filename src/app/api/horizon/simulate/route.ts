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

    const body = await req.json();
    const userScenario = body.scenario?.trim();

    if (!userScenario) {
      return NextResponse.json({ error: 'Please provide a simulation scenario or condition.' }, { status: 400 });
    }

    // 1. Fetch live system baseline state
    const [tickets, agents, articles] = await Promise.all([
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
    ]);

    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => ['NEW', 'OPEN', 'PENDING_CUSTOMER'].includes(t.status)).length;
    const unassignedCount = tickets.filter(t => !t.assignedAgentId).length;
    const activeAgentsCount = agents.length || 1;
    const slaBreachedCount = tickets.filter(t => t.isSlaBreached).length;

    const dataContext = `
CURRENT SYSTEM BASELINE:
- Total Tickets in System: ${totalTickets}
- Active Backlog (Open/Pending): ${openTickets}
- Unassigned Tickets: ${unassignedCount}
- Active Staff Members (Agents/Admins): ${activeAgentsCount}
- SLA Breached Tickets: ${slaBreachedCount}
- Knowledge Base Articles: ${articles.length}
`;

    const prompt = `
You are the Chief AI Operations Strategist & Predictive Simulator for a HelpDesk Customer Support platform.
The administrator wants to simulate a hypothetical "What-If" crisis / operational scenario against the current live support system.

HYPOTHETICAL SCENARIO INPUT:
"${userScenario}"

LIVE SYSTEM STATE:
${dataContext}

Your goal is to mathematically and strategically project the blast radius, SLA impact, workload bottlenecks, and deliver an actionable 3-phase mitigation playbook.

Respond ONLY with valid raw JSON (no markdown formatting, no code block backticks) matching this exact schema:
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
      "steps": [
        "Actionable concrete step 1",
        "Actionable concrete step 2",
        "Actionable concrete step 3"
      ]
    },
    {
      "phase": "Phase 2: Workload Balancing (Hour 1 - 6)",
      "priority": "HIGH",
      "steps": [
        "Actionable concrete step 1",
        "Actionable concrete step 2"
      ]
    },
    {
      "phase": "Phase 3: Root-Cause Mitigation (Post-Incident)",
      "priority": "MEDIUM",
      "steps": [
        "Actionable concrete step 1",
        "Actionable concrete step 2"
      ]
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
`;

    let simulationResult: any = null;

    try {
      const aiResponse = await generateGeminiContent(prompt, { temperature: 0.3 });
      if (aiResponse) {
        const cleaned = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
        simulationResult = JSON.parse(cleaned);
      }
    } catch (aiErr) {
      console.warn('Gemini simulation error, using smart rule-based simulator:', aiErr);
    }

    // Smart heuristic fallback if AI is slow
    if (!simulationResult || !simulationResult.tacticalActionPlan) {
      const isHighVolume = userScenario.toLowerCase().includes('surge') || userScenario.toLowerCase().includes('100') || userScenario.toLowerCase().includes('500') || userScenario.toLowerCase().includes('traffic');
      const isStaffShortage = userScenario.toLowerCase().includes('leave') || userScenario.toLowerCase().includes('staff') || userScenario.toLowerCase().includes('agent');
      const isPaymentIssue = userScenario.toLowerCase().includes('payment') || userScenario.toLowerCase().includes('refund') || userScenario.toLowerCase().includes('gateway');

      simulationResult = {
        scenarioTitle: `Simulated Impact: ${userScenario.slice(0, 45)}...`,
        impactMetrics: {
          slaBreachRisk: isHighVolume || isStaffShortage ? 85 : 68,
          riskLevel: isHighVolume || isStaffShortage ? 'CRITICAL' : 'HIGH',
          queueDelayHours: isHighVolume ? '+18.0 hrs' : '+12.5 hrs',
          backlogSurgeCount: isHighVolume ? '+150 tickets' : '+45 tickets',
          teamStressIndex: isStaffShortage ? 'EXTREME' : 'ELEVATED'
        },
        blastRadiusSummary: isPaymentIssue
          ? 'Payment inquiries will monopolize Tier-1 queues within 45 minutes. Expect multiple duplicate tickets per student and high escalation sentiment.'
          : isStaffShortage
          ? 'Agent bandwidth will saturate immediately. Unassigned tickets will breach SLA thresholds within 3.5 hours without redistribution.'
          : 'Support queue response times will degrade rapidly across all categories. High-priority student inquiries risk delayed resolutions.',
        tacticalActionPlan: [
          {
            phase: 'Phase 1: Immediate Triage (Hour 0 - 1)',
            priority: 'IMMEDIATE',
            steps: [
              'Activate AI First-Responder automated troubleshooting templates for incoming tickets.',
              'Broadcast high-priority announcement on customer login and helpdesk portals.',
              'Lock low-priority tickets and focus active agents strictly on critical queues.'
            ]
          },
          {
            phase: 'Phase 2: Workload Balancing (Hour 1 - 6)',
            priority: 'HIGH',
            steps: [
              'Reassign Tier 2 and Admin accounts to frontline Tier 1 ticket clearance.',
              'Group common duplicate queries into bulk response batches.'
            ]
          },
          {
            phase: 'Phase 3: Root-Cause Mitigation (Post-Incident)',
            priority: 'MEDIUM',
            steps: [
              'Publish official post-mortem and verified resolution guide in Knowledge Base.',
              'Review gateway/system webhook logs to prevent recurring bottlenecks.'
            ]
          }
        ],
        oneClickAction: {
          label: 'Auto-Draft Incident Knowledge Article',
          type: 'DRAFT_KB',
          payload: {
            title: isPaymentIssue ? 'Payment Gateway Downtime & Refund SOP' : 'Emergency Incident Response Guide',
            category: isPaymentIssue ? 'Billing' : 'Operations'
          }
        }
      };
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
