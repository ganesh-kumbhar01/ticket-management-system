import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import UserDetailClient from './UserDetailClient';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyJwtToken(token);
  if (!payload || payload.role !== 'ADMIN') redirect('/dashboard');

  const user = await prisma.user.findUnique({
    where: { id: resolvedParams.id },
    include: {
      assignedTickets: {
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
      }
    }
  });

  if (!user) {
    redirect('/dashboard/users');
  }

  // Convert dates to ISO strings for client component
  const safeUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    resetTokenExpiry: user.resetTokenExpiry?.toISOString() || null,
    assignedTickets: user.assignedTickets.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    }))
  };

  return (
    <UserDetailClient user={safeUser} />
  );
}
