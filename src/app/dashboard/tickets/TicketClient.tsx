"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Plus, X, Search, RefreshCw, Trash2, CheckSquare, Square, Eye, AlertTriangle, Sparkles, FileSpreadsheet, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  studentEmail: string;
  assignedAgentId: string | null;
  currentTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | string;
  isSlaBreached?: boolean;
  slaBreachedAt?: Date | string | null;
  createdAt: Date;
};

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  studentEmail: z.string().email('Invalid email address'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  description: z.string().min(1, 'Description is required'),
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

export default function TicketClient({ initialTickets, currentUserId, isAdmin }: { initialTickets: Ticket[], currentUserId: string, isAdmin: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_TICKETS' | 'UNASSIGNED'>(isAdmin ? 'ALL' : 'MY_TICKETS');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activePresences, setActivePresences] = useState<{ ticketId: string; userId: string; userName: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  useEffect(() => {
    const fetchPresences = async () => {
      try {
        const res = await fetch('/api/tickets/presence');
        if (res.ok) {
          const data = await res.json();
          setActivePresences(data.activePresences || []);
        }
      } catch (err) {
        // ignore
      }
    };

    fetchPresences();
    const interval = setInterval(fetchPresences, 4000);
    return () => clearInterval(interval);
  }, []);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    mode: 'onTouched',
    defaultValues: {
      subject: '',
      studentEmail: '',
      category: 'General',
      priority: 'NORMAL',
      description: ''
    }
  });

  const handleSyncEmails = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/tickets/sync-emails', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sync emails');
      const result = await res.json();
      toast.success(`Sync complete! Processed ${result.processedCount} new emails.`);
      // Instead of replacing the whole ticket list immediately, we just refresh the router so the parent component fetches latest data
      router.refresh();

    } catch (error) {
      console.error(error);
      toast.error('Something went wrong while syncing emails.');
    } finally {
      setIsSyncing(false);
    }
  };

  const onSubmit = async (data: CreateTicketFormValues) => {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create ticket');

      const newTicket = await res.json();
      setTickets([newTicket.ticket, ...tickets]);
      setIsModalOpen(false);
      reset();
      toast.success('Ticket created successfully');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong while creating the ticket.');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'MY_TICKETS' && t.assignedAgentId !== currentUserId) return false;
    if (activeTab === 'UNASSIGNED' && t.assignedAgentId !== null) return false;
    
    return t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTickets(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === filteredTickets.length && filteredTickets.length > 0) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredTickets.map(t => t.id));
    }
  };

  const handleDeleteTicket = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ticket');
      
      setTickets(tickets.filter(t => t.id !== id));
      setSelectedTickets(prev => prev.filter(tId => tId !== id));
      toast.success('Ticket deleted');
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete ticket. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);

  const handleClaimTicket = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClaimingTicketId(id);
    try {
      const res = await fetch(`/api/tickets/${id}/claim`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(`⚠️ ${data.message || 'This ticket was already claimed by another teammate!'}`);
          router.refresh();
          return;
        }
        throw new Error(data.error || data.message || 'Failed to claim ticket');
      }

      toast.success('🎉 Ticket successfully claimed by you!');
      setTickets(prev => prev.map(t => t.id === id ? { ...t, assignedAgentId: currentUserId, status: 'OPEN' } : t));
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to claim ticket');
    } finally {
      setClaimingTicketId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTickets.length} tickets? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds: selectedTickets }),
      });

      if (!res.ok) throw new Error('Failed to delete tickets');

      setTickets(tickets.filter(t => !selectedTickets.includes(t.id)));
      setSelectedTickets([]);
      toast.success('Tickets deleted');
      router.refresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete tickets. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const [isSendingReport, setIsSendingReport] = useState(false);

  const handleSendDailyReport = async () => {
    setIsSendingReport(true);
    try {
      const res = await fetch('/api/reports/daily-eod', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch daily report');
      toast.success(`📊 ${data.message || 'Daily EOD Report & CSV sent to all staff alert mailboxes!'}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send daily report');
    } finally {
      setIsSendingReport(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'OPEN': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'PENDING_CUSTOMER': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'CLOSED': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Support Tickets
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage and respond to incoming requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSendDailyReport}
            disabled={isSendingReport}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-50 text-sm"
            title="Send 7:00 PM EOD Operations Report & CSV Spreadsheet to all staff active mailboxes"
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isSendingReport ? 'animate-bounce' : ''}`} />
            <span>{isSendingReport ? 'Sending Report...' : 'Send Daily EOD Report'}</span>
          </button>
          <button 
            onClick={handleSyncEmails}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Emails
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-white/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-transparent">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <button
              onClick={() => setActiveTab('MY_TICKETS')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'MY_TICKETS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800'}`}
            >
              My Tickets
            </button>
            <button
              onClick={() => setActiveTab('UNASSIGNED')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'UNASSIGNED' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800'}`}
            >
              Unassigned Queue
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800'}`}
            >
              All Tickets
            </button>
          </div>

          <div className="relative w-full max-w-sm shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
            <input 
              type="text"
              placeholder="Search tickets by ID, subject, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
          </div>

          {selectedTickets.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {selectedTickets.length} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/50 bg-white/40 dark:bg-slate-900/40">
                <th className="py-4 px-4 w-12 text-center">
                  <button 
                    onClick={handleSelectAll} 
                    className="text-slate-400 dark:text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {selectedTickets.length === filteredTickets.length && filteredTickets.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</th>
                <th className="py-4 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No tickets found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => {
                  const isSelected = selectedTickets.includes(ticket.id);
                  return (
                  <tr 
                    key={ticket.id} 
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                    className={`transition-colors cursor-pointer group ${isSelected ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-transparent hover:bg-white/50 dark:bg-slate-900/50'}`}
                  >
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleToggleSelect(ticket.id, e)}
                        className="text-slate-300 hover:text-blue-600 transition-colors focus:outline-none"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium">#{ticket.id.slice(0,8)}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ticket.currentTier === 'TIER_3' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-black border border-purple-200 dark:border-purple-800 shrink-0" title="Tier 3 (L3 Engineering / Senior)">
                            <Layers className="w-3 h-3" />
                            L3
                          </span>
                        ) : ticket.currentTier === 'TIER_2' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[10px] font-black border border-sky-200 dark:border-sky-800 shrink-0" title="Tier 2 (L2 Technical Specialist)">
                            <Layers className="w-3 h-3" />
                            L2
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800 shrink-0" title="Tier 1 (L1 Frontline Support)">
                            <Layers className="w-3 h-3" />
                            L1
                          </span>
                        )}
                        <Link href={`/dashboard/tickets/${ticket.id}`} className="hover:text-blue-600 transition-colors">
                          {ticket.subject}
                        </Link>
                        {(() => {
                          const rowViewers = activePresences.filter(p => p.ticketId === ticket.id);
                          if (rowViewers.length === 0) return null;
                          return (
                            <span 
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/30 shrink-0" 
                              title={`${rowViewers.map(v => v.userName).join(', ')} is currently viewing this ticket`}
                            >
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              <Eye className="w-3 h-3" />
                              <span>{rowViewers.map(v => v.userName).join(', ')}</span>
                            </span>
                          );
                        })()}
                        {(() => {
                          const isBreached = ticket.isSlaBreached || (!ticket.assignedAgentId && ['URGENT', 'HIGH'].includes(ticket.priority) && (Date.now() - new Date(ticket.createdAt).getTime() > 3 * 3600 * 1000));
                          if (!isBreached) return null;
                          return (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 text-[10px] font-black border border-rose-500/30 animate-pulse shrink-0" 
                              title="SLA Breached (>3h unassigned). Escalation email sent to Admin."
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span>SLA BREACH (3h+)</span>
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">{ticket.studentEmail}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">{ticket.category}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        ticket.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        ticket.priority === 'NORMAL' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!ticket.assignedAgentId && (
                          <button
                            onClick={(e) => handleClaimTicket(ticket.id, e)}
                            disabled={claimingTicketId === ticket.id}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-black transition-all flex items-center gap-1 active:scale-95 shadow-sm shrink-0"
                            title="Claim this ticket (Assign to me)"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{claimingTicketId === ticket.id ? 'Claiming...' : 'Claim'}</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteTicket(ticket.id, e)}
                          disabled={isDeleting}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Delete ticket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/50 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">Create New Ticket</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-300 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" noValidate>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  {...register('subject')}
                  className={`w-full h-11 px-3 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.subject ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all`}
                  placeholder="Brief summary of the issue"
                />
                {errors.subject && <p className="text-red-500 text-xs font-medium mt-1">{errors.subject.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Customer Email</label>
                <input
                  type="email"
                  {...register('studentEmail')}
                  className={`w-full h-11 px-3 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.studentEmail ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all`}
                  placeholder="customer@example.com"
                />
                {errors.studentEmail && <p className="text-red-500 text-xs font-medium mt-1">{errors.studentEmail.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Category</label>
                  <select
                    {...register('category')}
                    className={`w-full h-11 px-3 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.category ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all`}
                  >
                    <option value="General">General Inquiry</option>
                    <option value="Technical">Technical Support</option>
                    <option value="Billing">Billing</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                  {errors.category && <p className="text-red-500 text-xs font-medium mt-1">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    {...register('priority')}
                    className={`w-full h-11 px-3 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.priority ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all`}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  {errors.priority && <p className="text-red-500 text-xs font-medium mt-1">{errors.priority.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Initial Message / Description</label>
                <textarea
                  {...register('description')}
                  className={`w-full min-h-[120px] p-3 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.description ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-lg focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all resize-y`}
                  placeholder="Describe the customer's issue in detail..."
                />
                {errors.description && <p className="text-red-500 text-xs font-medium mt-1">{errors.description.message}</p>}
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
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
