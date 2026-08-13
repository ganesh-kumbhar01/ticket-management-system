"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type NotificationData = {
  id: string;
  subject: string;
  studentEmail: string;
  createdAt: string;
};

export default function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const lastTicketIdRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Helper to fetch the latest ticket
    const fetchLatest = async (isInitial: boolean) => {
      try {
        const res = await fetch('/api/tickets/latest', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.ticket) {
          const ticket = data.ticket;
          
          // On initial load, just set the reference so we know what the baseline is.
          if (isInitial) {
            lastTicketIdRef.current = ticket.id;
            return;
          }

          // If we see a new ticket that we haven't seen before
          if (lastTicketIdRef.current && lastTicketIdRef.current !== ticket.id) {
            // Add it to our visible notifications
            setNotifications(prev => {
              // Avoid duplicates if polling overlaps
              if (prev.some(n => n.id === ticket.id)) return prev;
              return [ticket, ...prev];
            });
            // Play a soft sound if desired (optional)
            // new Audio('/notification.mp3').play().catch(() => {});
            lastTicketIdRef.current = ticket.id;
            // Refresh server components to show the new ticket in lists
            router.refresh();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial fetch to set baseline
    fetchLatest(true);

    // Poll every 5 seconds for faster real-time feel
    const interval = setInterval(() => {
      fetchLatest(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80">
      {notifications.map((notif) => (
        <div 
          key={notif.id} 
          className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 dark:border-slate-800 dark:border-slate-800 p-4 transform transition-all animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white dark:text-white mb-1">New Ticket Received!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium truncate mb-0.5">{notif.studentEmail}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300 line-clamp-1 mb-3">{notif.subject}</p>
              <Link 
                href={`/dashboard/tickets/${notif.id}`}
                onClick={() => dismissNotification(notif.id)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Ticket <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <button 
              onClick={() => dismissNotification(notif.id)}
              className="w-6 h-6 rounded-full hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:text-slate-300 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
