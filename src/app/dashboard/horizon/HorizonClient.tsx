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
  ShieldAlert,
  Sliders,
  Send,
  RotateCcw,
  Flame,
  ShieldCheck,
  AlertCircle
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

interface SimulationResult {
  scenarioTitle: string;
  impactMetrics: {
    slaBreachRisk: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    queueDelayHours: string;
    backlogSurgeCount: string;
    teamStressIndex: 'EXTREME' | 'ELEVATED' | 'MODERATE' | 'STABLE';
  };
  blastRadiusSummary: string;
  tacticalActionPlan: {
    phase: string;
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM';
    steps: string[];
  }[];
  oneClickAction?: {
    label: string;
    type: 'AUTO_ASSIGN' | 'DRAFT_KB' | 'ESCALATE_STALE';
    payload: any;
  };
}

const PRESET_SCENARIOS = [
  { label: '⚡ 3x Ticket Surge (Course Launch)', text: '500 students face payment failures and access delays during course launch.' },
  { label: '💳 Payment Gateway Downtime (4 hrs)', text: 'Payment gateway API goes down for 4 hours; students get charged but orders stay pending.' },
  { label: '👥 50% Staff Emergency Leave', text: 'Half of our active support agents take emergency sick leave for 3 days.' },
  { label: '🐞 Video Player Bug on Mobile App', text: 'Android app video player DRM crashes for all mobile users after new update.' },
  { label: '🎟️ Promo Code & Discount Glitch', text: 'Flash sale coupon code fails at checkout, generating 200 angry customer queries.' },
];

export default function HorizonClient({ userRole, userEmail }: { userRole: string; userEmail: string }) {
  const [data, setData] = useState<HorizonData | null>(null);
  const [metrics, setMetrics] = useState<RawMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Interactive What-If Simulation Sandbox State
  const [customScenario, setCustomScenario] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

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

  const handleRunSimulation = async (scenarioText?: string) => {
    const textToSimulate = (scenarioText || customScenario).trim();
    if (!textToSimulate) {
      toast.error('Please enter a scenario or click a preset!');
      return;
    }

    setIsSimulating(true);
    setCustomScenario(textToSimulate);
    const toastId = toast.loading('Simulating impact against live database baseline...');

    try {
      const res = await fetch('/api/horizon/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: textToSimulate })
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setSimulationResult(json.data);
        toast.success('🎯 Simulation complete! Projected impact and action plan ready.', { id: toastId });
      } else {
        throw new Error(json.error || 'Simulation failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to run simulation', { id: toastId });
    } finally {
      setIsSimulating(false);
    }
  };

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

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-rose-600 text-white';
      case 'HIGH':
        return 'bg-amber-600 text-white';
      case 'MODERATE':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-emerald-600 text-white';
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
                  {userRole === 'ADMIN' ? 'Executive AI Operations' : 'Agent AI Copilot'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {userRole === 'ADMIN' 
                  ? 'Real-time operational diagnosis, interactive crisis stress-testing, and automated mitigations.' 
                  : 'Live shift intelligence, personal queue insights, and fast solution actions.'}
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
          <div className="h-48 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800"></div>
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

          {/* SECTION 2: Interactive "What-If" Predictive Scenario Simulator & Stress-Testing Sandbox */}
          <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-blue-900/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 backdrop-blur-2xl rounded-3xl border border-indigo-500/30 dark:border-indigo-500/20 p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>Predictive Scenario: &quot;What-If&quot; Stress-Testing Simulator</span>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 rounded-full">
                      Interactive Sandbox
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Input any hypothetical crisis, traffic surge, or staff shortage to simulate blast radius & generate a 3-phase action plan.
                  </p>
                </div>
              </div>

              {simulationResult && (
                <button
                  onClick={() => {
                    setSimulationResult(null);
                    setCustomScenario('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-all self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sandbox</span>
                </button>
              )}
            </div>

            {/* Input Form & Quick Scenario Presets */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customScenario}
                  onChange={(e) => setCustomScenario(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSimulating) {
                      handleRunSimulation();
                    }
                  }}
                  placeholder="Type your scenario (e.g., 'What if 500 payment failed tickets arrive during launch?' or '2 agents go on leave?')..."
                  className="flex-1 px-4 py-3 bg-white/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 shadow-sm"
                />
                <button
                  onClick={() => handleRunSimulation()}
                  disabled={isSimulating || !customScenario.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Simulating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Run Simulation &rarr;</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Scenario Preset Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Quick Presets:</span>
                {PRESET_SCENARIOS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRunSimulation(preset.text)}
                    disabled={isSimulating}
                    className="px-3 py-1 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Results Display */}
            {simulationResult && (
              <div className="pt-4 border-t border-indigo-200/40 dark:border-indigo-900/40 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                
                {/* Title & Blast Radius KPI Grid */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-rose-500" />
                      <span>{simulationResult.scenarioTitle}</span>
                    </h4>
                    <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full shadow-sm ${getRiskBadgeColor(simulationResult.impactMetrics.riskLevel)} self-start sm:self-auto`}>
                      Risk Level: {simulationResult.impactMetrics.riskLevel}
                    </span>
                  </div>

                  {/* Impact Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/20 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                        SLA Breach Risk
                      </span>
                      <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
                        {simulationResult.impactMetrics.slaBreachRisk}%
                      </p>
                    </div>

                    <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                        Projected Queue Delay
                      </span>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                        {simulationResult.impactMetrics.queueDelayHours}
                      </p>
                    </div>

                    <div className="bg-purple-500/10 dark:bg-purple-950/30 border border-purple-500/20 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                        Backlog Surge
                      </span>
                      <p className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-0.5">
                        {simulationResult.impactMetrics.backlogSurgeCount}
                      </p>
                    </div>

                    <div className="bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-3.5 text-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                        Team Stress Index
                      </span>
                      <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {simulationResult.impactMetrics.teamStressIndex}
                      </p>
                    </div>
                  </div>

                  {/* Blast Radius Summary */}
                  <div className="p-4 bg-white/70 dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs md:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    <span className="font-bold text-slate-900 dark:text-white mr-1.5">💥 Blast Radius Analysis:</span>
                    {simulationResult.blastRadiusSummary}
                  </div>
                </div>

                {/* 3-Phase Tactical Mitigation Action Plan */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>3-Phase Tactical Mitigation Playbook</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {simulationResult.tacticalActionPlan.map((phase, pIdx) => (
                      <div
                        key={pIdx}
                        className="bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {phase.phase}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                              phase.priority === 'IMMEDIATE'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : phase.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {phase.priority}
                            </span>
                          </div>

                          <ul className="space-y-1.5">
                            {phase.steps.map((step, sIdx) => (
                              <li key={sIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-snug">
                                <span className="text-indigo-500 font-bold mt-0.5">•</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1-Click Execution Action */}
                {simulationResult.oneClickAction && (
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Zap className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-200 block uppercase tracking-wider">
                          Recommended Instant AI Mitigation
                        </span>
                        <p className="text-sm font-black text-white">
                          {simulationResult.oneClickAction.label}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExecuteAction(
                        simulationResult.oneClickAction!.type,
                        simulationResult.oneClickAction!.payload,
                        'simulation-action'
                      )}
                      disabled={executingActionId === 'simulation-action'}
                      className="w-full sm:w-auto px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{executingActionId === 'simulation-action' ? 'Executing...' : 'Execute Mitigation Now'}</span>
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* SECTION 3: The 3-Step Operations Matrix (Operational Diagnosis of Present State) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>3-Stage Operational Diagnosis (Present State)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live System Bottleneck &rarr; Root Cause (Why) &rarr; Recommended 1-Click Action Plan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {data.insights.length === 0 ? (
                <div className="p-10 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-slate-800 text-slate-500">
                  No active operational bottlenecks. All systems running at optimal capacity!
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
