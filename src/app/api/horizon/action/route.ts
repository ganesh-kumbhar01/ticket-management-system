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
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

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

      // 2. Fetch active agents (excluding inactive)
      const agents = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });

      if (agents.length === 0) {
        return NextResponse.json({ error: 'No active agents available for assignment.' }, { status: 400 });
      }

      // 3. Round-robin assignment
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

      // Use AI if available to write high-quality content
      try {
        if (process.env.GEMINI_API_KEY) {
          const prompt = `Write a comprehensive, professional Knowledge Base article titled "${suggestedTitle}" for our support portal in category "${category}". Provide clear markdown with numbered steps and troubleshooting tips.`;
          const aiRes = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
          });
          if (aiRes.text) {
            generatedContent = aiRes.text;
          }
        }
      } catch (e) {
        console.warn('AI KB generator fallback used:', e);
      }

      const newArticle = await prisma.knowledgeArticle.create({
        data: {
          title: suggestedTitle,
          content: generatedContent
        }
      });

      return NextResponse.json({
        success: true,
        message: `Knowledge Base article "${newArticle.title}" created successfully!`,
        articleId: newArticle.id
      });
    }

    if (actionType === 'ESCALATE_STALE') {
      // Find stale tickets older than 2 hours with LOW/NORMAL priority
      const fourHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const staleTickets = await prisma.ticket.findMany({
        where: {
          status: { in: ['NEW', 'OPEN'] },
          priority: { in: ['LOW', 'NORMAL'] },
          createdAt: { lte: fourHoursAgo }
        }
      });

      if (staleTickets.length === 0) {
        return NextResponse.json({ message: 'No stale tickets found requiring escalation.' });
      }

      for (const t of staleTickets) {
        await prisma.ticket.update({
          where: { id: t.id },
          data: { priority: 'HIGH' }
        });

        await prisma.message.create({
          data: {
            ticketId: t.id,
            senderType: 'SYSTEM',
            content: 'Priority escalated to HIGH by Horizon AI due to wait time.'
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Escalated ${staleTickets.length} ticket(s) to High Priority.`
      });
    }

    return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/horizon/action error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute action' }, { status: 500 });
  }
}
