'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EscrowStatus({ task, submission }: { task: any, submission?: any }) {
  const [claiming, setClaiming] = useState(false);
  const router = useRouter();

  // Determine current escrow state based on task and submission
  let state = "Open";
  if (task.status === "expired") state = "Expired";
  else if (task.status === "disputed" && task.settlement_tx_hash) state = "Refunded";
  else if (task.status === "completed" && task.settlement_tx_hash) state = "Completed";
  else if (submission && submission.submit_tx_hash) state = "Submitted";
  else if (task.fund_tx_hash) state = "Funded";

  const handleClaimExpired = async () => {
    setClaiming(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/tasks/${task.id}/claim-expired`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const errData = await res.json();
        alert(`Claim failed: ${errData.detail || errData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error claiming expired refund");
    } finally {
      setClaiming(false);
    }
  };

  const getBasescanLink = (hash: string) => `https://sepolia.basescan.org/tx/${hash}`;

  const renderTxLink = (hash: string, label: string) => (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-zinc-500 uppercase">{label} Tx:</span>
      <a 
        href={getBasescanLink(hash)} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm font-mono text-blue-400 hover:text-blue-300 underline truncate max-w-[200px]"
        title={hash}
      >
        {hash}
      </a>
      <span className="text-green-400 text-xs font-bold">✓ MINED</span>
    </div>
  );

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl mb-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
        <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">⛓️</span>
        Programmable Escrow Settlement
      </h2>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-800"></div>
        
        <div className="space-y-6">
          
          {/* Step 1: Funded */}
          <div className="relative pl-10">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${task.fund_tx_hash ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
              1
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${task.fund_tx_hash ? 'text-zinc-200' : 'text-zinc-600'}`}>Funded (Locked)</h3>
            <p className="text-xs text-zinc-500 mt-1">Requester locked funds into Base Sepolia smart contract.</p>
            {task.fund_tx_hash && renderTxLink(task.fund_tx_hash, "Fund")}
          </div>

          {/* Step 2: Submitted */}
          <div className="relative pl-10">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${submission?.submit_tx_hash ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
              2
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${submission?.submit_tx_hash ? 'text-zinc-200' : 'text-zinc-600'}`}>Hash Submitted</h3>
            <p className="text-xs text-zinc-500 mt-1">Worker registered deliverable hash on-chain.</p>
            {submission?.submit_tx_hash && renderTxLink(submission.submit_tx_hash, "Submit")}
          </div>

          {/* Step 3: Terminal State */}
          <div className="relative pl-10">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${task.settlement_tx_hash ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
              3
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${task.settlement_tx_hash ? 'text-zinc-200' : 'text-zinc-600'}`}>
              Terminal State: {state === 'Completed' ? 'Released to Worker' : state === 'Refunded' ? 'Refunded (Dispute)' : state === 'Expired' ? 'Refunded (Expired)' : 'Pending'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Final on-chain settlement resolving the escrow.</p>
            {task.settlement_tx_hash && renderTxLink(task.settlement_tx_hash, "Settle")}
            
            {/* Griefing Protection Button */}
            {task.status === "matched" && new Date() > new Date(task.submission_deadline) && !submission && (
              <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                <p className="text-sm text-zinc-300 mb-2">Worker failed to submit in time. Claim refund?</p>
                <button
                  onClick={handleClaimExpired}
                  disabled={claiming}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim Expired Refund'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
