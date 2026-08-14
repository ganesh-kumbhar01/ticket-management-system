"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  BookOpen, 
  LogOut, 
  Menu, 
  X, 
  Compass 
} from 'lucide-react';

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  // Route active state checkers
  const isDashboardActive = pathname === '/dashboard';
  const isTicketsActive = pathname.startsWith('/dashboard/tickets');
  const isHorizonActive = pathname.startsWith('/dashboard/horizon');
  const isUsersActive = pathname.startsWith('/dashboard/users');
  const isKnowledgeActive = pathname.startsWith('/dashboard/knowledge');

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-4 z-50 p-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-md border border-white/40 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-all"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-r border-white/40 dark:border-slate-800/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen flex flex-col shrink-0 z-50`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                HelpDesk
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Support OS
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto" onClick={() => setIsOpen(false)}>
          {/* Dashboard Link */}
          <Link 
            href="/dashboard" 
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              isDashboardActive
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 dark:bg-blue-600 dark:text-white'
                : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Dashboard</span>
            {isDashboardActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            )}
          </Link>
          
          {/* Tickets Link */}
          <Link 
            href="/dashboard/tickets" 
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              isTicketsActive
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 dark:bg-blue-600 dark:text-white'
                : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Ticket className={`w-5 h-5 ${isTicketsActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Tickets</span>
            {isTicketsActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            )}
          </Link>

          {/* Horizon (AI Operations) Link - Admin Only */}
          {isAdmin && (
            <Link 
              href="/dashboard/horizon" 
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isHorizonActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-md shadow-indigo-500/30'
                  : 'font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 border border-indigo-200/40 dark:border-indigo-800/30'
              }`}
            >
              <Compass className={`w-5 h-5 ${isHorizonActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
              <span className="font-bold">Horizon</span>
              <span className={`ml-auto px-1.5 py-0.5 text-[10px] uppercase font-black rounded ${
                isHorizonActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-indigo-600 text-white'
              }`}>
                AI
              </span>
            </Link>
          )}

          {/* Agents & Users Link - Admin Only */}
          {isAdmin && (
            <Link 
              href="/dashboard/users" 
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isUsersActive
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 dark:bg-blue-600 dark:text-white'
                  : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className={`w-5 h-5 ${isUsersActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>Agents & Users</span>
              {isUsersActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </Link>
          )}

          {/* Knowledge Base Link */}
          <Link 
            href="/dashboard/knowledge" 
            className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              isKnowledgeActive
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 dark:bg-blue-600 dark:text-white'
                : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${isKnowledgeActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Knowledge Base</span>
            {isKnowledgeActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            )}
          </Link>
        </nav>

        <div className="p-4 border-t border-white/40 dark:border-slate-800/60">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 hover:shadow-sm transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
