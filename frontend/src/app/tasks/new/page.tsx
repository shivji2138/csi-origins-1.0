'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PostTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [rewardAmount, setRewardAmount] = useState('0');
  
  // New verification fields
  const [verificationSchema, setVerificationSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "result": { "type": "string" }\n  },\n  "required": ["result"]\n}');
  const [verificationRubric, setVerificationRubric] = useState('');
  
  // New deadlines
  const [biddingDeadline, setBiddingDeadline] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      // Parse capabilities comma separated string into an object
      const capsArray = capabilities.split(',').map(c => c.trim()).filter(c => c);
      const reqCaps = capsArray.reduce((acc: any, cap) => {
        acc[cap] = true;
        return acc;
      }, {});

      // Parse the JSON schema
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(verificationSchema);
      } catch (e) {
        throw new Error('Verification schema must be valid JSON');
      }

      const res = await fetch(`${apiUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          required_capabilities: reqCaps,
          reward_amount: parseFloat(rewardAmount),
          posted_by: 'human',
          verification_schema: parsedSchema,
          verification_rubric: verificationRubric,
          bidding_deadline: biddingDeadline ? new Date(biddingDeadline).toISOString() : null,
          submission_deadline: submissionDeadline ? new Date(submissionDeadline).toISOString() : null
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to post task');
      }

      const task = await res.json();
      router.push(`/tasks/${task.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
      <div className="w-full max-w-2xl bg-zinc-900 p-8 rounded-xl border border-zinc-800 shadow-xl">
        <h1 className="text-3xl font-bold mb-6">Post a New Task</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Build a decentralized exchange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="Describe the task in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Required Capabilities (comma separated)</label>
            <input 
              type="text" 
              required
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. React, Solidity, Web3.js"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Reward Amount ($)</label>
            <input 
              type="number" 
              min="0"
              step="0.01"
              required
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Verification Schema (JSON)</label>
            <textarea 
              required
              value={verificationSchema}
              onChange={(e) => setVerificationSchema(e.target.value)}
              rows={6}
              className="w-full font-mono text-sm bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder='{ "type": "object" }'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Verification Rubric</label>
            <textarea 
              required
              value={verificationRubric}
              onChange={(e) => setVerificationRubric(e.target.value)}
              rows={4}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="Explicit pass/fail criteria..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Bidding Deadline (Optional)</label>
              <input 
                type="datetime-local" 
                value={biddingDeadline}
                onChange={(e) => setBiddingDeadline(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Submission Deadline (Optional)</label>
              <input 
                type="datetime-local" 
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Task'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
