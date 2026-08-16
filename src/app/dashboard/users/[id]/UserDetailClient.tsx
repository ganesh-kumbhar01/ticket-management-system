"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Bell,
  Shield, 
  Save, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Ticket, 
  Edit3, 
  X, 
  Calendar, 
  ChevronDown, 
  Activity,
  Check,
  Layers
} from 'lucide-react';
import Link from 'next/link';

type SafeUser = {
  id: string;
  name: string | null;
  email: string;
  notificationEmail?: string | null;
  role: string;
  supportTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | string;
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
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email);
  const [notificationEmail, setNotificationEmail] = useState(user.notificationEmail || '');
  const [role, setRole] = useState(user.role);
  const [supportTier, setSupportTier] = useState(user.supportTier || 'TIER_1');
  const [status, setStatus] = useState(user.status);
  const [password, setPassword] = useState('');

  // Persisted view states
  const [savedUser, setSavedUser] = useState({
    name: user.name || '',
    email: user.email,
    notificationEmail: user.notificationEmail || '',
    role: user.role,
    supportTier: user.supportTier || 'TIER_1',
    status: user.status
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();

  const handleCancelEdit = () => {
    // Revert to saved values
    setName(savedUser.name);
    setEmail(savedUser.email);
    setNotificationEmail(savedUser.notificationEmail);
    setRole(savedUser.role);
    setSupportTier(savedUser.supportTier);
    setStatus(savedUser.status);
    setPassword('');
    setError('');
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload: any = {
        name: name.trim() || null,
        email: email.trim(),
        notificationEmail: notificationEmail.trim() || null,
        role,
        supportTier,
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

      setSavedUser({
        name: name.trim(),
        email: email.trim(),
        notificationEmail: notificationEmail.trim(),
        role,
        supportTier,
        status
      });

      setSuccess('User profile updated successfully!');
      setPassword('');
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard/users')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              title="Back to Users & Agents"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {savedUser.name || savedUser.email}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  savedUser.role === 'ADMIN' 
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60' 
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                }`}>
                  {savedUser.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {savedUser.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {savedUser.role === 'ADMIN' ? 'System Administrator Profile & Permissions' : 'Support Agent Profile & Workload'}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 leading-relaxed">{success}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main User Card (View Mode / Edit Mode) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
              
              {/* Card Title & Edit Status Banner */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/40">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {isEditing ? 'Edit Account Information' : 'Account Details'}
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {isEditing ? 'Modify account parameters, permissions, and status below.' : 'View official role and credentials.'}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Editing
                  </span>
                ) : (
                  <button
                    onClick={() => { setError(''); setSuccess(''); setIsEditing(true); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {/* VIEW MODE */}
              {!isEditing ? (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Full Name</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {savedUser.name || <span className="text-slate-400 italic">Not set</span>}
                      </p>
                    </div>

                    {/* Email Address */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Login Email Address</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {savedUser.email}
                      </p>
                    </div>

                    {/* Active Alert / Notification Email */}
                    <div className="p-4 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/30 space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                          <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Active Alert & Escalation Email</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-full">
                          SLA & Alerts Recipient
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {savedUser.notificationEmail || (
                          <span className="text-slate-400 dark:text-slate-500 font-medium italic">
                            Default (Using Login Email: {savedUser.email})
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                        3-Hour unassigned ticket SLA breach alerts and urgent notifications are delivered to this address.
                      </p>
                    </div>

                    {/* Role */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>System Role</span>
                      </div>
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                          savedUser.role === 'ADMIN' 
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60' 
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                        }`}>
                          {savedUser.role === 'ADMIN' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          {savedUser.role === 'ADMIN' ? 'Administrator' : 'Support Agent'}
                        </span>
                      </div>
                    </div>

                    {/* Support Layer / Tier */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>Support Layer / Tier</span>
                      </div>
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                          savedUser.supportTier === 'TIER_3'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                            : savedUser.supportTier === 'TIER_2'
                            ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}>
                          <Layers className="w-3.5 h-3.5" />
                          {savedUser.supportTier === 'TIER_3'
                            ? 'Layer 3 (L3 Engineering)'
                            : savedUser.supportTier === 'TIER_2'
                            ? 'Layer 2 (L2 Technical)'
                            : 'Layer 1 (L1 Frontline)'}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1 sm:col-span-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        <span>Account Status</span>
                      </div>
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold ${
                          savedUser.status === 'ACTIVE' 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' 
                            : savedUser.status === 'INACTIVE'
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${savedUser.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {savedUser.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Joined Date & Overview */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">ID: #{user.id.slice(0, 8)}</span>
                  </div>
                </div>
              ) : (
                /* EDIT MODE FORM */
                <form onSubmit={handleSave} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Johnson"
                          className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Email Address Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Login Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="agent@company.com"
                          className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Active Alert / Notification Email Input */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Active Alert & Notification Email (For SLA Escalations)
                      </label>
                      <div className="relative">
                        <Bell className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={notificationEmail}
                          onChange={(e) => setNotificationEmail(e.target.value)}
                          placeholder="e.g. personal.alerts@gmail.com (Leave blank to use login email)"
                          className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                        3-Hour SLA breach alerts and critical ticket notifications will be sent directly to this address.
                      </p>
                    </div>

                    {/* Role Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        System Role
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full h-11 pl-10 pr-10 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="AGENT">AGENT — Support Agent</option>
                          <option value="ADMIN">ADMIN — Administrator</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Support Tier Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Support Layer / Tier
                      </label>
                      <div className="relative">
                        <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={supportTier}
                          onChange={(e) => setSupportTier(e.target.value)}
                          className="w-full h-11 pl-10 pr-10 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="TIER_1">Layer 1 (L1 — Frontline / Freshers)</option>
                          <option value="TIER_2">Layer 2 (L2 — Technical Specialist)</option>
                          <option value="TIER_3">Layer 3 (L3 — Senior / Engineering)</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Account Status
                      </label>
                      <div className="relative">
                        <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full h-11 pl-10 pr-10 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                        >
                          <option value="ACTIVE">ACTIVE — Active Staff</option>
                          <option value="INACTIVE">INACTIVE — Inactive / Away</option>
                          <option value="SUSPENDED">SUSPENDED — Suspended</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Password Reset Field (Optional) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Reset Password (Optional)
                    </label>
                    <div className="relative max-w-md">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password (leave blank to keep current)"
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                      Leave this blank if you do not want to change the agent's password.
                    </p>
                  </div>

                  {/* ACTION BUTTONS AT THE BOTTOM (Save Changes + Cancel) */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

          {/* Side Info: Assigned Tickets */}
          <div className="space-y-6">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Assigned Tickets</h2>
                </div>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-black text-slate-600 dark:text-slate-300">
                  {user.assignedTickets.length}
                </span>
              </div>
              
              <div className="p-4">
                {user.assignedTickets.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Active Tickets</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                      This staff member currently has zero open tickets assigned in their queue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {user.assignedTickets.map(ticket => (
                      <Link 
                        key={ticket.id} 
                        href={`/dashboard/tickets/${ticket.id}`}
                        className="block p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                            #{ticket.id.slice(0, 8)}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                            ticket.status === 'NEW' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' :
                            ticket.status === 'OPEN' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
                            ticket.status === 'RESOLVED' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ticket.subject}
                        </p>
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
