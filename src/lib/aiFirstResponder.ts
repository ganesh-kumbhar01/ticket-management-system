import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function triggerAiFirstResponse(ticketId: string) {
  try {
    // 1. Fetch ticket and the customer's problem description
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      console.warn(`[AI First-Responder] Ticket ${ticketId} not found.`);
      return { success: false, error: 'Ticket not found' };
    }

    const customerMessage = ticket.messages.find((m) => m.senderType === 'STUDENT')?.content || ticket.messages[0]?.content || '';

    if (!customerMessage.trim()) {
      console.warn(`[AI First-Responder] No message content found for ticket ${ticketId}.`);
      return { success: false, error: 'No content to analyze' };
    }

    // 2. Fetch Knowledge Base Context
    let kbContext = '';
    try {
      // Try semantic vector search first if pgvector is enabled
      const embeddingRes = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: `Subject: ${ticket.subject}\n\nProblem: ${customerMessage}`,
      });
      const queryEmbedding = embeddingRes.embeddings?.[0]?.values;

      if (queryEmbedding && queryEmbedding.length > 0) {
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        const articles = await prisma.$queryRaw<any[]>`
          SELECT id, title, content, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
          FROM "KnowledgeArticle"
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT 3
        `;
        if (articles && articles.length > 0) {
          kbContext = articles.map((a) => `### Article: ${a.title}\n${a.content}`).join('\n\n');
        }
      }
    } catch (vectorErr) {
      console.warn('[AI First-Responder] Vector search fallback to text lookup:', vectorErr);
    }

    // Fallback if vector search returns empty: retrieve all articles
    if (!kbContext) {
      try {
        const rawArticles = await prisma.$queryRaw<any[]>`
          SELECT id, title, content FROM "KnowledgeArticle" LIMIT 5
        `;
        if (rawArticles && rawArticles.length > 0) {
          kbContext = rawArticles.map((a) => `### Article: ${a.title}\n${a.content}`).join('\n\n');
        }
      } catch (rawErr) {
        console.warn('[AI First-Responder] Could not load knowledge articles:', rawErr);
      }
    }

    // 3. Construct High-Accuracy Gemini Prompt
    const prompt = `
You are the AI First-Responder Support Copilot for our HelpDesk platform.
A customer has just submitted a support ticket. Your goal is to analyze their problem, review our Knowledge Base articles, and provide an instant, polite, clear, and actionable troubleshooting guide (Self-Service) to help them solve their issue right away.

--- CUSTOMER TICKET ---
Subject: ${ticket.subject}
Customer Email: ${ticket.studentEmail}
Category: ${ticket.category}
Problem Description:
"${customerMessage}"
-----------------------

--- KNOWLEDGE BASE CONTEXT ---
${kbContext || 'General technical and student support guidance applies.'}
------------------------------

INSTRUCTIONS:
1. Provide a warm, reassuring greeting acknowledging their specific issue.
2. Provide 2 to 3 clear, step-by-step, actionable troubleshooting steps (e.g. for login issues: cache clearing, password reset link, credential checking; for billing: receipt verification, bank UTR check).
3. Keep the tone empathetic, professional, and easy to read with bullet points or numbered lists.
4. Clearly mention that if these steps do not resolve their issue, our live support agent team will immediately take over and assist them.
5. Do NOT include placeholders like "[Your Name]" or "[Support Team]". End warmly as "Support AI Assistant".
`;

    let aiReplyText = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        aiReplyText = response.text || '';
      } catch (genErr) {
        // Fallback gracefully without error
      }
    }

    // Fallback if Gemini generation is empty or unavailable
    if (!aiReplyText) {
      aiReplyText = `Hello,\n\nThank you for reaching out to our support team regarding "${ticket.subject}".\n\nHere are a few quick steps that resolve most common issues:\n\n1. **Verify Credentials & Session:** Please try logging out, clearing your browser cache/cookies, and logging back in.\n2. **Password / Token Reset:** If you are experiencing access issues, request a fresh password reset link.\n3. **Network & Device:** Ensure you are not connected to a restrictive VPN or firewall.\n\nIf these steps do not solve your problem, simply reply to this email or let us know, and a live support agent will assist you directly!`;
    }

    // 4. Save the AI Response message to the ticket thread
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        senderType: 'AI_DRAFT',
        content: aiReplyText,
      },
    });

    // 5. Update ticket status to PENDING_CUSTOMER
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'PENDING_CUSTOMER',
      },
    });

    // 6. Record system audit note
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        content: `🤖 AI Knowledge First-Responder analyzed ticket and dispatched instant troubleshooting steps to ${ticket.studentEmail}.`,
      },
    });

    // 7. Dispatch Instant Auto-Reply Email to the Customer
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const solvedLink = `${baseUrl}/api/tickets/${ticket.id}/feedback?action=SOLVED`;
    const needHumanLink = `${baseUrl}/api/tickets/${ticket.id}/feedback?action=NEED_HUMAN`;

    // Convert newlines in AI text to HTML paragraphs/breaks
    const formattedHtmlBody = aiReplyText
      .split('\n\n')
      .map((para) => `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #334155;">${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; color: white;">
          <span style="background: rgba(255,255,255,0.2); color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
            🤖 AI Instant Support Assistant
          </span>
          <h2 style="margin: 10px 0 4px 0; font-size: 20px; font-weight: 800;">
            Troubleshooting Guide for: ${ticket.subject}
          </h2>
          <p style="margin: 0; opacity: 0.9; font-size: 13px;">
            Ticket #${ticket.id.slice(0, 8)} • Instant Knowledge Base Assistance
          </p>
        </div>

        <!-- AI Content -->
        <div style="padding: 24px;">
          <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            ${formattedHtmlBody}
          </div>

          <!-- Interactive Feedback Actions -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 800; color: #166534;">
              Did these steps solve your problem?
            </p>
            <div style="display: flex; justify-content: center; gap: 12px;">
              <a href="${solvedLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);">
                ✅ Yes, Issue Solved!
              </a>
              <a href="${needHumanLink}" style="display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);">
                👤 No, I Need a Support Agent
              </a>
            </div>
          </div>

          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            You can also reply directly to this email at any time to connect with a human support agent.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: ticket.studentEmail,
      subject: `Re: [Ticket #${ticket.id.slice(0, 8)}] 🤖 Instant AI Solution Steps: ${ticket.subject}`,
      text: `${aiReplyText}\n\nDid this solve your problem?\n- Yes: ${solvedLink}\n- No (Connect with Agent): ${needHumanLink}\n\nYou can also reply to this email to speak with a support agent.`,
      html: emailHtml,
    });

    console.log(`[AI First-Responder] Dispatched AI response for ticket ${ticket.id} to ${ticket.studentEmail}`);
    return { success: true, aiReplyText };
  } catch (error) {
    console.error('[AI First-Responder] Error executing AI first response:', error);
    return { success: false, error: 'Internal AI response error' };
  }
}
