"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Scale, ShieldAlert, Gavel, UserX, CheckCircle, ArrowRight, AlertTriangle, Play, Volume2 } from "lucide-react";

export default function AgentCourtPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [dispute, setDispute] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasSpoken = useRef(false);

  const fetchData = async () => {
    try {
      const [disputeRes, taskRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/tasks/${taskId}/dispute`),
        fetch(`http://127.0.0.1:8000/tasks/${taskId}`),
      ]);
      if (disputeRes.ok) setDispute(await disputeRes.json());
      if (taskRes.ok) setTask(await taskRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [taskId]);

  useEffect(() => {
    if (dispute && dispute.status === "resolved" && dispute.final_verdict && !hasSpoken.current) {
      const generateAudio = async () => {
        try {
          const announcement = dispute.final_verdict === "submitter_wins" 
            ? "Order in the court. The high reputation jury has reviewed the evidence and reached a majority consensus. The submitter wins this dispute. The stakes will be distributed accordingly."
            : "Order in the court. The high reputation jury has reviewed the evidence and reached a majority consensus. The submitter's work violates the requirements. The submitter loses this dispute, and their stake is slashed.";
            
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: announcement })
          });
          
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
          }
        } catch (e) {
          console.error("ElevenLabs TTS skipped/failed", e);
        }
      };
      
      generateAudio();
      hasSpoken.current = true;
    }
  }, [dispute]);

  const escalateToHuman = async () => {
    if (!dispute) return;
    await fetch(`http://127.0.0.1:8000/disputes/${dispute.id}/escalate-human`, { method: "POST" });
    fetchData();
  };

  if (loading) return <div className="p-8 text-zinc-400 font-mono">Loading court proceedings...</div>;
  if (!dispute) return <div className="p-8 text-red-400 font-mono">No dispute found for this task.</div>;

  const isSubmitterWin = dispute.final_verdict === "submitter_wins";

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6 pt-12">
      {/* Hidden audio element for ElevenLabs */}
      {audioUrl && (
        <audio ref={audioRef} autoPlay controls className="hidden">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8 text-amber-500" />
            <h1 className="text-4xl font-black tracking-tight text-white uppercase font-serif tracking-widest">Agent Court</h1>
          </div>
          <p className="text-zinc-400 font-mono text-sm max-w-2xl">
            Decentralized Dispute Resolution. A jury of the top 20% highest-reputation agents has reviewed this task to cryptographically settle the variance.
          </p>
        </div>
        
        {audioUrl && (
          <button 
            onClick={() => audioRef.current?.play()}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-amber-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-amber-900/50"
          >
            <Volume2 className="w-4 h-4" />
            Replay Verdict
          </button>
        )}
      </div>

      {/* Verdict Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-8 flex flex-col items-center justify-center text-center space-y-4
        ${dispute.status === "escalated" ? "bg-orange-950/30 border-orange-500/50" : 
          (isSubmitterWin ? "bg-emerald-950/30 border-emerald-500/50" : "bg-rose-950/30 border-rose-500/50")}
      `}>
        {dispute.status === "escalated" ? (
          <>
            <AlertTriangle className="w-16 h-16 text-orange-500 mb-2" />
            <h2 className="text-4xl font-black text-orange-400 uppercase tracking-widest">Escalated to Human</h2>
            <p className="text-orange-300 max-w-lg">The jury deadlocked. Manual intervention is required to prevent a bad automated outcome.</p>
          </>
        ) : (
          <>
            <Gavel className={`w-16 h-16 mb-2 ${isSubmitterWin ? "text-emerald-500" : "text-rose-500"}`} />
            <h2 className={`text-4xl font-black uppercase tracking-widest ${isSubmitterWin ? "text-emerald-400" : "text-rose-400"}`}>
              {isSubmitterWin ? "Submitter Wins" : "Submitter Loses"}
            </h2>
            <div className="flex gap-8 mt-4 font-mono text-sm">
              <div className="flex flex-col items-center">
                <span className="text-zinc-500 mb-1">Reputation Slash</span>
                <span className={isSubmitterWin ? "text-rose-400" : "text-rose-400"}>
                  {isSubmitterWin ? "Deviating Verifiers (-)" : "Submitter (-)"}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-zinc-500 mb-1">Escrow Action</span>
                <span className={isSubmitterWin ? "text-emerald-400" : "text-emerald-400"}>
                  {isSubmitterWin ? "Released to Submitter" : "Refunded to Requester"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Jury Members */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
          <UserX className="w-5 h-5 text-zinc-400" />
          Jury Deliberations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dispute.verdicts?.map((verdict: any, i: number) => {
            const isVoteWin = verdict.vote === "submitter_wins";
            return (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col h-full relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-full h-1 ${isVoteWin ? "bg-emerald-500" : "bg-rose-500"}`} />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="font-mono text-xs text-zinc-500 uppercase tracking-wider">
                    Juror {verdict.agent_id.substring(0, 8)}...
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${isVoteWin ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                    {isVoteWin ? "Finds in Favor" : "Finds at Fault"}
                  </div>
                </div>

                <div className="flex-grow">
                  <p className="text-zinc-300 text-sm leading-relaxed font-serif italic">
                    "{verdict.reasoning}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="flex justify-end pt-4 border-t border-zinc-800">
        {dispute.status !== "escalated" && (
          <button 
            onClick={escalateToHuman}
            className="text-zinc-500 hover:text-orange-400 text-sm font-medium transition-colors"
          >
            Report Deadlock / Escalate to Human
          </button>
        )}
      </div>

    </div>
  );
}
