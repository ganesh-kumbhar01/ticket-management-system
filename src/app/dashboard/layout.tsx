import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AutoEmailSyncer from '@/components/AutoEmailSyncer';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import NotificationBell from '@/components/NotificationBell';
import LogoutButton from '@/components/LogoutButton';
import GlobalSearch from '@/components/GlobalSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { UserCircle } from 'lucide-react';

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
    <div className="h-screen overflow-hidden flex text-slate-900 dark:text-white dark:text-white dark:text-slate-100 font-sans bg-transparent transition-colors duration-300">
      {/* Sidebar Component */}
      <Sidebar isAdmin={isAdmin} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/40 dark:border-slate-800/50 flex items-center justify-end pl-16 pr-4 md:px-8 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.05)] z-10">
          <div className="flex flex-1 justify-end items-center gap-2 sm:gap-4 px-4 sm:px-6">
            <GlobalSearch />
            <ThemeToggle />
            <NotificationBell />
            <UserProfileDropdown email={payload.email} isAdmin={isAdmin} />
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
