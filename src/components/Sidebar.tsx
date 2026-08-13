"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Users, FileText, Settings, BookOpen, LogOut, Menu, X } from 'lucide-react';

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-4 z-50 p-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-lg shadow-sm border border-white/40 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl border-r border-white/40 dark:border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen flex flex-col shrink-0 z-50`}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            HelpDesk
          </h1>
        </div>
        <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto" onClick={() => setIsOpen(false)}>
        <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-300 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:shadow-sm hover:text-slate-900 dark:text-white dark:text-white dark:hover:text-white transition-colors">
          <LayoutDashboard className="w-5 h-5 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
          <span>Dashboard</span>
        </Link>
        
        <Link href="/dashboard/tickets" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-300 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:shadow-sm hover:text-slate-900 dark:text-white dark:text-white dark:hover:text-white transition-colors">
          <Ticket className="w-5 h-5 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
          <span>Tickets</span>
        </Link>

        {isAdmin && (
          <Link href="/dashboard/users" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-300 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:shadow-sm hover:text-slate-900 dark:text-white dark:text-white dark:hover:text-white transition-colors">
            <Users className="w-5 h-5 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
            <span>Agents & Users</span>
          </Link>
        )}

        <Link href="/dashboard/knowledge" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 dark:text-slate-300 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:shadow-sm hover:text-slate-900 dark:text-white dark:text-white dark:hover:text-white transition-colors">
          <BookOpen className="w-5 h-5 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
          <span>Knowledge Base</span>
        </Link>

        {/* Future links disabled for MVP
        <Link href="/dashboard/customers" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 cursor-not-allowed">
          <Users className="w-5 h-5 opacity-50" />
          <span>Customers</span>
        </Link>
        
        <Link href="/dashboard/reports" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 cursor-not-allowed">
          <FileText className="w-5 h-5 opacity-50" />
          <span>Reports</span>
        </Link>

        <Link href="/dashboard/settings" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 dark:text-slate-500 dark:text-slate-500 cursor-not-allowed">
          <Settings className="w-5 h-5 opacity-50" />
          <span>Settings</span>
        </Link>
        */}
      </nav>

      <div className="p-4 border-t border-white/40 dark:border-slate-800">
        <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/50 hover:shadow-sm transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
    </>
  );
}
