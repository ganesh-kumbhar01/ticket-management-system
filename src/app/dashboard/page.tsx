import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import DashboardCharts from '@/components/DashboardCharts';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyJwtToken(token);

  if (!payload) {
    redirect('/login');
  }

  const isAdmin = payload.role === 'ADMIN';

  const whereClause = isAdmin ? {} : { assignedAgentId: payload.userId };

  const [totalTickets, openTickets, progressTickets, resolvedTickets, unassignedTickets] = await Promise.all([
    prisma.ticket.count({ where: whereClause }),
    prisma.ticket.count({ where: { ...whereClause, status: 'NEW' } }),
    prisma.ticket.count({ where: { ...whereClause, status: { in: ['OPEN', 'PENDING_CUSTOMER'] } } }),
    prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { assignedAgentId: null } })
  ]);

  const recentTickets = await prisma.ticket.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let unassignedRecentTickets: any[] = [];
  if (!isAdmin) {
    unassignedRecentTickets = await prisma.ticket.findMany({
      where: { assignedAgentId: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  let statusStats: any = [];
  let agentStats: any = [];
  let trendData: any = [];
  if (isAdmin) {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentTicketsForChart = await prisma.ticket.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true }
    });

    const countsByDate: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      countsByDate[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
    }

    recentTicketsForChart.forEach(t => {
      const key = t.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
      if (countsByDate[key] !== undefined) countsByDate[key]++;
    });

    trendData = Object.keys(countsByDate).map(key => ({
      name: key,
      tickets: countsByDate[key]
    }));

    statusStats = await prisma.ticket.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' }
      }
    });

    const agents = await prisma.user.findMany({
      where: { role: { in: ['AGENT', 'ADMIN'] } },
      include: {
        assignedTickets: {
          select: { status: true }
        }
      }
    });

    agentStats = agents.map(agent => {
      const total = agent.assignedTickets.length;
      const resolved = agent.assignedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      const open = agent.assignedTickets.filter(t => t.status === 'OPEN' || t.status === 'NEW' || t.status === 'PENDING_CUSTOMER').length;
      return {
        id: agent.id,
        name: agent.name || 'Unknown',
        email: agent.email,
        role: agent.role,
        total,
        resolved,
        open
      };
    }).sort((a, b) => b.total - a.total);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'OPEN': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'PENDING_CUSTOMER': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'CLOSED': return 'bg-slate-100 text-slate-700 border border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const greeting = getGreeting();
  const roleTitle = isAdmin ? 'Admin' : 'Agent';

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-4 shrink-0">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {greeting}, {roleTitle}
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm font-medium">
            {isAdmin ? 'Here is what\'s happening with your support system today.' : 'Here is the latest update on your assigned tickets.'}
          </p>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 shrink-0">
          <div className="bg-white/60 backdrop-blur-lg border border-white/50 rounded-xl p-4 shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold mb-1">Total Tickets</h3>
            <p className="text-2xl font-bold text-slate-900">{totalTickets}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-lg border border-white/50 rounded-xl p-4 shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold mb-1">Open</h3>
            <p className="text-2xl font-bold text-purple-600">{openTickets}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-lg border border-white/50 rounded-xl p-4 shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold mb-1">In Progress</h3>
            <p className="text-2xl font-bold text-amber-500">{progressTickets}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-lg border border-white/50 rounded-xl p-4 shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold mb-1">Resolved</h3>
            <p className="text-2xl font-bold text-emerald-500">{resolvedTickets}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-lg border border-white/50 rounded-xl p-4 shadow-sm">
            <h3 className="text-slate-500 text-xs font-semibold mb-1">Unassigned</h3>
            <p className="text-2xl font-bold text-rose-500">{unassignedTickets}</p>
          </div>
        </div>

        {/* Admin Advanced Visualizations */}
        {isAdmin && (
          <div className="shrink-0">
            <DashboardCharts statusStats={statusStats} trendData={trendData} />
          </div>
        )}

        {/* Tables Section */}
        <div className={`grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4`}>
          {/* Recent Tickets Table */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl flex flex-col overflow-hidden shadow-sm min-w-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-transparent">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {isAdmin ? 'Recent System Tickets' : 'Your Active Tickets'}
              </h2>
              <Link href="/dashboard/tickets" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                View all &rarr;
              </Link>
            </div>
          
          <div className="overflow-x-auto">
            {recentTickets.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 text-sm font-medium">No tickets found. You are all caught up!</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white/40">
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sender</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-white/50 transition-colors bg-transparent">
                      <td className="py-2.5 px-4 text-xs text-slate-500 font-medium">#{ticket.id.slice(0,8)}</td>
                      <td className="py-2.5 px-4 text-xs font-bold text-slate-900">
                        <Link href={`/dashboard/tickets/${ticket.id}`} className="hover:text-blue-600 transition-colors truncate block max-w-xs">
                          {ticket.subject}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">{ticket.studentEmail}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 font-medium">{ticket.category}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ticket.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          ticket.priority === 'NORMAL' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-500 font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Second Table Column */}
        {!isAdmin && (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl flex flex-col overflow-hidden shadow-sm min-w-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-transparent">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Unassigned Queue
                </h2>
                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unassignedTickets} NEW
                </span>
              </div>
              <Link href="/dashboard/tickets?tab=unassigned" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="overflow-x-auto">
              {unassignedRecentTickets.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500 text-sm font-medium">No unassigned tickets right now.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-100 bg-white/40">
                      <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unassignedRecentTickets.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-white/50 transition-colors bg-transparent">
                        <td className="py-2.5 px-4 text-xs font-bold text-slate-900">
                          <Link href={`/dashboard/tickets/${ticket.id}`} className="hover:text-blue-600 transition-colors truncate block max-w-xs">
                            {ticket.subject}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500 font-medium">
                          {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Agent Performance Table */}
        {isAdmin && (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl flex flex-col overflow-hidden shadow-sm min-w-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-transparent">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Agent Performance
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-100 bg-white/40">
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Assigned</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Open/WIP</th>
                    <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentStats.map((agent: any) => (
                    <tr key={agent.id} className="hover:bg-white/50 transition-colors bg-transparent">
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">{agent.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{agent.email}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{agent.total}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{agent.open}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{agent.resolved}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
