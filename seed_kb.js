require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('./src/generated/prisma');

const pg = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const articles = [
  {
    title: 'How to reset your password',
    content: 'If you have forgotten your password, please go to the login page and click on \'Forgot Password\'. You will receive an email with a secure link. Click the link and follow the on-screen instructions to set a new password. If you do not receive the email within 5 minutes, please check your spam folder or contact support again.'
  },
  {
    title: 'Standard Refund Policy',
    content: 'We offer a 30-day money-back guarantee on all our software subscriptions. If you are not satisfied within the first 30 days of your purchase, you can request a full refund. Refunds will be processed to the original payment method within 5-7 business days. No refunds are provided after the 30-day period.'
  },
  {
    title: 'How to update billing and account information',
    content: 'To update your billing details or account information, log into your dashboard, click on \'Profile Settings\' in the top right corner, and navigate to the \'Billing\' tab. From there, you can update your credit card, billing address, and subscription plan. Make sure to click \'Save Changes\' at the bottom of the page.'
  }
];

async function main() {
  for (const article of articles) {
    try {
      console.log(`Embedding article: ${article.title}`);
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: `Title: ${article.title}\n\nContent: ${article.content}`
      });
      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) throw new Error('Failed to generate embedding');
      
      const embeddingStr = `[${embedding.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "KnowledgeArticle" (id, title, content, embedding, "updatedAt")
        VALUES (gen_random_uuid(), ${article.title}, ${article.content}, ${embeddingStr}::vector, NOW())
      `;
      console.log(`Saved: ${article.title}`);
    } catch (err) {
      console.error(`Error on ${article.title}:`, err.message);
    }
  }
  console.log('Done');
}

main().finally(() => prisma.$disconnect());
