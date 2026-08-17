"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, RefreshCw } from 'lucide-react';

export default function DashboardLivePoller() {
  const router = useRouter();
  const [lastCheck, setLastCheck] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let lastKnownTicketId = '';

    const checkLiveUpdates = async () => {
      try {
        const res = await fetch('/api/tickets/latest?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          const currentId = data.ticket?.id || '';
          if (lastKnownTicketId && currentId !== lastKnownTicketId) {
            router.refresh();
          }
          lastKnownTicketId = currentId;
        }
      } catch (err) {
        // silently ignore background polling errors
      }
    };

    // Initial check
    checkLiveUpdates();

    // Poll every 6 seconds for instant real-time KPI sync
    const interval = setInterval(() => {
      checkLiveUpdates();
    }, 6000);

    // Also periodic full refresh every 20 seconds to ensure status transitions & SLA updates reflect
    const fullRefreshInterval = setInterval(() => {
      router.refresh();
      setLastCheck(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 20000);

    return () => {
      clearInterval(interval);
      clearInterval(fullRefreshInterval);
    };
  }, [router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-full text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Live KPI Sync</span>
      </div>
      <button
        onClick={handleManualRefresh}
        title="Refresh Live Metrics"
        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
      </button>
    </div>
  );
}
