"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Shield, Save, Key, AlertCircle, CheckCircle2, Ticket } from 'lucide-react';
import Link from 'next/link';

type SafeUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  assignedTickets: Array<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
};

export default function UserDetailClient({ user }: { user: SafeUser }) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [password, setPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload: any = {
        name: name.trim() || null,
        email,
        role,
        status
      };
      if (password) {
        payload.password = password;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User profile updated successfully!');
      setPassword(''); // clear password field
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-50 dark:bg-slate-800/50 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">{user.role === 'ADMIN' ? 'Admin Profile' : 'Agent Profile'}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage details and permissions</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-emerald-600">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-slate-900 dark:text-white font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-slate-900 dark:text-white font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-slate-900 dark:text-white font-medium transition-all appearance-none"
                      >
                        <option value="AGENT">Agent</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className={`w-2.5 h-2.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      </div>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-slate-900 dark:text-white font-medium transition-all appearance-none"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Reset Password (Optional)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password to change"
                      className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-slate-900 dark:text-white font-medium transition-all"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Leave blank to keep the current password.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Side Info & Tickets */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Tickets</h2>
              </div>
              <div className="p-4">
                {user.assignedTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Ticket className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No tickets assigned yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.assignedTickets.map(ticket => (
                      <Link 
                        key={ticket.id} 
                        href={`/dashboard/tickets/${ticket.id}`}
                        className="block p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">#{ticket.id.slice(0,8)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            ticket.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                            ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                            ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ticket.subject}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
