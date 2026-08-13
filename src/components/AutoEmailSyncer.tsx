"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, X } from 'lucide-react';

export default function AutoEmailSyncer() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Polling every 30 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/tickets/sync-emails', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.processedCount > 0) {
            setToastMessage(`You have ${data.processedCount} new email(s)! Tickets have been updated.`);
            router.refresh();
            
            // Auto hide toast after 5 seconds
            setTimeout(() => {
              setToastMessage(null);
            }, 5000);
          }
        }
      } catch (err) {
        console.error('Auto sync failed', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 shadow-lg rounded-xl p-4 pr-12 relative flex items-start gap-3 max-w-sm">
        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white dark:text-white">New Mail Received</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium mt-0.5">{toastMessage}</p>
        </div>
        <button 
          onClick={() => setToastMessage(null)}
          className="absolute top-3 right-3 text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-300 dark:text-slate-300 p-1.5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
