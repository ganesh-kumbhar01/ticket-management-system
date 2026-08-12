import Link from 'next/link';
import { LayoutDashboard, Ticket, Users, FileText, Settings, BookOpen, LogOut } from 'lucide-react';

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="w-64 bg-white/40 backdrop-blur-2xl border-r border-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-screen flex flex-col shrink-0 z-20">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            SupportHub
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <Link href="/dashboard" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white/60 hover:shadow-sm hover:text-slate-900 transition-colors">
          <LayoutDashboard className="w-5 h-5 text-slate-400" />
          <span>Dashboard</span>
        </Link>
        
        <Link href="/dashboard/tickets" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white/60 hover:shadow-sm hover:text-slate-900 transition-colors">
          <Ticket className="w-5 h-5 text-slate-400" />
          <span>Tickets</span>
        </Link>

        {isAdmin && (
          <Link href="/dashboard/users" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white/60 hover:shadow-sm hover:text-slate-900 transition-colors">
            <Users className="w-5 h-5 text-slate-400" />
            <span>Agents & Users</span>
          </Link>
        )}

        <Link href="/dashboard/knowledge" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white/60 hover:shadow-sm hover:text-slate-900 transition-colors">
          <BookOpen className="w-5 h-5 text-slate-400" />
          <span>Knowledge Base</span>
        </Link>

        {/* Future links disabled for MVP
        <Link href="/dashboard/customers" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 cursor-not-allowed">
          <Users className="w-5 h-5 opacity-50" />
          <span>Customers</span>
        </Link>
        
        <Link href="/dashboard/reports" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 cursor-not-allowed">
          <FileText className="w-5 h-5 opacity-50" />
          <span>Reports</span>
        </Link>

        <Link href="/dashboard/settings" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 cursor-not-allowed">
          <Settings className="w-5 h-5 opacity-50" />
          <span>Settings</span>
        </Link>
        */}
      </nav>

      <div className="p-4 border-t border-white/40">
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50/50 hover:shadow-sm transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
