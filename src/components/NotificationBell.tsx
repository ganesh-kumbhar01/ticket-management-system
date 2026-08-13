"use client";

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 seconds for new notifications for a more real-time feel
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id?: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const deleteNotification = async (id?: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAsRead()}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={() => deleteNotification()}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-4 transition-colors hover:bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-1">
                        <div className={`w-2 h-2 rounded-full ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white dark:text-white mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 dark:text-slate-300 mb-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-3">
                            {notification.link && (
                              <Link 
                                href={notification.link}
                                onClick={() => { if (!notification.isRead) markAsRead(notification.id); setIsOpen(false); }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                            {!notification.isRead && (
                              <button 
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:text-slate-300 flex items-center gap-1"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:text-rose-500 flex items-center gap-1"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
