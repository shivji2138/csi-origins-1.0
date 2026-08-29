'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TaskBids from '@/components/TaskBids';
import TaskVerification from '@/components/TaskVerification';
import EscrowStatus from '@/components/EscrowStatus';

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const taskId = params.id;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const [task, setTask] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchTaskData = useCallback(async () => {
    try {
      // 1. Fetch Task
      const resTask = await fetch(`${apiUrl}/tasks/${taskId}`, { cache: 'no-store' });
      if (!resTask.ok) {
        // Fallback fetch all
        const resAll = await fetch(`${apiUrl}/tasks`, { cache: 'no-store' });
        if (resAll.ok) {
          const allTasks = await resAll.json();
          const found = allTasks.find((t: any) => t.id === taskId);
          if (found) setTask(found);
        }
      } else {
        const data = await resTask.json();
        setTask(data);
      }

      // 2. Fetch Submission
      const resSub = await fetch(`${apiUrl}/tasks/${taskId}/submission`, { cache: 'no-store' });
      if (resSub.ok) {
        const subData = await resSub.json();
        setSubmission(subData);
      } else {
        setSubmission(null);
      }
    } catch (err) {
      console.error("Error fetching live task data:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, taskId]);

  useEffect(() => {
    fetchTaskData();
    // Poll every 2 seconds until task reaches a terminal state (completed, disputed, failed, expired)
    const interval = setInterval(() => {
      fetchTaskData();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchTaskData]);

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !task) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400 font-mono text-sm">Loading task telemetry...</p>
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Task Not Found</h2>
          <p className="text-zinc-400 mb-6">The requested task could not be located on the AGORA protocol.</p>
          <Link href="/tasks" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold">
            ← Back to Marketplace
          </Link>
        </div>
      </main>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-600/80 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
      case 'verifying':
        return 'bg-blue-950/80 text-blue-400 border-blue-600/80 animate-pulse';
      case 'matched':
        return 'bg-amber-950/80 text-amber-400 border-amber-600/80';
      case 'disputed':
        return 'bg-red-950/80 text-red-400 border-red-600/80';
      case 'failed':
      case 'expired':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-purple-950/80 text-purple-400 border-purple-600/80';
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 lg:p-24 bg-zinc-950 text-white">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Task Details */}
        <div className="lg:col-span-1 space-y-6">
          <Link href="/tasks" className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2">
            ← Back to Tasks
          </Link>
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
              <span className={`px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${getStatusBadge(task.status)}`}>
                {task.status}
              </span>
            </div>
            
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
            
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Required Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(task.required_capabilities || {}).map((cap) => (
                  <span key={cap} className="px-2.5 py-1 bg-zinc-800 border border-zinc-700/50 text-zinc-200 rounded-md text-xs font-medium">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Verification Rubric</h3>
              <p className="text-zinc-300 text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 whitespace-pre-wrap leading-relaxed">
                {task.verification_rubric}
              </p>
            </div>
            
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Expected JSON Schema</h3>
              <pre className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-lg text-xs text-purple-300 overflow-x-auto font-mono">
                {JSON.stringify(task.verification_schema, null, 2)}
              </pre>
            </div>
            
            {(task.bidding_deadline || task.submission_deadline) && (
              <div className="border-t border-zinc-800 pt-4 grid grid-cols-2 gap-4">
                {task.bidding_deadline && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Bidding Deadline</h3>
                    <p className="text-xs text-zinc-300">{new Date(task.bidding_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                {task.submission_deadline && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Submission Deadline</h3>
                    <p className="text-xs text-zinc-300">{new Date(task.submission_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="border-t border-zinc-800 pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Escrow Reward</p>
                <p className="text-2xl font-black text-emerald-400">${task.reward_amount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Requester</p>
                <p className="text-xs font-mono text-zinc-300">{task.posted_by}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution, Bids & Verifications */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Escrow Protocol State */}
          <EscrowStatus task={task} submission={submission} />
          
          {/* Deliverable Artifact Section */}
          {submission && (
            <div className="bg-zinc-900 rounded-xl border border-emerald-500/40 p-6 shadow-[0_0_25px_rgba(16,185,129,0.1)] space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3 text-emerald-400">
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">✓</span>
                  Autonomous Worker Deliverable
                </h2>
                <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-bold rounded-full">
                  SUBMITTED
                </span>
              </div>
              
              <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Commitment Deliverable Hash (SHA-256)</h3>
                  <code className="text-xs font-mono text-emerald-400 break-all">{submission.output_hash}</code>
                </div>
                <button
                  onClick={() => handleCopyHash(submission.output_hash)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg shrink-0 transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy Hash'}
                </button>
              </div>
              
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Generated Output Content</h3>
                <pre className="bg-zinc-950 border border-zinc-800 p-5 rounded-lg text-sm text-zinc-200 overflow-x-auto whitespace-pre-wrap font-mono max-h-[450px] leading-relaxed">
                  {submission.output_content}
                </pre>
              </div>
            </div>
          )}

          {/* Verification Pipeline */}
          {(task.status === 'verifying' || task.status === 'completed' || task.status === 'disputed' || task.status === 'failed' || submission) && (
            <TaskVerification task={task} submission={submission} />
          )}

          {/* Marketplace Bids */}
          <TaskBids taskId={task.id} initialStatus={task.status} />

        </div>

      </div>
    </main>
  );
}
