'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function TaskVerification({ task, submission }: { task: any, submission: any }) {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const fetchVerifications = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/tasks/${task.id}/verifications`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setVerifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch verifications", err);
    }
  }, [apiUrl, task.id]);

  useEffect(() => {
    fetchVerifications();
    const interval = setInterval(fetchVerifications, 3000);
    return () => clearInterval(interval);
  }, [fetchVerifications]);

  const handleRunVerification = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${apiUrl}/tasks/${task.id}/verify`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchVerifications();
        router.refresh();
      } else {
        const errData = await res.json();
        alert(`Verification notice: ${errData.detail || errData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error running verification");
    } finally {
      setRunning(false);
    }
  };

  const tier1 = verifications.find(v => v.tier === 'deterministic');
  const jury = verifications.filter(v => v.tier === 'jury');
  const passport = task.verification_passport;

  if (task.status === 'open' && !submission) return null;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">🛡️</span>
          Multi-Tier Verification Pipeline
        </h2>
        {(task.status === 'verifying' || (!tier1 && submission)) && (
          <button 
            onClick={handleRunVerification} 
            disabled={running}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {running ? 'Evaluating...' : 'Trigger Verification'}
          </button>
        )}
      </div>

      {tier1 && (
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/70">
          <div className="flex justify-between items-center mb-3 border-b border-zinc-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Tier 1: Deterministic Scan & Schema Check</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tier1.score === 1.0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-red-950 text-red-400 border border-red-700'}`}>
              {tier1.score === 1.0 ? 'PASSED (1.00)' : 'FAILED (0.00)'}
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{tier1.rationale}</p>
          {tier1.injection_flag === 'true' && (
            <div className="mt-3 p-3 bg-red-950/60 border border-red-800 rounded-lg flex items-start gap-2.5">
              <span className="text-red-400 text-sm">⚠️</span>
              <div>
                <h4 className="text-xs font-bold text-red-300">Adversarial Injection Detected</h4>
                <p className="text-[11px] text-red-400 mt-0.5">
                  Extraneous system instructions were found in submission. The jury isolated the prompt and disregarded malicious overrides.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {jury.length > 0 && (
        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/70 space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Tier 2: Heterogeneous LLM Jury</h3>
            <span className="text-[11px] font-mono text-zinc-400">{jury.length} Models Consensus</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {jury.map((j, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-mono text-purple-400 font-semibold uppercase">{j.model_family}</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{(j.score * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">{j.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {passport && (
        <div className="border border-purple-900/60 rounded-lg p-4 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.08)] space-y-3">
          <div className="flex justify-between items-center border-b border-purple-900/40 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">Tier 3: Cryptographic Attestation Passport</h3>
            <span className="text-[11px] font-mono text-purple-400 font-bold uppercase">{passport.final_verdict}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Consensus Verdict</p>
              <p className={`text-base font-black uppercase ${passport.final_verdict === 'completed' ? 'text-emerald-400' : 'text-red-400'}`}>
                {passport.final_verdict}
              </p>
            </div>
            {passport.tier2_median_score !== undefined && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Jury Median Score</p>
                <p className="text-base font-black text-blue-400 font-mono">{(passport.tier2_median_score * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
          
          <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase font-semibold mb-1">On-Chain Attestation Hash</p>
            <code className="text-xs font-mono text-zinc-300 break-all">{passport.submission_output_hash}</code>
          </div>
        </div>
      )}

    </div>
  );
}
