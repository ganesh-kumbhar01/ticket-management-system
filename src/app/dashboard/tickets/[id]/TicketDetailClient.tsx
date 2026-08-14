"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Clock, User as UserIcon, AlertCircle, Paperclip, CheckCircle, Tag, MessageSquare, Plus, Users, History, FileText, ChevronLeft, Trash2, X, Bold, Italic, List, Link as LinkIcon, FileCheck, ArrowLeft, Activity, Sparkles, UserPlus, Lock, Bot, Eye, Wand2 } from 'lucide-react';
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
  createdAt: Date;
  messages: Message[];
};

type Agent = {
  id: string;
  email: string;
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
    
    const interval = setInterval(pingPresence, 10000);
    return () => clearInterval(interval);
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

  const handleClaimTicket = async () => {
    setIsSavingProps(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedAgentId: currentUserId }),
      });

      if (!res.ok) throw new Error('Failed to claim ticket');
      
      setAssignedAgentId(currentUserId);
      toast.success('Ticket claimed');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to claim ticket');
    } finally {
      setIsSavingProps(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSavingProps(true);
    try {
      const updateData = {
        status,
        priority,
        category,
        assignedAgentId: assignedAgentId === '' ? null : assignedAgentId,
      };
      
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update ticket properties');
      
      setPropsChanged(false);
      toast.success('Changes saved');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes');
    } finally {
      setIsSavingProps(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
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
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{ticket.subject}</h1>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              #{ticket.id} • Created on {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!assignedAgentId && !isAdmin && (
            <button
              onClick={handleClaimTicket}
              disabled={isSavingProps}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              {isSavingProps ? 'Claiming...' : 'Claim Ticket'}
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold animate-pulse">
              <Eye className="w-3.5 h-3.5" />
              {activeViewers.map(v => v.userName.split('@')[0]).join(', ')} {activeViewers.length === 1 ? 'is' : 'are'} also viewing this ticket
            </div>
          )}
          <button
            onClick={handleDeleteTicket}
            className="hidden md:flex p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
            title="Delete Ticket"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-transparent min-w-0">
          <div className="max-w-4xl mx-auto p-6 md:p-8">
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
                  const isAgent = msg.senderType === 'AGENT' || msg.senderType === 'AI_DRAFT' || isInternal;
                  
                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[85%] ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="shrink-0 mt-1">
                          {isAgent ? (
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
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {isInternal ? 'Internal Note' : isAgent ? 'Support Team' : ticket.studentEmail}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`p-4 rounded-2xl shadow-sm backdrop-blur-xl ${
                            isInternal
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
                <div className="flex-1"></div>
                {replyType === 'PUBLIC' && (
                  <div className="relative">
                    <button onClick={() => setShowCanned(!showCanned)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg border border-slate-200/80 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                      <FileCheck className="w-3.5 h-3.5" />
                      Canned Responses
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
                      <button 
                        type="button"
                        onClick={handleAIDraft}
                        disabled={isDrafting || isSubmitting}
                        className="w-full h-10 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-purple-500/20 shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>{isDrafting ? 'Generating...' : 'Auto Reply'}</span>
                      </button>
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Ticket Properties</h3>
            
            <div className="space-y-5">
              {/* Assignee */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <UserPlus className="w-4 h-4" />
                  Assignee
                </label>
                <select 
                  value={assignedAgentId}
                  onChange={(e) => handlePropsChange('assignedAgentId', e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                >
                  <option value="">Unassigned</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.email}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <Activity className="w-4 h-4" />
                  Status
                </label>
                <select 
                  value={status}
                  onChange={(e) => handlePropsChange('status', e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                >
                  <option value="NEW">New</option>
                  <option value="OPEN">Open</option>
                  <option value="PENDING_CUSTOMER">Pending Customer</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Priority
                </label>
                <select 
                  value={priority}
                  onChange={(e) => handlePropsChange('priority', e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                  <Activity className="w-4 h-4" />
                  Category
                </label>
                <select 
                  value={category}
                  onChange={(e) => handlePropsChange('category', e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                >
                  <option value="General">General</option>
                  <option value="Technical">Technical</option>
                  <option value="Billing">Billing</option>
                  <option value="Feature Request">Feature Request</option>
                </select>
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

              <div className="border-t border-slate-100 dark:border-slate-800/50 pt-5 mt-5">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Customer Email</span>
                  <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">{ticket.studentEmail}</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Created At</span>
                  <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                    {new Date(ticket.createdAt).toLocaleString('en-US')}
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
                <div className="text-center py-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 animate-pulse">Loading history...</p>
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
    </>
  );
}
