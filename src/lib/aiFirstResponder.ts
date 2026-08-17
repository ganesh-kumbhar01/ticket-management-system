import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { generateGeminiContent } from '@/lib/gemini';
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

    // 3. Construct High-Accuracy Gemini Prompt with Domain Expertise
    const prompt = `
You are a Senior Customer Support Operations Specialist providing an immediate first-response acknowledgment and comprehensive resolution guide.
A customer has submitted a support ticket.

--- CUSTOMER TICKET ---
Subject: ${ticket.subject}
Customer Email: ${ticket.studentEmail}
Category: ${ticket.category}
Problem Description:
"${customerMessage}"
-----------------------

--- KNOWLEDGE BASE CONTEXT ---
${kbContext || 'Standard HelpDesk support and billing guidance applies.'}
------------------------------

INSTRUCTIONS FOR YOUR RESPONSE:
1. Greet the customer professionally and warmly, acknowledging their EXACT situation (e.g. if invoice amount is wrong, address invoice calculation/taxes/discounts; if payment failed, address bank hold/UTR; if video issue, address browser/DRM).
2. Provide a thorough, step-by-step breakdown:
   - Explain why this discrepancy or issue commonly occurs (e.g. GST/taxes applied at checkout, unapplied promo coupons, temporary bank authorization holds, cache mismatches).
   - Provide concrete self-check instructions they can verify right now.
   - For issues requiring human team verification (like updating an invoice, issuing a refund, or reviewing internal ledgers), provide a clear, easy checklist of details the customer should reply with (e.g. Order ID, Expected vs Invoiced amount, copy of receipt).
3. Assure the customer that their ticket is actively in our live support queue and an agent will follow up directly.
4. Keep the formatting neat with bold headings and bullet points.
5. Do NOT include placeholders like "[Your Name]". Sign off as "Support Operations Team".
`;

    const aiReplyText = await generateGeminiContent(prompt, {
      systemInstruction: 'You are an empathetic, expert customer support specialist who provides detailed, accurate, and reassuring troubleshooting solutions.',
      temperature: 0.2,
      maxTokens: 1200,
    });

    // 4. Save the AI Response message to the ticket thread
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        senderType: 'AI_DRAFT',
        content: aiReplyText,
      },
    });

    // 5. Keep ticket in OPEN status so human agents see it as active in their queue
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'OPEN',
      },
    });

    // 6. Record system audit note
    await prisma.message.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        content: `🤖 AI Knowledge First-Responder analyzed ticket and dispatched comprehensive resolution steps to ${ticket.studentEmail}. Ticket remains OPEN in agent queue.`,
      },
    });

    // 7. Dispatch Reassuring, Customer-Centric Email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ticket-management-system-3fy5.vercel.app';
    const solvedLink = `${baseUrl}/api/tickets/${ticket.id}/feedback?action=SOLVED`;

    // Convert newlines in AI text to HTML paragraphs/breaks
    const formattedHtmlBody = aiReplyText
      .split('\n\n')
      .map((para) => `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #1e293b; font-size: 14px;">${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); padding: 24px; color: white;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="background: rgba(255,255,255,0.15); color: #e0e7ff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                ⚡ Instant Support Assistant
              </span>
              <span style="font-size: 12px; color: #c7d2fe; font-weight: 600;">
                Ticket #${ticket.id.slice(0, 8)}
              </span>
            </div>
            <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: #ffffff;">
              Resolution Guide: ${ticket.subject}
            </h2>
          </div>

          <!-- Body Content -->
          <div style="padding: 24px;">
            <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
              ${formattedHtmlBody}
            </div>

            <!-- Support Agent Queue Assurance Notice -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 18px;">🛡️</span>
                <div>
                  <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #1e40af;">
                    Live Agent Review Active
                  </h4>
                  <p style="margin: 0; font-size: 12px; color: #3b82f6; line-height: 1.5;">
                    Your ticket is currently active in our live support queue. If you have any additional details or invoice attachments, simply <strong>reply directly to this email</strong> and our specialist team will handle it.
                  </p>
                </div>
              </div>
            </div>

            <!-- Optional Subtle Resolution Link -->
            <div style="text-align: center; padding-top: 10px; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Did these self-help steps completely solve your question? 
                <a href="${solvedLink}" style="color: #4f46e5; font-weight: bold; text-decoration: underline; margin-left: 4px;">
                  Mark Ticket as Resolved &rarr;
                </a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #64748b;">
              HelpDesk Support System • Reply directly to this email to add more details.
            </p>
          </div>

        </div>
      </div>
    `;

    await sendEmail({
      to: ticket.studentEmail,
      subject: `Re: [Ticket #${ticket.id.slice(0, 8)}] Support Resolution Guide: ${ticket.subject}`,
      text: `${aiReplyText}\n\nLive Support Status: Your ticket is active in our agent queue. Simply reply to this email to add more details or attachments.\n\nIf your issue is already solved, you can close this ticket here: ${solvedLink}`,
      html: emailHtml,
    });

    console.log(`[AI First-Responder] Dispatched refined AI response for ticket ${ticket.id} to ${ticket.studentEmail}`);
    return { success: true, aiReplyText };
  } catch (error) {
    console.error('[AI First-Responder] Error executing AI first response:', error);
    return { success: false, error: 'Internal AI response error' };
  }
}
