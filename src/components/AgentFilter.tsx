"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';

export default function AgentFilter({ 
  agents, 
  currentAgentId 
}: { 
  agents: { id: string, name: string | null, email: string }[],
  currentAgentId: string
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val === 'all') {
      params.delete('agentId');
    } else {
      params.set('agentId', val);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
      <Users className="w-4 h-4 text-slate-400" />
      <select 
        value={currentAgentId}
        onChange={handleChange}
        className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer"
      >
        <option value="all">All Agents (Company View)</option>
        <option value="unassigned">Unassigned Tickets</option>
        <optgroup label="Specific Agents">
          {agents.map(a => (
            <option key={a.id} value={a.id}>
              {a.name || a.email}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
