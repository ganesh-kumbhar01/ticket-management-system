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

import CurrentSectionHeader from '@/components/CurrentSectionHeader';

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
    <div className="h-screen w-full flex text-slate-900 dark:text-slate-100 font-sans overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Global Animated Background Mesh for Dashboard */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/30 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-cyan-400/20 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
      </div>
      
      {/* Dashboard Wrapper with relative positioning so it sits above the mesh */}
      <div className="relative z-10 w-full h-full flex">
      {/* Sidebar Component */}
      <Sidebar isAdmin={isAdmin} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/40 dark:border-slate-800/50 flex items-center justify-between pl-16 pr-4 md:px-8 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.05)] z-10">
          <CurrentSectionHeader />
          <div className="flex justify-end items-center gap-2 sm:gap-4 px-2 sm:px-4">
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
    </div>
  );
}
