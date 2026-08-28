import Link from 'next/link';
import { notFound } from 'next/navigation';
import TaskBids from '@/components/TaskBids';
import TaskVerification from '@/components/TaskVerification';
import EscrowStatus from '@/components/EscrowStatus';

async function getTaskMatches(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${apiUrl}/tasks/${id}/matches`, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch matches');
    }
    return res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function getTaskSubmission(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${apiUrl}/tasks/${id}/submission`, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch submission');
    }
    return res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function getTask(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  try {
    // Actually we don't have a GET /tasks/{id} endpoint yet. 
    // We can fetch all tasks and filter, or just add the endpoint to backend.
    // Let's assume we fetch all and find the one.
    const res = await fetch(`${apiUrl}/tasks`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    const tasks = await res.json();
    return tasks.find((t: any) => t.id === id) || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = await getTask(params.id);
  
  if (!task) {
    notFound();
  }

  let submission = null;
  if (task.status === 'verifying' || task.status === 'completed') {
    submission = await getTaskSubmission(task.id);
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Task Details */}
        <div className="lg:col-span-1 space-y-6">
          <Link href="/tasks" className="text-sm text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-2">
            ← Back to Tasks
          </Link>
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold">{task.title}</h1>
              <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800/50 rounded-full text-xs font-medium uppercase tracking-wider">
                {task.status}
              </span>
            </div>
            
            <p className="text-zinc-300 mb-6 whitespace-pre-wrap">{task.description}</p>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Required Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(task.required_capabilities || {}).map((cap) => (
                  <span key={cap} className="px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-lg text-sm">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-6 border-t border-zinc-800 pt-4">
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Verification Rubric</h3>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap">{task.verification_rubric}</p>
            </div>
            
            <div className="mb-6 border-t border-zinc-800 pt-4">
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Expected Output Schema</h3>
              <pre className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg text-sm text-zinc-300 overflow-x-auto">
                {JSON.stringify(task.verification_schema, null, 2)}
              </pre>
            </div>
            
            {(task.bidding_deadline || task.submission_deadline) && (
              <div className="mb-6 border-t border-zinc-800 pt-4 grid grid-cols-2 gap-4">
                {task.bidding_deadline && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Bidding Deadline</h3>
                    <p className="text-sm text-zinc-300">{new Date(task.bidding_deadline).toLocaleString()}</p>
                  </div>
                )}
                {task.submission_deadline && (
                  <div>
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Submission Deadline</h3>
                    <p className="text-sm text-zinc-300">{new Date(task.submission_deadline).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="border-t border-zinc-800 pt-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-zinc-500">Reward</p>
                <p className="text-xl font-bold text-blue-400">${task.reward_amount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-500">Posted By</p>
                <p className="text-sm text-zinc-300">{task.posted_by}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-2 space-y-8">
          <EscrowStatus task={task} submission={submission} />
          
          <TaskBids taskId={task.id} initialStatus={task.status} />
          
          {submission && (
            <div className="bg-zinc-900 rounded-xl border border-blue-900/50 p-6 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">✓</span>
                Task Submission
              </h2>
              
              <div className="mb-6 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Commitment Hash (SHA-256)</h3>
                <code className="text-sm text-green-400 break-all">{submission.output_hash}</code>
                <p className="text-xs text-zinc-500 mt-2">Hash is recorded permanently on-chain before verification to prevent tampering.</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Generated Artifact</h3>
                <pre className="bg-zinc-950 border border-zinc-800 p-5 rounded-lg text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                  {submission.output_content}
                </pre>
              </div>
            </div>
          )}
          
          {(task.status === 'verifying' || task.status === 'completed' || task.status === 'disputed') && submission && (
            <TaskVerification task={task} submission={submission} />
          )}
        </div>

      </div>
    </main>
  );
}
