import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import KnowledgeClient from './KnowledgeClient';

export default async function KnowledgePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyJwtToken(token);
  if (!payload) {
    redirect('/login');
  }

  const isAdmin = payload.role === 'ADMIN';

  // Retrieve without embedding to save bandwidth
  const articles = await prisma.$queryRaw<any[]>`
    SELECT id, title, content, "createdAt", "updatedAt"
    FROM "KnowledgeArticle"
    ORDER BY "createdAt" DESC
  `;

  return <KnowledgeClient initialArticles={articles} isAdmin={isAdmin} />;
}
