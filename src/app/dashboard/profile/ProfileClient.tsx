"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Bell, Shield, KeyRound, Check, Edit3, X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type UserData = {
  id: string;
  name: string | null;
  email: string;
  notificationEmail: string | null;
  receiveAlerts?: boolean;
  role: string;
  status: string;
  createdAt: Date | string;
};

export default function ProfileClient({ user }: { user: UserData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [notificationEmail, setNotificationEmail] = useState(user.notificationEmail || '');
  const [receiveAlerts, setReceiveAlerts] = useState(user.receiveAlerts ?? true);
  const [password, setPassword] = useState('');

  const [savedData, setSavedData] = useState({
    name: user.name || '',
    email: user.email || '',
    notificationEmail: user.notificationEmail || '',
    receiveAlerts: user.receiveAlerts ?? true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim() || null,
        email: email.trim(),
        notificationEmail: notificationEmail.trim() || null,
        receiveAlerts,
      };

      if (password) {
        payload.password = password;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSavedData({
        name: name.trim(),
        email: email.trim(),
        notificationEmail: notificationEmail.trim(),
        receiveAlerts,
      });

      toast.success('🎉 Profile updated successfully!');
      setPassword('');
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = savedData.name || savedData.email.split('@')[0];
  const hasAlertEmail = Boolean(savedData.notificationEmail && savedData.notificationEmail.trim());

  return (
    <div className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-950 min-h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {user.role === 'ADMIN' ? 'Admin Profile' : 'Staff Profile'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Manage your personal credentials, alert mailboxes & notification settings.
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-blue-600/20 active:scale-95 shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile & Alerts</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setName(savedData.name);
                setEmail(savedData.email);
                setNotificationEmail(savedData.notificationEmail);
                setPassword('');
                setIsEditing(false);
              }}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Avatar & Header */}
          <div className="flex items-center space-x-5 mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-lg shadow-blue-500/20">
              {displayName[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-100 dark:border-blue-900">
                  {user.role}
                </span>
                <span className="text-xs text-slate-400 font-medium">#{user.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>

          {!isEditing ? (
            /* View Mode */
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white">{savedData.name || 'Not set'}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Login Email
                  </p>
                  <p className="font-bold text-slate-900 dark:text-white">{savedData.email}</p>
                </div>

                {hasAlertEmail ? (
                  <div className={`p-4 rounded-xl border sm:col-span-2 space-y-1 ${savedData.receiveAlerts ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${savedData.receiveAlerts ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        <Bell className={`w-3.5 h-3.5 ${savedData.receiveAlerts ? 'text-emerald-600' : 'text-slate-500'}`} /> Target Inbox
                      </p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${savedData.receiveAlerts ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {savedData.receiveAlerts ? '🟢 Active' : '⚪ Disabled (Toggle Off)'}
                      </span>
                    </div>
                    <p className={`font-black ${savedData.receiveAlerts ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 line-through'}`}>{savedData.notificationEmail}</p>
                    <p className={`text-[11px] font-medium ${savedData.receiveAlerts ? 'text-emerald-800/80 dark:text-emerald-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {savedData.receiveAlerts 
                        ? 'Automated 7:00 PM Daily EOD Reports, CSV sheets & SLA breach alerts are delivered to this address.' 
                        : 'Alerts are currently toggled OFF. You will not receive any automated emails.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 dark:bg-amber-500/15 p-4 rounded-xl border border-amber-500/30 sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Alert Mailbox Status
                      </p>
                      <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                        ⚠️ Not Configured
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-200 font-bold">
                      No Alert Email is set. You will NOT receive any 7:00 PM Daily EOD Reports or SLA breach alerts.
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                      Click the <strong>"Edit Profile & Alerts"</strong> button above to set your alert mailbox.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode Form */
            <form onSubmit={handleSave} className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Edit Account & Notification Settings</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ganesh Kumbhar"
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Login Email Address <span className="text-rose-500">*</span>
                  {user.role === 'ADMIN' && (
                    <span className="ml-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">
                      System Read-Only
                    </span>
                  )}
                </label>
                <input
                  type="email"
                  required
                  disabled={user.role === 'ADMIN'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Active Report & Notification Email (Target Inbox)
                  </label>
                  <span className="text-[10px] text-slate-400">Optional (Defaults to Login Email)</span>
                </div>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="e.g. yourpersonalemail@gmail.com"
                  className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-amber-500/30 dark:border-amber-500/40 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  The Daily 7:00 PM EOD spreadsheet report will be delivered directly to this mailbox.
                </p>
              </div>

              {user.role !== 'ADMIN' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              )}

              <div className="pt-2 pb-2">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={receiveAlerts}
                      onChange={(e) => setReceiveAlerts(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Receive Automated Alerts</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Toggle to enable or disable SLA breach and Daily Report emails.</p>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setName(savedData.name);
                    setEmail(savedData.email);
                    setNotificationEmail(savedData.notificationEmail);
                    setReceiveAlerts(savedData.receiveAlerts);
                    setPassword('');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Executive Automated Reports Section for Admins */}
        {user.role === 'ADMIN' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Executive Operations & Performance Reports
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Automated email summaries with full CSV spreadsheets delivered to your alert mailbox.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Daily Report Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">📅 Daily EOD Report</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full">Active Daily</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Dispatched automatically every day at <strong>7:00 PM IST</strong> with today&apos;s tickets, pending queue, and attached CSV.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const tId = toast.loading('Generating & sending Daily Report...');
                    try {
                      const res = await fetch('/api/cron/daily-report', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        toast.success('✅ Daily report sent to your mailbox!', { id: tId });
                      } else {
                        throw new Error(data.error || data.message || 'Failed to dispatch');
                      }
                    } catch (e: any) {
                      toast.error(e.message || 'Failed to dispatch', { id: tId });
                    }
                  }}
                  className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  Send Daily Report Now &rarr;
                </button>
              </div>

              {/* Weekly Report Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">📈 Weekly Executive Report</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full">Every Monday</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Dispatched automatically every Monday at <strong>9:00 AM IST</strong> with 7-day KPIs, agent leaderboard, SLA health & attached CSV.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const tId = toast.loading('Generating & sending Weekly Executive Report...');
                    try {
                      const res = await fetch('/api/reports/weekly', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        toast.success('✅ Weekly executive report sent to your mailbox!', { id: tId });
                      } else {
                        throw new Error(data.error || data.message || 'Failed to dispatch');
                      }
                    } catch (e: any) {
                      toast.error(e.message || 'Failed to dispatch', { id: tId });
                    }
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
                >
                  Send Weekly Report Now &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
