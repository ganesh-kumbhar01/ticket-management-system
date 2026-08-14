"use client";

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, Compass, Users, BookOpen, UserCircle, ShieldCheck } from 'lucide-react';

export default function CurrentSectionHeader() {
  const pathname = usePathname();

  const getSectionInfo = () => {
    if (pathname === '/dashboard') {
      return { title: 'Dashboard', subtitle: 'Overview & Metrics', icon: LayoutDashboard };
    }
    if (pathname.startsWith('/dashboard/tickets/') && pathname !== '/dashboard/tickets') {
      return { title: 'Ticket Detail', subtitle: 'Conversation & Resolution', icon: Ticket };
    }
    if (pathname.startsWith('/dashboard/tickets')) {
      return { title: 'Tickets', subtitle: 'Support Queue & Management', icon: Ticket };
    }
    if (pathname.startsWith('/dashboard/horizon')) {
      return { title: 'Horizon', subtitle: 'AI Operations & Strategy', icon: Compass, isAI: true };
    }
    if (pathname.startsWith('/dashboard/users')) {
      return { title: 'Agents & Users', subtitle: 'Team & Permissions', icon: Users };
    }
    if (pathname.startsWith('/dashboard/knowledge')) {
      return { title: 'Knowledge Base', subtitle: 'Self-Service Articles', icon: BookOpen };
    }
    if (pathname.startsWith('/dashboard/profile')) {
      return { title: 'Profile & Settings', subtitle: 'Account Preferences', icon: UserCircle };
    }
    return { title: 'HelpDesk', subtitle: 'Support Portal', icon: LayoutDashboard };
  };

  const { title, subtitle, icon: Icon, isAI } = getSectionInfo();

  return (
    <div className="flex items-center gap-2.5 mr-auto">
      <div className={`p-1.5 rounded-lg ${
        isAI 
          ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm' 
          : 'bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white tracking-tight leading-none">
            {title}
          </span>
          {isAI && (
            <span className="px-1.5 py-0.2 text-[9px] font-black uppercase bg-indigo-600 text-white rounded">
              AI
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block leading-none mt-0.5">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
