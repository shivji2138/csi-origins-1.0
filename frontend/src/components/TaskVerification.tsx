'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TaskVerification({ task, submission }: { task: any, submission: any }) {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const router = useRouter();

  const fetchVerifications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/tasks/${task.id}/verifications`);
      if (res.ok) {
        const data = await res.json();
        setVerifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch verifications", err);
    }
  };

  useEffect(() => {
    if (task.status === 'completed' || task.status === 'disputed' || task.status === 'verifying') {
      fetchVerifications();
    }
  }, [task.id, task.status]);

  const handleRunVerification = async () => {
    setRunning(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/tasks/${task.id}/verify`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchVerifications();
        router.refresh();
      } else {
        const errData = await res.json();
        alert(`Verification failed: ${errData.detail || errData.message}`);
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

  if (task.status === 'open' || task.status === 'matched') return null;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">🛡️</span>
          Verification Pipeline
        </h2>
        {task.status === 'verifying' && !tier1 && (
          <button 
            onClick={handleRunVerification} 
            disabled={running}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {running ? 'Running Pipeline...' : 'Run Verification Pipeline'}
          </button>
        )}
      </div>

      {tier1 && (
        <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-950/50">
          <h3 className="text-lg font-semibold mb-4 text-zinc-300 border-b border-zinc-800 pb-2">Tier 1: Deterministic Check</h3>
          <div className="flex items-center gap-4 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${tier1.score === 1.0 ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-red-900/40 text-red-400 border border-red-700'}`}>
              {tier1.score === 1.0 ? 'PASS' : 'FAIL'}
            </span>
            <p className="text-sm text-zinc-400">{tier1.rationale}</p>
          </div>
          {tier1.injection_flag === 'true' && (
            <div className="mt-2 p-3 bg-red-950/50 border border-red-900 rounded-lg flex items-start gap-3">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-red-400">Injection Attempt Detected</h4>
                <p className="text-xs text-red-300 mt-1">
                  Adversarial prompt-injection payload suspected in the submission. The content was isolated and rubric enforcement proceeded.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {jury.length > 0 && (
        <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-950/50">
          <h3 className="text-lg font-semibold mb-4 text-zinc-300 border-b border-zinc-800 pb-2">Tier 2: Heterogeneous LLM Jury</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {jury.map((j, idx) => (
              <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase">{j.model_family}</span>
                    <span className="text-lg font-bold text-blue-400">{j.score?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-4">{j.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {passport && (
        <div className="border border-purple-900/50 rounded-lg p-5 bg-purple-950/10 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
          <h3 className="text-lg font-semibold mb-4 text-purple-300 border-b border-purple-900/30 pb-2">Tier 3: Attestation Passport</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Consensus Verdict</p>
              <p className={`text-lg font-bold ${passport.final_verdict === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                {passport.final_verdict.toUpperCase()}
              </p>
            </div>
            {passport.tier2_median_score !== undefined && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Jury Median Score</p>
                <p className="text-lg font-bold text-blue-400">{passport.tier2_median_score.toFixed(2)}</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-zinc-950 rounded border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Immutable Hash Record</p>
            <code className="text-xs text-zinc-400 break-all">{passport.submission_output_hash}</code>
          </div>
        </div>
      )}

    </div>
  );
}
