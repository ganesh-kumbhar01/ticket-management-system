"use client";

import { useEffect, useState } from 'react';
import { FileSpreadsheet, Calendar, Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardGreeting({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  const [greeting, setGreeting] = useState<string>('');
  const [isSendingWeekly, setIsSendingWeekly] = useState(false);
  const [isSendingDaily, setIsSendingDaily] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) {
        setGreeting('Good Morning');
      } else if (hour < 17) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSendWeeklyReport = async () => {
    setIsSendingWeekly(true);
    const toastId = toast.loading('Generating 7-day executive report & CSV...');
    try {
      const res = await fetch('/api/reports/weekly', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('📈 Weekly Executive Report sent to your mailbox!', { id: toastId });
      } else {
        throw new Error(data.error || data.message || 'Failed to dispatch report');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch weekly report', { id: toastId });
    } finally {
      setIsSendingWeekly(false);
    }
  };

  const handleSendDailyReport = async () => {
    setIsSendingDaily(true);
    const toastId = toast.loading('Generating Daily EOD report & CSV...');
    try {
      const res = await fetch('/api/cron/daily-report', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('📅 Daily EOD Report sent to your mailbox!', { id: toastId });
      } else {
        throw new Error(data.error || data.message || 'Failed to dispatch report');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch daily report', { id: toastId });
    } finally {
      setIsSendingDaily(false);
    }
  };

  return (
    <header className="mb-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {greeting ? `${greeting}, ${userName}` : `Welcome back, ${userName}`}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm font-medium">
          {isAdmin
            ? "Here is what's happening with your support system today."
            : "Here is the latest update on your assigned tickets."}
        </p>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSendDailyReport}
            disabled={isSendingDaily}
            className="px-3.5 py-2 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Dispatch Daily 7:00 PM EOD spreadsheet report to your alert mailbox"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isSendingDaily ? 'Sending...' : 'Send Daily Report'}</span>
          </button>

          <button
            onClick={handleSendWeeklyReport}
            disabled={isSendingWeekly}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Dispatch 7-day executive briefing & spreadsheet report to your alert mailbox"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isSendingWeekly ? 'Sending...' : '📈 Send Weekly Report'}</span>
          </button>
        </div>
      )}
    </header>
  );
}
