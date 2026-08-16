"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, X } from 'lucide-react';

export default function AutoEmailSyncer() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const router = useRouter();

  const doSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const res = await fetch('/api/tickets/sync-emails', { method: 'POST', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.processedCount > 0) {
          setToastMessage(`📬 Received ${data.processedCount} new email ticket(s)! Queue updated.`);
          router.refresh();
          
          setTimeout(() => {
            setToastMessage(null);
          }, 6000);
        }
      }
    } catch (err) {
      console.error('Auto sync check failed', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    // Initial sync on mount after 2 seconds
    const initialTimer = setTimeout(() => {
      doSync();
    }, 2000);

    // Fast polling every 25 seconds for real-time ticket ingestion
    const interval = setInterval(() => {
      doSync();
    }, 25000);

    // Also sync when user focuses tab back
    const handleFocus = () => {
      doSync();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [doSync]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 shadow-2xl rounded-2xl p-4 pr-12 relative flex items-start gap-3.5 max-w-sm">
        <div className="bg-blue-600 text-white p-2.5 rounded-xl shrink-0 shadow-md shadow-blue-600/30">
          <Mail className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">New Email Ticket Received</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">{toastMessage}</p>
        </div>
        <button 
          onClick={() => setToastMessage(null)}
          className="absolute top-3 right-3 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-300 p-1.5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
