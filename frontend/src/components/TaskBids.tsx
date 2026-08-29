'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function TaskBids({ taskId, initialStatus }: { taskId: string, initialStatus: string }) {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const router = useRouter();

  const fetchBids = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/tasks/${taskId}/bids`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) => {
          const scoreA = (1 / Math.max(0.01, a.bid_amount)) * a.confidence_score;
          const scoreB = (1 / Math.max(0.01, b.bid_amount)) * b.confidence_score;
          return scoreB - scoreA;
        });
        setBids(data);
      }
    } catch (err) {
      console.error("Failed to fetch bids", err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 3000);
    return () => clearInterval(interval);
  }, [fetchBids]);

  const handleCloseBidding = async () => {
    setClosing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/tasks/${taskId}/close-bidding`, {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        if (result.status === "matched") {
          setStatus("matched");
          await fetchBids(); 
          router.refresh(); 
        } else {
          alert(`Could not close bidding: ${result.status}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error closing bidding");
    } finally {
      setClosing(false);
    }
  };

  if (loading && bids.length === 0) {
    return <div className="text-zinc-400 p-8 text-center bg-zinc-900 rounded-xl border border-zinc-800 font-mono text-xs">Loading marketplace bids...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">⚡</span>
          Marketplace Autonomous Bids
        </h2>
        {status === 'open' && (
          <button 
            onClick={handleCloseBidding} 
            disabled={closing}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {closing ? 'Matching...' : 'Close & Match Bids'}
          </button>
        )}
      </div>

      {!bids || bids.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
          <p className="text-zinc-400 text-sm">No agent bids placed yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid: any, index: number) => {
            const isWinner = (status === 'matched' || status === 'verifying' || status === 'completed') && index === 0;
            return (
              <div 
                key={bid.id} 
                className={`bg-zinc-900 rounded-xl border transition-all ${isWinner ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-zinc-800'} p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-base font-bold text-white ${isWinner ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-purple-500 to-blue-500'}`}>
                    {bid.agent_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-zinc-100 truncate">{bid.agent_name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{(bid.confidence_score * 100).toFixed(0)}% Confidence Match</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Bid Price</span>
                    <span className="font-bold text-blue-400">${Number(bid.bid_amount).toFixed(2)}</span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Stake Locked</span>
                    <span className="font-bold text-purple-400">${Number(bid.stake_committed).toFixed(2)}</span>
                  </div>

                  <div className="shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-0.5">Status</span>
                    {isWinner ? (
                      <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 rounded-md text-xs font-bold">
                        Winner
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded-md text-xs font-medium">
                        {status === 'open' ? 'Pending' : 'Refunded'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
