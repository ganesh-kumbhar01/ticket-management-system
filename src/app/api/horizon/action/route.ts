import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
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

    const body = await req.json();
    const { actionType, payload: actionPayload } = body;

    if (actionType === 'AUTO_ASSIGN') {
      // 1. Fetch unassigned tickets
      const unassignedTickets = await prisma.ticket.findMany({
        where: { assignedAgentId: null, status: { in: ['NEW', 'OPEN'] } }
      });

      if (unassignedTickets.length === 0) {
        return NextResponse.json({ message: 'No unassigned tickets found in queue.' });
      }

      // If AGENT or actionPayload.claimToMe is true, claim up to 3 tickets directly to this agent
      if (!isAdmin || actionPayload?.claimToMe) {
        const ticketsToClaim = unassignedTickets.slice(0, 3);
        const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });

        for (const ticket of ticketsToClaim) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { assignedAgentId: currentUserId }
          });

          await prisma.message.create({
            data: {
              ticketId: ticket.id,
              senderType: 'SYSTEM',
              content: `Ticket claimed by agent ${currentUser?.name || currentUser?.email || 'Agent'} via Horizon Copilot.`
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: `Claimed ${ticketsToClaim.length} ticket(s) directly to your queue!`
        });
      }

      // Admin logic: Round-robin across all active agents
      const agents = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });

      if (agents.length === 0) {
        return NextResponse.json({ error: 'No active agents available for assignment.' }, { status: 400 });
      }

      let assignedCount = 0;
      for (let i = 0; i < unassignedTickets.length; i++) {
        const ticket = unassignedTickets[i];
        const assignedAgent = agents[i % agents.length];

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { assignedAgentId: assignedAgent.id }
        });

        // Add SYSTEM message
        await prisma.message.create({
          data: {
            ticketId: ticket.id,
            senderType: 'SYSTEM',
            content: `Ticket automatically assigned to ${assignedAgent.name || assignedAgent.email} by Horizon AI Assistant.`
          }
        });

        // Send notification to the agent
        await prisma.notification.create({
          data: {
            userId: assignedAgent.id,
            title: 'New Ticket Assigned',
            message: `Ticket #${ticket.id.slice(0, 8)} (${ticket.subject}) was routed to you by Horizon AI.`,
            type: 'ASSIGNED',
            link: `/dashboard/tickets/${ticket.id}`
          }
        });

        assignedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Successfully auto-assigned ${assignedCount} ticket(s) across ${agents.length} active agent(s)!`
      });
    }

    if (actionType === 'DRAFT_KB') {
      const suggestedTitle = actionPayload?.suggestedTitle || actionPayload?.title || 'HelpDesk Troubleshooting & FAQs';
      const category = actionPayload?.suggestedCategory || actionPayload?.category || 'General';

      let generatedContent = `# ${suggestedTitle}\n\n## Overview\nThis guide provides clear step-by-step solutions for resolving common customer inquiries regarding ${category}.\n\n### Common Solutions:\n1. **Verify Account Details:** Ensure your student profile information is up to date.\n2. **Payment & Billing:** Allow 24-48 hours for automated banking reconciliation.\n3. **Technical Support:** Clear your browser cache or try an incognito window if experiencing dashboard loading delays.\n\n*Created automatically via Horizon AI Ops Advisor.*`;

      // Try generating via Gemini
      try {
        if (process.env.GEMINI_API_KEY) {
          const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Draft a comprehensive, helpful, structured markdown Knowledge Base article titled "${suggestedTitle}" for category "${category}". Include an Overview, Problem Scenarios, and Step-by-Step Resolution steps. Output clean Markdown only.`
          });
          if (res.text) {
            generatedContent = res.text.trim();
          }
        }
      } catch (e) {
        console.warn('Gemini draft generation failed, using fallback template:', e);
      }

      // Generate embedding
      let embeddingStr = '';
      try {
        if (process.env.GEMINI_API_KEY) {
          const embRes = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: `Title: ${suggestedTitle}\n\nContent: ${generatedContent}`
          });
          const emb = embRes.embeddings?.[0]?.values;
          if (emb) embeddingStr = `[${emb.join(',')}]`;
        }
      } catch (e) {
        console.warn('Embedding generation skipped:', e);
      }

      // Save to KnowledgeArticle
      if (embeddingStr) {
        await prisma.$executeRaw`
          INSERT INTO "KnowledgeArticle" ("id", "title", "content", "embedding", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${suggestedTitle}, ${generatedContent}, ${embeddingStr}::vector, NOW(), NOW())
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO "KnowledgeArticle" ("id", "title", "content", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${suggestedTitle}, ${generatedContent}, NOW(), NOW())
        `;
      }

      return NextResponse.json({
        success: true,
        message: `New article "${suggestedTitle}" created and embedded into Knowledge Base!`
      });
    }

    if (actionType === 'ESCALATE_STALE') {
      const staleDate = new Date();
      staleDate.setHours(staleDate.getHours() - 24);
      const activeStatuses: ('NEW' | 'OPEN')[] = ['NEW', 'OPEN'];

      const staleTickets = await prisma.ticket.findMany({
        where: isAdmin 
          ? { status: { in: activeStatuses }, updatedAt: { lte: staleDate } }
          : { status: { in: activeStatuses }, updatedAt: { lte: staleDate }, assignedAgentId: currentUserId }
      });

      if (staleTickets.length === 0) {
        return NextResponse.json({ message: 'No stale tickets (>24h without updates) found.' });
      }

      await prisma.ticket.updateMany({
        where: { id: { in: staleTickets.map(t => t.id) } },
        data: { priority: 'URGENT' }
      });

      return NextResponse.json({
        success: true,
        message: `Escalated ${staleTickets.length} ticket(s) to URGENT priority.`
      });
    }

    return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/horizon/action error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
