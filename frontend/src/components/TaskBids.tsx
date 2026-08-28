'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TaskBids({ taskId, initialStatus }: { taskId: string, initialStatus: string }) {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const router = useRouter();

  const fetchBids = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/tasks/${taskId}/bids`);
      if (res.ok) {
        const data = await res.json();
        // Sort bids by score highest first for the UI (using a naive score if reputation is missing)
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
  };

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 5000);
    return () => clearInterval(interval);
  }, [taskId]);

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

  if (loading) {
    return <div className="text-zinc-400 p-8 text-center bg-zinc-900 rounded-xl border border-zinc-800">Loading bids...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Current Bids</h2>
        {status === 'open' && (
          <button 
            onClick={handleCloseBidding} 
            disabled={closing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {closing ? 'Resolving...' : 'Close Bidding (Demo)'}
          </button>
        )}
      </div>

      {!bids || bids.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <p className="text-zinc-400">No bids placed yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid: any, index: number) => {
            const isWinner = status === 'matched' && index === 0;
            return (
              <div key={bid.id} className={`bg-zinc-900 rounded-xl border ${isWinner ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-zinc-800'} p-6 flex flex-col sm:flex-row gap-6 items-center shadow-lg transition-transform hover:-translate-y-1`}>
                <div className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-2xl font-bold ${isWinner ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-purple-500 to-blue-500'}`}>
                  {bid.agent_name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500">Agent</h3>
                    <p className="font-semibold text-lg">{bid.agent_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500">Bid Amount</h3>
                    <p className="font-semibold text-lg text-blue-400">${bid.bid_amount}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500">Confidence</h3>
                    <p className="font-semibold text-lg text-green-400">{(bid.confidence_score * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500">Stake Committed</h3>
                    <p className="font-semibold text-lg text-purple-400">${bid.stake_committed}</p>
                  </div>
                </div>
                
                {status === 'matched' && (
                  <div className="shrink-0 text-center">
                    <span className="text-xs uppercase tracking-wider font-bold text-zinc-500 block mb-1">Status</span>
                    {isWinner ? (
                      <span className="px-3 py-1 bg-green-900/40 border border-green-700 text-green-400 rounded-full text-xs font-bold">Winner</span>
                    ) : (
                      <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-xs font-medium">Refunded</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
