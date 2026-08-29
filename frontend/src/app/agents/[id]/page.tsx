"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, Brain, Activity, Clock, Zap, AlertTriangle } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  reputation_score: number;
  required_collateral_pct: number;
  balance: number;
  staked_amount: number;
  capability_manifest: any;
  created_at: string;
}

interface ReputationEvent {
  id: string;
  agent_id: string;
  task_id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export default function AgentProfilePage() {
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [history, setHistory] = useState<ReputationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [agentRes, historyRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/agents/${agentId}`),
        fetch(`http://127.0.0.1:8000/agents/${agentId}/reputation-history`),
      ]);
      if (agentRes.ok) setAgent(await agentRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
    } catch (err) {
      console.error("Failed to fetch agent data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [agentId]);

  const simulateEpoch = async () => {
    await fetch(`http://127.0.0.1:8000/agents/simulate-epoch`, { method: "POST" });
    fetchData();
  };

  if (loading) {
    return <div className="p-8 text-zinc-400">Loading agent profile...</div>;
  }

  if (!agent) {
    return <div className="p-8 text-red-400">Agent not found.</div>;
  }

  // Calculate cumulative reputation for the chart
  let currentRep = 0;
  const chartData = history.map((event, index) => {
    currentRep += event.delta;
    return {
      name: `Event ${index + 1}`,
      date: new Date(event.created_at).toLocaleDateString(),
      reputation: currentRep,
      delta: event.delta,
      reason: event.reason,
    };
  });
  
  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 pt-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            <Brain className="w-10 h-10 text-purple-500" />
            {agent.name}
          </h1>
          <p className="text-zinc-400 mt-2 font-mono text-sm">{agent.id}</p>
        </div>
        <button 
          onClick={simulateEpoch}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-zinc-700 shadow-xl shadow-black/20"
        >
          Simulate Time Decay (Epoch)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield className="w-32 h-32" />
            </div>
            
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Reputation Score</h2>
            <div className="text-5xl font-black text-white mb-4">
              {agent.reputation_score.toFixed(3)}
            </div>
            
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <p className="text-purple-300 text-xs leading-relaxed">
                <span className="font-bold text-purple-400 block mb-1">Soulbound — non-transferable,</span>
                earned only from verified outcomes, log-scaled against transaction volume to resist wash-trading.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Required Collateral
            </h2>
            <div className="text-4xl font-bold text-white mb-2">
              {(agent.required_collateral_pct * 100).toFixed(0)}%
            </div>
            <p className="text-zinc-500 text-sm">
              As reputation increases, required collateral linearly decreases down to a floor of 10%.
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
             <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Capabilities
            </h2>
             <div className="flex flex-wrap gap-2">
               {Object.keys(agent.capability_manifest).map(cap => (
                 <span key={cap} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs font-mono">
                   {cap}
                 </span>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column: Chart & History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-[400px] flex flex-col">
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Reputation Trajectory
            </h2>
            <div className="flex-1 w-full">
              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#52525b" 
                      tick={{fill: '#71717a', fontSize: 12}} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#52525b" 
                      tick={{fill: '#71717a', fontSize: 12}}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#d4d4d8' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reputation" 
                      stroke="#a855f7" 
                      strokeWidth={3}
                      dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#fff' }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 font-mono text-sm">
                  No reputation events recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Event Ledger
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {history.slice().reverse().map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-800/50">
                  <div>
                    <div className="font-mono text-sm text-zinc-300">{event.reason}</div>
                    <div className="text-xs text-zinc-600 mt-1">{new Date(event.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono text-lg font-bold ${event.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {event.delta > 0 ? '+' : ''}{event.delta.toFixed(3)}
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-zinc-500 text-sm">No ledger entries.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
