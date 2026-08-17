import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwtToken } from '@/lib/auth';
import HorizonClient from './HorizonClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HorizonPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyJwtToken(token);
  if (!payload) {
    redirect('/login');
  }

  return (
    <div className="flex-1 min-h-screen overflow-y-auto">
      <HorizonClient userRole={payload.role} userEmail={payload.email} />
    </div>
  );
}
