import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');
  
  const payload = await verifyJwtToken(token);
  if (!payload) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      notificationEmail: true,
      receiveAlerts: true,
      role: true,
      status: true,
      createdAt: true
    }
  });

  if (!user) redirect('/login');

  return <ProfileClient user={user} />;
}

