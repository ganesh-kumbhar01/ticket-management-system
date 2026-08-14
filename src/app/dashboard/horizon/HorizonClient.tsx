"use client";

import { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  HelpCircle, 
  Activity,
  Layers,
  Users,
  Clock,
  BookOpen,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface InsightItem {
  id: string;
  tag: string;
  severity: 'CRITICAL' | 'WARNING' | 'OPTIMIZATION' | 'POSITIVE';
  what: string;
  why: string;
  whatIf: string;
  action: {
    label: string;
    type: 'AUTO_ASSIGN' | 'DRAFT_KB' | 'ESCALATE_STALE';
    payload: any;
  };
}

interface HorizonData {
  healthScore: number;
  healthStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  dailySummary: {
    headline: string;
    keyHighlights: string[];
  };
  whatIfHero: {
    title: string;
    currentPain: string;
    projectedOutcome: string;
    actionLabel: string;
    actionType: 'AUTO_ASSIGN' | 'DRAFT_KB' | 'ESCALATE_STALE';
    actionPayload: any;
  };
  insights: InsightItem[];
}

interface RawMetrics {
  totalTickets: number;
  activeTicketsCount: number;
  unassignedCount: number;
  resolutionRate: number;
  agentCount: number;
  highPriorityCount: number;
}

export default function HorizonClient({ userRole, userEmail }: { userRole: string; userEmail: string }) {
  const [data, setData] = useState<HorizonData | null>(null);
  const [metrics, setMetrics] = useState<RawMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const fetchHorizonData = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const res = await fetch('/api/horizon');
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        setMetrics(json.rawMetrics);
        if (showToast) toast.success('Horizon analysis refreshed with live data!');
      } else {
        throw new Error(json.error || 'Failed to fetch Horizon data');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not load Horizon analysis');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHorizonData();
  }, []);

  const handleExecuteAction = async (actionType: string, payload: any, actionId: string) => {
    try {
      setExecutingActionId(actionId);
      const res = await fetch('/api/horizon/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, payload })
      });

      const result = await res.json();
      if (result.success || result.message) {
        toast.success(result.message || 'Action executed successfully!');
        // Refresh analysis to reflect updated DB state
        await fetchHorizonData();
      } else {
        throw new Error(result.error || 'Action execution failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute action');
    } finally {
      setExecutingActionId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'POSITIVE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'ATTENTION':
        return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
      default:
        return 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Horizon
                </h1>
                <span className="px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-indigo-600 text-white rounded-md shadow-sm">
                  AI Operations
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time situational awareness, root-cause diagnosis, and future action plans.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchHorizonData(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/40 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isRefreshing ? 'Analyzing Live Data...' : 'Refresh Analysis'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 animate-pulse">
          <div className="h-44 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800"></div>
          <div className="h-36 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800"></div>
          <div className="h-64 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800"></div>
        </div>
      ) : data ? (
        <>
          {/* SECTION 1: Daily Executive Briefing & Health Score */}
          <div className="bg-gradient-to-br from-white/60 via-white/40 to-indigo-50/30 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-indigo-950/20 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-slate-800/60 p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Daily Executive Briefing
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">• Today</span>
                </div>

                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                  {data.dailySummary.headline}
                </h2>

                <div className="flex flex-wrap gap-2 pt-1">
                  {data.dailySummary.keyHighlights.map((highlight, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 border border-white/40 dark:border-slate-700/50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              {/* System Health Score Badge */}
              <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/50 dark:border-slate-800/60 self-stretch sm:self-auto shrink-0 justify-center">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {data.healthScore}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/100</span>
                  </div>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${getHealthColor(data.healthStatus)}`}>
                    {data.healthStatus}
                  </span>
                </div>
                <div className="w-[1px] h-12 bg-slate-200 dark:bg-slate-800"></div>
                <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Operational Index</p>
                  <p>{metrics?.resolutionRate || 0}% Resolution Rate</p>
                  <p>{metrics?.unassignedCount || 0} Unassigned in Queue</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: "What-If" Impact Forecast Hero */}
          {data.whatIfHero && (
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 backdrop-blur-2xl rounded-3xl border border-indigo-500/20 dark:border-indigo-500/20 p-6 md:p-7 shadow-sm">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Predictive Scenario: What If We Do This?
                    </span>
                  </div>
                  
                  <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                    {data.whatIfHero.title}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-white/40 dark:border-slate-800/40 text-xs">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">CURRENT SITUATION:</span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">{data.whatIfHero.currentPain}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">PROJECTED IMPACT:</span>
                      <p className="text-emerald-900 dark:text-emerald-200 font-bold">{data.whatIfHero.projectedOutcome}</p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                  <button
                    onClick={() => handleExecuteAction(data.whatIfHero.actionType, data.whatIfHero.actionPayload, 'hero-action')}
                    disabled={executingActionId === 'hero-action'}
                    className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{executingActionId === 'hero-action' ? 'Executing...' : data.whatIfHero.actionLabel}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: The 3-Step Operations Matrix */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>3-Stage Operational Diagnosis</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  What is happening &rarr; Root cause (Why) &rarr; Recommended 1-Click Action Plan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {data.insights.length === 0 ? (
                <div className="p-10 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800 text-slate-500">
                  No active operational alerts. All systems running at optimal capacity!
                </div>
              ) : (
                data.insights.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-slate-800/60 p-5 md:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    {/* Card Top Tag */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getSeverityBadge(item.severity)}`}>
                        {item.tag}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Live System Signal
                      </span>
                    </div>

                    {/* 3 Interconnected Columns (What -> Why -> Action) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-1">
                      {/* Step 1: What is happening? */}
                      <div className="space-y-1.5 p-3.5 bg-white/50 dark:bg-slate-800/40 rounded-xl border border-white/40 dark:border-slate-700/40">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-black">1</span>
                          <span>What is happening?</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                          {item.what}
                        </p>
                      </div>

                      {/* Step 2: Why is it happening? */}
                      <div className="space-y-1.5 p-3.5 bg-white/50 dark:bg-slate-800/40 rounded-xl border border-white/40 dark:border-slate-700/40">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center text-[10px] font-black">2</span>
                          <span>Why is it happening? (Root Cause)</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {item.why}
                        </p>
                      </div>

                      {/* Step 3: What to do? Action Plan */}
                      <div className="space-y-2.5 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/40 dark:border-indigo-800/40 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                            <span className="w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black">3</span>
                            <span>Action Plan & Impact</span>
                          </div>
                          <p className="text-xs text-indigo-950 dark:text-indigo-200 mt-1 leading-relaxed font-medium">
                            {item.whatIf}
                          </p>
                        </div>

                        <button
                          onClick={() => handleExecuteAction(item.action.type, item.action.payload, item.id)}
                          disabled={executingActionId === item.id}
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{executingActionId === item.id ? 'Applying...' : item.action.label}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800">
          <p className="text-slate-500">Failed to load Horizon analytics. Click refresh to try again.</p>
        </div>
      )}
    </div>
  );
}
