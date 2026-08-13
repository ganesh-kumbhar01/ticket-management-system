import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const isAdmin = payload.role === 'ADMIN';
    const whereClause = isAdmin ? {} : { assignedAgentId: payload.userId };

    // Search Tickets
    const tickets = await prisma.ticket.findMany({
      where: {
        ...whereClause,
        OR: [
          { id: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { studentEmail: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: 5,
    });

    // Search Users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: 3,
    });

    // Search Knowledge Base
    const kb = await prisma.knowledgeArticle.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: 3,
    });

    const results = [
      ...tickets.map(t => ({
        type: 'ticket',
        id: t.id,
        title: t.subject,
        subtitle: `#${t.id.slice(0, 8)} • ${t.studentEmail}`,
        url: `/dashboard/tickets/${t.id}`
      })),
      ...users.map(u => ({
        type: 'user',
        id: u.id,
        title: u.name || 'Unknown',
        subtitle: u.email,
        url: isAdmin ? `/dashboard/users/${u.id}` : '#'
      })),
      ...kb.map(k => ({
        type: 'knowledge',
        id: k.id,
        title: k.title,
        subtitle: 'Knowledge Base',
        url: '/dashboard/knowledge'
      }))
    ];

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
