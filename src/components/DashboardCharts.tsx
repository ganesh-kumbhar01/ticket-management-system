"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
} from 'recharts';

type DashboardChartsProps = {
  statusStats: { status: string; _count: { id: number } }[];
  trendData: { name: string; tickets: number }[];
};

export default function DashboardCharts({ statusStats, trendData }: DashboardChartsProps) {

  const statusData = statusStats.map(stat => ({
    name: stat.status,
    value: stat._count.id
  }));

  const STATUS_COLORS: Record<string, string> = {
    'NEW': '#A855F7',
    'OPEN': '#F59E0B',
    'PENDING_CUSTOMER': '#F97316',
    'RESOLVED': '#10B981',
    'CLOSED': '#64748B',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* Area Chart: Ticket Trend */}
      <div className="lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm p-4">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Ticket Volume</h3>
          <p className="text-xs text-slate-500">Last 7 days</p>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
              <Area type="monotone" dataKey="tickets" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorTickets)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart: Tickets by Status */}
      <div className="lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm p-4">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Tickets by Status</h3>
          <p className="text-xs text-slate-500">Current pipeline</p>
        </div>
        <div className="h-36 w-full">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={40} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} itemStyle={{ color: '#0F172A', fontWeight: 600 }} />
                <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
              No status data
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
