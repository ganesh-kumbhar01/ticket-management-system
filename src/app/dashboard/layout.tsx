import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AutoEmailSyncer from '@/components/AutoEmailSyncer';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import NotificationBell from '@/components/NotificationBell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="h-screen overflow-hidden flex text-slate-900 font-sans bg-transparent">
      {/* Sidebar Component */}
      <Sidebar isAdmin={isAdmin} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white/40 backdrop-blur-xl border-b border-white/40 flex items-center justify-end px-8 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.05)] z-10">
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard/profile" className="flex items-center space-x-2 px-3 py-1.5 bg-white/50 border border-white/50 hover:bg-white/70 backdrop-blur-md rounded-full text-sm font-semibold transition-colors text-slate-700 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {payload.email[0].toUpperCase()}
              </div>
              <span className="pr-2">{isAdmin ? 'Admin Profile' : 'Agent Profile'}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
      <AutoEmailSyncer />
      <RealTimeNotifications />
    </div>
  );
}
