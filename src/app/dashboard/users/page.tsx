"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus, Shield, User, Plus, X, Search, CheckSquare, Square, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { isProtectedDemoEmail } from '@/lib/demoSecurity';

const createUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  notificationEmail: z.string().email('Invalid alert email address').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'AGENT']),
  supportTier: z.enum(['TIER_1', 'TIER_2', 'TIER_3']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

type UserType = {
  id: string;
  name: string | null;
  email: string;
  notificationEmail?: string | null;
  role: string;
  supportTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | string;
  status: string;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      notificationEmail: '',
      password: '',
      role: 'AGENT',
      supportTier: 'TIER_1',
      status: 'ACTIVE',
    },
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (data: CreateUserFormValues) => {
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Failed to create user');
      }

      setSuccessMsg('User created successfully!');
      setIsModalOpen(false);
      reset();
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} agents? Their assigned tickets will become unassigned.`)) return;

    setError('');
    setSuccessMsg('');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Failed to delete users');
      }

      setSuccessMsg('Selected users deleted successfully!');
      setSelectedIds(new Set());
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white dark:text-white tracking-tight">
            Manage Agents
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1 font-medium">
            Create, view, and manage agents and administrators.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" />
          New Agent
        </button>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-600">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-600">{successMsg}</p>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 dark:bg-slate-900">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 dark:border-slate-800 rounded-xl focus:bg-white dark:bg-slate-900 dark:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 text-slate-900 dark:text-white dark:text-white font-medium transition-all"
            />
          </div>
          
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg text-sm font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-44 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">
            {searchQuery ? 'No agents match your search.' : 'No agents found.'}
          </div>
        ) : (
          <div className="overflow-x-auto whitespace-nowrap min-w-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 w-10">
                    <button 
                      onClick={toggleAll}
                      className="text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {selectedIds.size > 0 && selectedIds.size === filteredUsers.length ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Support Tier</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => router.push(`/dashboard/users/${user.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900 cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      {isProtectedDemoEmail(user.email) ? (
                        <div title="Core Demo Account (Deletion Protected)" className="text-slate-300 dark:text-slate-600">
                          <Square className="w-5 h-5 opacity-40 cursor-not-allowed" />
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => toggleSelection(user.id, e)}
                          className="text-slate-300 hover:text-blue-600 transition-colors group-hover:text-slate-400 dark:text-slate-500"
                        >
                          {selectedIds.has(user.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{user.name || <span className="text-slate-400 dark:text-slate-500 italic font-medium">Not Set</span>}</span>
                        {isProtectedDemoEmail(user.email) && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                            🔒 Demo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <div>{user.email}</div>
                      {user.notificationEmail && user.notificationEmail.trim() ? (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5" title="Active Alert & SLA Breach Email">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Alerts: {user.notificationEmail}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5" title="No alert mailbox configured">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>⚠️ Alert Mail Not Set</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {user.supportTier === 'TIER_3' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Layers className="w-3 h-3" />
                          Layer 3 (L3 Dev)
                        </span>
                      ) : user.supportTier === 'TIER_2' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <Layers className="w-3 h-3" />
                          Layer 2 (L2 Tech)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Layers className="w-3 h-3" />
                          Layer 1 (L1 Frontline)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        user.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}>
                        {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Agent</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  {...register('name')}
                  className={`w-full h-11 px-3 bg-white dark:bg-slate-900 border ${errors.name ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500`}
                  placeholder="John Doe"
                />
                {errors.name && <p className="text-red-500 text-xs font-medium mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Login Email Address</label>
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full h-11 px-3 bg-white dark:bg-slate-900 border ${errors.email ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500`}
                  placeholder="agent@system.com"
                />
                {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Active Alert / Notification Email (Optional)
                </label>
                <input
                  type="email"
                  {...register('notificationEmail')}
                  className={`w-full h-11 px-3 bg-white dark:bg-slate-900 border ${errors.notificationEmail ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500`}
                  placeholder="alerts@gmail.com (for SLA breach & ticket notifications)"
                />
                {errors.notificationEmail && <p className="text-red-500 text-xs font-medium mt-1">{errors.notificationEmail.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  {...register('password')}
                  className={`w-full h-11 px-3 bg-white dark:bg-slate-900 border ${errors.password ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select
                    {...register('role')}
                    className={`w-full h-11 px-2.5 bg-white dark:bg-slate-900 border ${errors.role ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white text-xs font-bold transition-all`}
                  >
                    <option value="AGENT">Agent</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {errors.role && <p className="text-red-500 text-xs font-medium mt-1">{errors.role.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Support Tier</label>
                  <select
                    {...register('supportTier')}
                    className={`w-full h-11 px-2 bg-white dark:bg-slate-900 border ${errors.supportTier ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white text-xs font-bold transition-all`}
                  >
                    <option value="TIER_1">L1 (Frontline)</option>
                    <option value="TIER_2">L2 (Technical)</option>
                    <option value="TIER_3">L3 (Engineering)</option>
                  </select>
                  {errors.supportTier && <p className="text-red-500 text-xs font-medium mt-1">{errors.supportTier.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    {...register('status')}
                    className={`w-full h-11 px-2.5 bg-white dark:bg-slate-900 border ${errors.status ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white text-xs font-bold transition-all`}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  {errors.status && <p className="text-red-500 text-xs font-medium mt-1">{errors.status.message}</p>}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:text-slate-900 dark:text-white dark:text-white hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
