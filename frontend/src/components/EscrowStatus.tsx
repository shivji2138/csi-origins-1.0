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
  else if (submission && (submission.submit_tx_hash || submission.output_hash)) state = "Submitted";
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
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-[11px] text-zinc-500 uppercase font-semibold">{label} Tx:</span>
      <a 
        href={getBasescanLink(hash)} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline truncate max-w-[280px]"
        title={hash}
      >
        {hash}
      </a>
      <span className="text-emerald-400 text-xs font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">✓ MINED</span>
    </div>
  );

  const isHashSubmitted = Boolean(submission?.submit_tx_hash || submission?.output_hash);
  const isSettled = Boolean(task.settlement_tx_hash || task.status === 'completed');

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">⛓️</span>
          Programmable Escrow Settlement
        </h2>
        <span className="text-xs font-mono text-zinc-500 uppercase">Base Sepolia Testnet</span>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-800"></div>
        
        <div className="space-y-6">
          
          {/* Step 1: Funded */}
          <div className="relative pl-10">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${task.fund_tx_hash ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
              ✓
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${task.fund_tx_hash ? 'text-zinc-100' : 'text-zinc-500'}`}>
              1. Funded (Locked)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Requester deposited ${task.reward_amount} reward into Base Sepolia Escrow Smart Contract.</p>
            {task.fund_tx_hash && renderTxLink(task.fund_tx_hash, "Fund")}
          </div>

          {/* Step 2: Submitted */}
          <div className="relative pl-10">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${isHashSubmitted ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
              {isHashSubmitted ? '✓' : '2'}
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isHashSubmitted ? 'text-zinc-100' : 'text-zinc-500'}`}>
              2. Deliverable Hash Registered
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isHashSubmitted ? 'Autonomous worker committed cryptographically verifiable deliverable SHA-256 on-chain.' : 'Awaiting worker execution and cryptographic hash commitment.'}
            </p>
            {submission?.submit_tx_hash && renderTxLink(submission.submit_tx_hash, "Submit")}
          </div>

          {/* Step 3: Terminal State */}
          <div className="relative pl-10">
            <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${isSettled ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 border-zinc-700 text-zinc-600'}`}>
              {isSettled ? '✓' : '3'}
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isSettled ? 'text-emerald-400 font-black' : 'text-zinc-500'}`}>
              3. Terminal State: {task.status === 'completed' ? 'Released to Worker (Verified)' : task.status === 'disputed' ? 'Disputed / Refunded' : task.status === 'expired' ? 'Expired Refund' : 'Awaiting Verification Verdict'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {task.status === 'completed' ? 'Jury consensus reached. Smart contract automatically transferred escrow reward to worker wallet.' : 'Final on-chain settlement resolving the escrow.'}
            </p>
            {task.settlement_tx_hash && renderTxLink(task.settlement_tx_hash, "Settle")}
            
            {/* Griefing Protection Button: Only if legitimately expired with past deadline */}
            {task.status === "matched" && task.submission_deadline && (new Date() > new Date(task.submission_deadline)) && !submission && (
              <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                <p className="text-xs text-zinc-300 mb-2">Worker failed to submit in time. Claim refund?</p>
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
