"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Clock, User as UserIcon, AlertCircle, Paperclip, CheckCircle, Tag, MessageSquare, Plus, Users, History, FileText, ChevronLeft, ChevronDown, Trash2, X, Bold, Italic, List, Link as LinkIcon, FileCheck, ArrowLeft, Activity, Sparkles, UserPlus, Lock, Bot, Eye, Wand2, AlertTriangle, Layers, TrendingUp, Printer, Download, FileBarChart, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Attachment = {
  id: string;
  filename: string;
  url: string;
  mimeType: string | null;
  size: number | null;
};

type Message = {
  id: string;
  content: string;
  senderType: string;
  createdAt: Date;
  attachments?: Attachment[];
};

type Ticket = {
  id: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  studentEmail: string;
  assignedAgentId: string | null;
  currentTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | string;
  escalationReason?: string | null;
  isSlaBreached?: boolean;
  slaBreachedAt?: Date | string | null;
  createdAt: Date;
  messages: Message[];
};

type Agent = {
  id: string;
  name?: string | null;
  email: string;
  supportTier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | string;
};

type HistoryTicket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
};

export default function TicketDetailClient({ ticket, agents, currentUserId, isAdmin }: { ticket: Ticket, agents: Agent[], currentUserId: string, isAdmin: boolean }) {
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isRunningAiResponse, setIsRunningAiResponse] = useState(false);
  const [isSavingToKB, setIsSavingToKB] = useState(false);
  const [currentTier, setCurrentTier] = useState(ticket.currentTier || 'TIER_1');
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [targetTier, setTargetTier] = useState<'TIER_2' | 'TIER_3'>('TIER_2');
  const [targetAgentId, setTargetAgentId] = useState<string>('unassigned');
  const [handoverNote, setHandoverNote] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [category, setCategory] = useState(ticket.category);
  const [assignedAgentId, setAssignedAgentId] = useState(ticket.assignedAgentId || '');
  const [isSavingProps, setIsSavingProps] = useState(false);
  const [propsChanged, setPropsChanged] = useState(false);
  const [replyType, setReplyType] = useState<'PUBLIC' | 'INTERNAL'>('PUBLIC');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customerTickets, setCustomerTickets] = useState<HistoryTicket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCanned, setShowCanned] = useState(false);

  const CANNED_RESPONSES = [
    { label: 'Greeting', text: 'Hello, thank you for reaching out to our support team. How can we assist you today?' },
    { label: 'Working on it', text: 'We have received your request and our team is currently investigating the issue. We will get back to you shortly.' },
    { label: 'Resolved', text: 'We have resolved the issue. Please let us know if you need any further assistance. Have a great day!' },
    { label: 'Need more info', text: 'Could you please provide more details or screenshots regarding the issue so we can assist you better?' },
  ];
  const [activeViewers, setActiveViewers] = useState<{userId: string, userName: string}[]>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const router = useRouter();
  
  const allAttachments = ticket.messages.flatMap(m => m.attachments || []);

  useEffect(() => {
    const pingPresence = async () => {
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/presence`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setActiveViewers(data.activeUsers || []);
        }
      } catch (error) {
        console.error('Failed to update presence', error);
      }
    };

    pingPresence();
    
    // Fast 4-second presence heartbeat
    const interval = setInterval(pingPresence, 4000);

    // Clean up presence on unmount / navigation
    const leavePresence = () => {
      try {
        fetch(`/api/tickets/${ticket.id}/presence`, { method: 'DELETE', keepalive: true });
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('beforeunload', leavePresence);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', leavePresence);
      leavePresence();
    };
  }, [ticket.id]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/tickets/customer/${encodeURIComponent(ticket.studentEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setCustomerTickets((data.tickets || []).filter((t: HistoryTicket) => t.id !== ticket.id));
        }
      } catch (error) {
        console.error('Failed to load history', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [ticket.studentEmail, ticket.id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleReply = async (isInternal: boolean = false) => {
    if (!replyContent.trim()) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', replyContent);
      formData.append('isInternal', isInternal ? 'true' : 'false');
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to send reply');

      setReplyContent('');
      setSelectedFiles([]);
      toast.success('Reply sent successfully');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePolishMessage = async () => {
    if (!replyContent.trim()) return;
    setIsPolishing(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/polish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to polish message');
      }

      const data = await res.json();
      setReplyContent(data.polishedReply);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsPolishing(false);
    }
  };

  const handleAIDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/draft`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate draft');
      }

      const data = await res.json();
      setReplyContent(data.draftReply);
      setReplyType('PUBLIC');
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDrafting(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/summary`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const data = await res.json();
      setAiSummary(data.summary);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ticket');
      toast.success('Ticket deleted');
      router.push('/dashboard/tickets');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete ticket');
    }
  };

  const handlePropsChange = (field: string, value: string) => {
    if (field === 'status') setStatus(value);
    if (field === 'priority') setPriority(value);
    if (field === 'category') setCategory(value);
    if (field === 'assignedAgentId') setAssignedAgentId(value === 'unassigned' ? '' : value);
    setPropsChanged(true);
  };

  const handleResolveTicket = async () => {
    setIsSavingProps(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (!res.ok) throw new Error('Failed to resolve ticket');
      setStatus('RESOLVED');
      toast.success('Ticket resolved');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to resolve ticket');
    } finally {
      setIsSavingProps(false);
    }
  };

  const handleTriggerAiResponse = async () => {
    setIsRunningAiResponse(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/ai-respond`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch AI response');
      toast.success('🤖 AI Knowledge First-Response sent to customer!');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to run AI First-Responder');
    } finally {
      setIsRunningAiResponse(false);
    }
  };  const handleEscalateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverNote.trim()) {
      toast.error('Please write a handover note explaining what you already tried.');
      return;
    }
    setIsEscalating(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTier,
          assignedAgentId: targetAgentId,
          handoverNote: handoverNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to escalate ticket');

      toast.success(`🔺 Escalated to ${targetTier === 'TIER_2' ? 'Layer 2 (L2)' : 'Layer 3 (L3)'} with CC email notification!`);
      setCurrentTier(targetTier);
      if (data.ticket?.assignedAgentId) {
        setAssignedAgentId(data.ticket.assignedAgentId);
      }
      setIsEscalateModalOpen(false);
      setHandoverNote('');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to escalate ticket');
    } finally {
      setIsEscalating(false);
    }
  };

  const handleOpenReportModal = async () => {
    setIsReportModalOpen(true);
    if (!reportData) {
      setIsLoadingReport(true);
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/report`);
        if (!res.ok) throw new Error('Failed to load ticket report');
        const data = await res.json();
        setReportData(data);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to fetch ticket report');
      } finally {
        setIsLoadingReport(false);
      }
    }
  };

  const handleSaveToKB = async () => {
    setIsSavingToKB(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/to-kb`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save to KB');
      toast.success(`✨ KB Article Created: "${data.title}"`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to generate KB article');
    } finally {
      setIsSavingToKB(false);
    }
  };

  const handleDownloadJsonReport = () => {
    if (!reportData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ticket-report-${ticket.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('JSON report downloaded');
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleClaimTicket = async () => {
    setIsSavingProps(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/claim`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(`⚠️ ${data.message || 'This ticket was already claimed by another teammate!'}`);
          if (data.assignedAgent?.id) {
            setAssignedAgentId(data.assignedAgent.id);
          }
          router.refresh();
          return;
        }
        throw new Error(data.error || data.message || 'Failed to claim ticket');
      }
      
      setAssignedAgentId(currentUserId);
      setStatus('OPEN');
      toast.success('🎉 Ticket successfully claimed by you!');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to claim ticket');
    } finally {
      setIsSavingProps(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSavingProps(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          category,
          assignedAgentId: assignedAgentId || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update ticket');

      toast.success('Ticket updated');
      setPropsChanged(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update ticket');
    } finally {
      setIsSavingProps(false);
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
    <>
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-800/50">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/tickets"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{ticket.subject}</h1>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${getStatusColor(status)}`}>
                {status}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold flex items-center gap-1.5 ${
                currentTier === 'TIER_3'
                  ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : currentTier === 'TIER_2'
                  ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                <Layers className="w-3 h-3" />
                {currentTier === 'TIER_3' ? 'Layer 3 (L3 Dev)' : currentTier === 'TIER_2' ? 'Layer 2 (L2 Tech)' : 'Layer 1 (L1 Frontline)'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              #{ticket.id} • Created on {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Save to KB Button (Visible only when resolved) */}
          {status === 'RESOLVED' && (
            <button
              onClick={handleSaveToKB}
              disabled={isSavingToKB}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              title="Generate a Knowledge Base article from this resolved ticket"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSavingToKB ? 'Saving...' : 'Save to KB'}</span>
            </button>
          )}

          {/* Report Button */}
          <button
            onClick={handleOpenReportModal}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 active:scale-95 flex items-center gap-1.5 shadow-sm"
            title="Generate & View Individual Ticket Case Audit Report"
          >
            <FileBarChart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>📄 Case Report</span>
          </button>

          {/* Escalate Button */}
          <button
            onClick={() => setIsEscalateModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-rose-600/20 active:scale-95 flex items-center gap-1.5"
            title="Escalate ticket with Handover Note and CC email dispatch"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>🔺 Escalate</span>
          </button>

          {!assignedAgentId && (
            <button
              onClick={handleClaimTicket}
              disabled={isSavingProps}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-md shadow-blue-600/25 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              title="Claim this ticket with atomic concurrency protection"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSavingProps ? 'Claiming...' : '⚡ Claim'}</span>
            </button>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Manage
          </button>
          {activeViewers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold shadow-sm animate-in fade-in duration-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">
                {activeViewers.map(v => v.userName).join(', ')} {activeViewers.length === 1 ? 'is' : 'are'} viewing
              </span>
            </div>
          )}
          {isAdmin && (
            <button
              onClick={handleDeleteTicket}
              className="hidden md:flex p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
              title="Delete Ticket"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-transparent min-w-0">
          <div className="max-w-4xl mx-auto p-6 md:p-8">
            {/* SLA Breach Escalation Warning Banner */}
            {(ticket.isSlaBreached || (!ticket.assignedAgentId && ['URGENT', 'HIGH'].includes(ticket.priority) && (Date.now() - new Date(ticket.createdAt).getTime() > 3 * 3600 * 1000))) && (
              <div className="mb-6 p-4 bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-4 text-rose-900 dark:text-rose-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                        3-Hour SLA Breach Escalation Active
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-200 text-[10px] font-black">
                        Critical Unassigned
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-300/90 font-medium mt-0.5">
                      This ticket has remained unassigned for over 3 hours. An automated escalation alert has been dispatched to the Admin team's active alert mailbox.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6 mb-10">
              {ticket.messages.length === 0 ? (
                <div className="text-center text-slate-500 dark:text-slate-400 font-medium py-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-800/50 shadow-sm">
                  No messages found for this ticket.
                </div>
              ) : (
                ticket.messages.map((msg, index) => {
                  const isSystem = msg.senderType === 'SYSTEM';
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-4">
                        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  const isInternal = msg.senderType === 'INTERNAL_NOTE';
                  const isAi = msg.senderType === 'AI_DRAFT';
                  const isAgent = msg.senderType === 'AGENT' || isAi || isInternal;
                  
                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="shrink-0 mt-1">
                          {isAi ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-gradient-to-tr from-indigo-500 to-purple-600 text-white">
                              <Bot className="w-4 h-4" />
                            </div>
                          ) : isAgent ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isInternal ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                              {isInternal ? <Lock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
                              <UserIcon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className={`text-xs font-bold ${isAi ? 'text-indigo-600 dark:text-indigo-400 flex items-center gap-1' : 'text-slate-600 dark:text-slate-300'}`}>
                              {isAi && <Sparkles className="w-3 h-3 text-amber-500" />}
                              {isAi ? 'AI Knowledge First-Responder' : isInternal ? 'Internal Note' : isAgent ? 'Support Team' : ticket.studentEmail}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`p-4 rounded-2xl shadow-sm backdrop-blur-xl ${
                            isAi
                              ? 'bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-indigo-50/70 dark:from-indigo-950/60 dark:via-purple-950/50 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/80 text-slate-800 dark:text-slate-100 rounded-tr-sm'
                              : isInternal
                                ? 'bg-amber-50/80 border border-amber-200/50 text-amber-900 rounded-tr-sm'
                                : isAgent 
                                  ? 'bg-blue-600/90 text-white rounded-tr-sm border border-blue-500/50' 
                                  : 'bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 rounded-tl-sm'
                          }`}>
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-ul:my-1 prose-li:my-0 break-words">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                            {isAi && (
                              <div className="mt-3 pt-2.5 border-t border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300 font-bold">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  Auto-dispatched to customer for self-service resolution
                                </span>
                                <span className="bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                                  KB Synthesized
                                </span>
                              </div>
                            )}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2 border-t pt-2 border-slate-200/50">
                                {msg.attachments.map(att => (
                                  <a 
                                    key={att.id} 
                                    href={att.url} 
                                    download={att.filename}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:bg-slate-900 transition-colors border border-slate-200/50"
                                  >
                                    <Paperclip className="w-4 h-4 opacity-70" />
                                    <span className="text-xs font-medium truncate max-w-[200px]">{att.filename}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mb-10">
              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-2xl border border-indigo-500/20 dark:border-indigo-500/20 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-xl">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-lg text-indigo-900 dark:text-indigo-100">AI Summary</h4>
                  </div>
                  <button 
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-2"
                  >
                    {isSummarizing ? 'Generating...' : 'Generate Summary'}
                  </button>
                </div>
                <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl p-5 border border-indigo-500/20 backdrop-blur-md">
                  {aiSummary ? (
                    <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none">
                      <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium leading-relaxed whitespace-pre-wrap">
                        {aiSummary}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-indigo-900/70 dark:text-indigo-100/70 font-medium">
                      Click "Generate Summary" to let AI analyze the conversation and provide a concise overview.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Live Teammate Collision Warning Banner */}
            {activeViewers.length > 0 && (
              <div className="mb-4 p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Collision Shield Active
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-black">
                        {activeViewers.length} {activeViewers.length === 1 ? 'Teammate' : 'Teammates'} Active
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300/90 font-medium mt-0.5">
                      <strong>{activeViewers.map(v => v.userName).join(', ')}</strong> {activeViewers.length === 1 ? 'is' : 'are'} currently on this ticket. Coordinate before replying to prevent duplicate messages.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-slate-800/60 shadow-sm overflow-visible relative z-20">
              <div className="p-4 border-b border-white/20 dark:border-slate-800/50 flex items-center gap-2 flex-wrap bg-transparent">
                <button 
                  onClick={() => setReplyType('PUBLIC')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${replyType === 'PUBLIC' ? 'bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                >
                  Reply to Customer
                </button>
                <button 
                  onClick={() => setReplyType('INTERNAL')} 
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${replyType === 'INTERNAL' ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                >
                  <Lock className="w-3 h-3" />
                  Internal Note
                </button>

                {/* Canned Responses placed on left alongside reply tabs */}
                {replyType === 'PUBLIC' && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowCanned(!showCanned)} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200/80 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Canned Responses</span>
                    </button>
                    {showCanned && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowCanned(false)} 
                        />
                        <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Select Canned Response
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">
                              {CANNED_RESPONSES.length} templates
                            </span>
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {CANNED_RESPONSES.map((resp, idx) => (
                              <button 
                                key={idx} 
                                type="button"
                                onClick={() => {
                                  setReplyContent(prev => prev + (prev ? '\n\n' : '') + resp.text);
                                  setShowCanned(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50/60 dark:hover:bg-slate-800/90 transition-colors group cursor-pointer"
                              >
                                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-0.5">
                                  {resp.label}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 line-clamp-2 leading-relaxed">
                                  {resp.text}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex-1"></div>

                {replyType === 'PUBLIC' && replyContent.trim().length > 0 && (
                  <button
                    onClick={handlePolishMessage}
                    disabled={isPolishing || isSubmitting}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Polish message with AI"
                  >
                    <Wand2 className="w-3 h-3" />
                    {isPolishing ? 'Polishing...' : 'Polish'}
                  </button>
                )}
              </div>
              
              <div 
                className={`p-4 transition-all ${isDragging ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      id="reply-textarea"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={isDragging ? "Drop files here to attach..." : replyType === 'INTERNAL' ? 'Type an internal note visible only to agents...' : 'Type your reply to the customer... (Markdown supported)'}
                      className={`w-full h-44 p-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all resize-none text-sm leading-relaxed ${isDragging ? 'border-blue-400 bg-white/50 dark:bg-slate-900/50' : replyType === 'INTERNAL' ? 'bg-amber-50/50 border-amber-200 text-amber-900' : 'bg-white/50 dark:bg-slate-900/50 border-white/40 dark:border-slate-800 text-slate-700 dark:text-slate-300 backdrop-blur-md'}`}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800">
                            <Paperclip className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="hover:text-rose-500 transition-colors ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 justify-end shrink-0 md:w-44">
                    {/* Attach File Button */}
                    <div className="relative w-full">
                      <input 
                        type="file"
                        multiple
                        onChange={(e) => { if(e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]) }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Attach files"
                      />
                      <button type="button" className="w-full h-10 px-4 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700/60 shadow-sm">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <span>Attach</span>
                      </button>
                    </div>

                    {/* Auto Reply AI Button (Public only) */}
                    {replyType === 'PUBLIC' && (
                      <>
                        <button 
                          type="button"
                          onClick={handleAIDraft}
                          disabled={isDrafting || isSubmitting || isRunningAiResponse}
                          className="w-full h-10 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-purple-500/20 shadow-sm"
                        >
                          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>{isDrafting ? 'Generating...' : 'Auto Reply'}</span>
                        </button>

                        <button 
                          type="button"
                          onClick={handleTriggerAiResponse}
                          disabled={isRunningAiResponse || isSubmitting || isDrafting}
                          className="w-full h-10 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-indigo-500/20 shadow-sm"
                          title="Auto-synthesize Knowledge Base steps and send directly to customer email"
                        >
                          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>{isRunningAiResponse ? 'Dispatching...' : 'AI First-Responder'}</span>
                        </button>
                      </>
                    )}

                    {/* Resolve Button (Public only) */}
                    {status !== 'RESOLVED' && replyType === 'PUBLIC' && (
                       <button 
                         type="button"
                         onClick={handleResolveTicket}
                         disabled={isSavingProps || isSubmitting || isDrafting}
                         className="w-full h-10 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-emerald-500/20 shadow-sm"
                       >
                         <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                         <span>Resolve</span>
                       </button>
                    )}

                    {/* Primary Action Button: Send Reply / Add Note */}
                    <button 
                      type="button"
                      onClick={() => handleReply()}
                      disabled={!replyContent.trim() || isSubmitting || isDrafting}
                      className={`w-full h-10 px-4 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 ${
                        replyType === 'INTERNAL' 
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      }`}
                    >
                      {replyType === 'INTERNAL' ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      <span>{isSubmitting ? 'Sending...' : replyType === 'INTERNAL' ? 'Add Note' : 'Send Reply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className={`w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col shrink-0 overflow-y-auto ${isSidebarOpen ? 'flex absolute md:relative inset-y-0 right-0 z-40 shadow-2xl md:shadow-none' : 'hidden md:flex'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ticket Properties</h3>
              <button
                onClick={handleOpenReportModal}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="Generate individual case report"
              >
                <FileBarChart className="w-3.5 h-3.5" />
                <span>Case Report</span>
              </button>
            </div>
            
            <div className="space-y-5">
              {/* Assignee */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <UserPlus className="w-4 h-4" />
                  Assignee
                </label>
                <div className="relative">
                  <select 
                    value={assignedAgentId}
                    onChange={(e) => handlePropsChange('assignedAgentId', e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.email}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {!assignedAgentId && (
                  <button
                    onClick={handleClaimTicket}
                    disabled={isSavingProps}
                    className="w-full mt-2 py-2 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isSavingProps ? 'Claiming...' : '⚡ Claim Ticket (Assign to Me)'}</span>
                  </button>
                )}
              </div>

              {/* Support Layer / Tier Box */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Support Tier
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                    currentTier === 'TIER_3'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : currentTier === 'TIER_2'
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}>
                    {currentTier === 'TIER_3' ? 'Layer 3 (L3 Dev)' : currentTier === 'TIER_2' ? 'Layer 2 (L2 Tech)' : 'Layer 1 (L1 Frontline)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(true)}
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>🔺 Escalate to Next Tier</span>
                </button>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <Activity className="w-4 h-4" />
                  Status
                </label>
                <div className="relative">
                  <select 
                    value={status}
                    onChange={(e) => handlePropsChange('status', e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="NEW">New</option>
                    <option value="OPEN">Open</option>
                    <option value="PENDING_CUSTOMER">Pending Customer</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Priority
                </label>
                <div className="relative">
                  <select 
                    value={priority}
                    onChange={(e) => handlePropsChange('priority', e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <Tag className="w-4 h-4" />
                  Category
                </label>
                <div className="relative">
                  <select 
                    value={category}
                    onChange={(e) => handlePropsChange('category', e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Technical">Technical</option>
                    <option value="Billing">Billing</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {propsChanged && (
                <button 
                  onClick={handleSaveChanges}
                  disabled={isSavingProps}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSavingProps ? 'Saving...' : 'Save Changes'}
                </button>
              )}

              {/* Customer Info Unified Card */}
              <div className="mt-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 divide-y divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden shadow-xs">
                <div className="p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Customer Email
                  </span>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{ticket.studentEmail}</span>
                  </div>
                </div>
                
                <div className="p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Created At
                  </span>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{new Date(ticket.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {allAttachments.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setIsMediaModalOpen(true)}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <Paperclip className="w-4 h-4" />
                  View All Media ({allAttachments.length})
                </button>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                <History className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Customer History
              </h3>
              {isLoadingHistory ? (
                <div className="space-y-2.5 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                      </div>
                      <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : customerTickets.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No previous tickets found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerTickets.map((t) => (
                    <Link 
                      key={t.id} 
                      href={`/dashboard/tickets/${t.id}`}
                      className="block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 transition-colors">#{t.id.slice(0,8)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          t.status === 'NEW' ? 'bg-purple-100 text-purple-700' :
                          t.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                          t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'PENDING_CUSTOMER' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2">
                        {t.subject}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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

    {isMediaModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              All Media & Attachments
            </h2>
            <button 
              onClick={() => setIsMediaModalOpen(false)} 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allAttachments.map(att => (
              <a 
                key={att.id} 
                href={att.url} 
                download={att.filename}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 group"
              >
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                  <Paperclip className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{att.filename}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 uppercase">{att.mimeType || 'UNKNOWN'}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Escalation Modal with Handover Note & CC Notification */}
    {isEscalateModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-amber-500 to-rose-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black leading-tight">🔺 Escalate Support Ticket</h2>
                <p className="text-xs opacity-90 font-medium">Handover to Next Support Layer with Automated CC Email</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEscalateModalOpen(false)} 
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEscalateTicket} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Target Tier Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Tier / Layer
                </label>
                <select
                  value={targetTier}
                  onChange={(e) => setTargetTier(e.target.value as any)}
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                >
                  <option value="TIER_2">Layer 2 (L2 Technical)</option>
                  <option value="TIER_3">Layer 3 (L3 Engineering)</option>
                </select>
              </div>

              {/* Target Assignee (Filtered by Tier) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Assignee
                </label>
                <select
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                >
                  <option value="unassigned">Unassigned ({targetTier === 'TIER_2' ? 'L2 Pool' : 'L3 Pool'})</option>
                  {agents
                    .filter((a) => a.supportTier === targetTier || isAdmin)
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name ? `${agent.name} (${agent.email})` : agent.email}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Handover Note Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Handover Note & Troubleshooting Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Explain what troubleshooting steps you already tried, error details, customer symptoms, and why this ticket requires L2/L3 intervention..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-slate-400"
              />
            </div>

            {/* CC Informational Callout */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>📬 Automated Escalation Email with CC Dispatch:</span>
              </p>
              <p className="opacity-90">
                The target assignee will receive an instant handover email. <strong>All Admins and you</strong> will automatically be kept in <strong>CC</strong> for full visibility.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEscalating || !handoverNote.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>{isEscalating ? 'Escalating...' : 'Confirm Escalation'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Ticket Case Audit Report Modal */}
    {isReportModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Modal Toolbar (Non-printable) */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800 no-print">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">Case Audit & Lifecycle Report</h2>
                <p className="text-xs text-slate-400 font-medium">Ticket #{ticket.id.slice(0, 8)} • Official Record</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintReport}
                disabled={isLoadingReport}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / Save as PDF</span>
              </button>
              <button
                onClick={handleDownloadJsonReport}
                disabled={isLoadingReport || !reportData}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 active:scale-95 disabled:opacity-50"
                title="Download JSON Case Data"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">JSON</span>
              </button>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content / Printable Document */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50 dark:bg-slate-950">
            {isLoadingReport ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Generating Ticket Case Audit Report...</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Analyzing timestamps, SLA compliance & AI executive post-mortem</p>
                </div>
              </div>
            ) : reportData ? (
              <div id="printable-ticket-report" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900 dark:text-white">
                {/* Official Letterhead Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                        HD
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Helpdesk Support Case Audit
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
                      {reportData.ticket.subject}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Case ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{reportData.ticket.id}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getStatusColor(reportData.ticket.status)}`}>
                      {reportData.ticket.status}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      reportData.ticket.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                      reportData.ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                      'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {reportData.ticket.priority}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                      reportData.ticket.currentTier === 'TIER_3'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : reportData.ticket.currentTier === 'TIER_2'
                        ? 'bg-sky-100 text-sky-700 border border-sky-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      <Layers className="w-3 h-3" />
                      {reportData.ticket.currentTier === 'TIER_3' ? 'Layer 3 (L3 Dev)' : reportData.ticket.currentTier === 'TIER_2' ? 'Layer 2 (L2 Tech)' : 'Layer 1 (L1 Frontline)'}
                    </span>
                  </div>
                </div>

                {/* AI Executive Summary & Case Analysis */}
                <div className="p-4 sm:p-5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Executive Summary & Resolution Analysis</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {reportData.aiExecutiveSummary || 'Summary currently compiling...'}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Key Performance & SLA Metrics Grid */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    Timeline & SLA Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Created At</span>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1">
                        {new Date(reportData.timelines.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(reportData.timelines.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>First Response (FRT)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1">
                        {reportData.timelines.firstResponseFormatted}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {reportData.timelines.firstResponseAt ? new Date(reportData.timelines.firstResponseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Total Turnaround (MTTR)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1">
                        {reportData.timelines.resolutionFormatted}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {reportData.timelines.resolvedAt ? new Date(reportData.timelines.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>SLA Compliance</span>
                      </div>
                      <div className="mt-1">
                        {reportData.timelines.slaStatus === 'COMPLIANT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                            ✅ SLA Met
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-black">
                            ⚠️ SLA Breached
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">3-Hour Threshold</p>
                    </div>
                  </div>
                </div>

                {/* Stakeholders & Handover Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer Information */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Customer / Requester</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {reportData.ticket.studentEmail}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Category: <span className="font-semibold text-slate-700 dark:text-slate-300">{reportData.ticket.category}</span>
                    </p>
                  </div>

                  {/* Assigned Staff */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assigned Agent & Support Tier</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {reportData.assignedAgent ? (reportData.assignedAgent.name || reportData.assignedAgent.email) : 'Unassigned (General Pool)'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Tier: <span className="font-semibold text-slate-700 dark:text-slate-300">{reportData.assignedAgent?.supportTier || reportData.ticket.currentTier}</span>
                      {reportData.assignedAgent?.email && ` • ${reportData.assignedAgent.email}`}
                    </p>
                  </div>
                </div>

                {/* Handover & Escalation Note (If present) */}
                {reportData.ticket.escalationReason && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Handover & Escalation Record</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {reportData.ticket.escalationReason}
                    </p>
                  </div>
                )}

                {/* Activity Breakdown Stats */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div>Total Interactions: <strong className="text-slate-900 dark:text-white">{reportData.stats.totalMessages}</strong></div>
                  <div>Customer Updates: <strong className="text-slate-900 dark:text-white">{reportData.stats.customerMessagesCount}</strong></div>
                  <div>Staff Replies: <strong className="text-slate-900 dark:text-white">{reportData.stats.agentMessagesCount}</strong></div>
                  <div>Internal Notes: <strong className="text-slate-900 dark:text-white">{reportData.stats.internalNotesCount}</strong></div>
                  <div>Attachments: <strong className="text-slate-900 dark:text-white">{reportData.stats.attachmentsCount}</strong></div>
                </div>

                {/* Chronological Message & Activity Audit Trail */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Complete Chronological Case History & Audit Trail
                  </h3>
                  <div className="space-y-3">
                    {reportData.timelineEvents.map((evt: any, idx: number) => (
                      <div key={evt.id || idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              evt.senderType === 'STUDENT'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : evt.senderType === 'INTERNAL'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : evt.senderType === 'SYSTEM'
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : evt.isAi
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              {evt.senderType === 'STUDENT' ? 'Customer' : evt.senderType === 'INTERNAL' ? 'Internal Note' : evt.senderType === 'SYSTEM' ? 'System' : evt.isAi ? 'AI First-Responder' : 'Support Agent'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(evt.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                          {evt.content}
                        </p>
                        {evt.attachments && evt.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {evt.attachments.map((att: any) => (
                              <span key={att.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                <Paperclip className="w-3 h-3 text-blue-500" />
                                {att.filename}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Stamp & Footer */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400">
                  <div>
                    Generated by: <strong className="text-slate-600 dark:text-slate-300">{reportData.generatedBy.name} ({reportData.generatedBy.role})</strong>
                  </div>
                  <div>
                    Audit Timestamp: {new Date(reportData.generatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )}

    {/* Print Stylesheet for clean A4 printing */}
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-ticket-report, #printable-ticket-report * {
          visibility: visible !important;
        }
        #printable-ticket-report {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 24px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: none !important;
          border: none !important;
          z-index: 99999 !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `}</style>
    </>
  );
}
