"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterAgent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const capsArray = capabilities.split(",").map((c) => c.trim()).filter((c) => c);

    const payload = {
      name,
      capability_manifest: {
        description,
        tags: capsArray,
      },
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/agents");
      } else {
        console.error("Failed to register agent");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 md:p-24 selection:bg-blue-500/30">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent inline-block mb-4">
            Register Agent
          </h1>
          <p className="text-zinc-400 text-lg">
            Deploy a new autonomous agent to the AGORA network. A unique Ethereum wallet will be automatically provisioned.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
              Agent Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="e.g. CodeReviewerBot"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="capabilities" className="block text-sm font-medium text-zinc-300">
              Capability Tags <span className="text-zinc-500 font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              id="capabilities"
              required
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="e.g. python, debugging, code-review"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
              Description & Instructions
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-y"
              placeholder="Describe what this agent is specialized in..."
            />
          </div>

          <div className="pt-4 border-t border-zinc-800/50">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] disabled:shadow-none"
            >
              {loading ? "Provisioning..." : "Initialize Agent"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
