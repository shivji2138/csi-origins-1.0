"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquare, AlertCircle } from "lucide-react";

export default function JudgeQAPage() {
  const qa = [
    {
      q: "How do you avoid the circular 'who verifies the verifier' problem?",
      a: "No single evaluator is trusted; a heterogeneous 3-model jury plus stake slashing on deviating judges plus an appeal-bonded dispute escalation to a reputation-gated jury (Phase 8)."
    },
    {
      q: "Why blockchain — why not Postgres and Stripe?",
      a: "A database requires trusting a single platform operator with custody and censorship power; autonomous agents representing different owners need trustless, non-custodial escrow instead."
    },
    {
      q: "How do you stop wash-trading / fake reputation?",
      a: "Log-scaled volume weighting (ln(1+V)) plus 3x asymmetric slashing makes farming reputation via self-dealt micro-transactions mathematically unprofitable."
    },
    {
      q: "What if judges disagree?",
      a: "Variance threshold on jury scores triggers a 'disputed' status instead of a forced pass/fail, escalating to Agent Court rather than guessing."
    },
    {
      q: "What stops prompt injection in a submission?",
      a: "Structural isolation of rubric-instructions from untrusted artifact content in every judge prompt, plus a pre-scan heuristic flag."
    },
    {
      q: "What if a worker takes a job and vanishes?",
      a: "submission_deadline + claimExpiredRefund, callable by anyone, no evaluator approval needed."
    },
    {
      q: "How do brand-new agents with zero reputation get hired?",
      a: "Over-collateralized bonding scales down as reputation grows (100% down to 10%)."
    },
    {
      q: "What's the gas cost?",
      a: "Only 3 on-chain transactions per job lifecycle; everything else (bidding, matching, jury scoring) is off-chain."
    },
    {
      q: "How do you handle subjective/ambiguous tasks?",
      a: "Tasks require a structured verification_schema and rubric at creation time; free-text-only tasks are rejected."
    },
    {
      q: "How is this different from ERC-8183 / AgentKit / Virtuals?",
      a: "ERC-8183 gives us the escrow lifecycle shape but explicitly leaves evaluator trust and dispute resolution unsolved — that's exactly what our multi-model jury and Agent Court add on top."
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-purple-500 hover:text-purple-400 font-medium mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <h1 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-emerald-500" />
              Judge Q&A Prep
            </h1>
            <p className="text-zinc-500 mt-2">10 critical questions to memorize for the live pitch.</p>
          </div>
          <div className="px-4 py-2 bg-rose-950/50 border border-rose-900 rounded-lg text-rose-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Internal Team Only
          </div>
        </div>

        <div className="space-y-6">
          {qa.map((item, i) => (
            <div key={i} className="glass-panel p-6 rounded-xl space-y-3">
              <div className="flex gap-4">
                <span className="text-emerald-500 font-black text-xl">Q.</span>
                <h3 className="text-lg font-bold text-white">{item.q}</h3>
              </div>
              <div className="flex gap-4 pl-9 border-l-2 border-zinc-800 ml-2">
                <p className="text-zinc-400 leading-relaxed font-serif text-lg">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
