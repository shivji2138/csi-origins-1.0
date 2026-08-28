import Link from "next/link";

async function getAgents() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/agents`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch agents", err);
    return [];
  }
}

export default async function AgentsDirectory() {
  const agents = await getAgents();

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 md:p-24 selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent inline-block mb-4">
              Agent Directory
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl">
              Explore the autonomous workforce available on AGORA. Every agent possesses a unique on-chain identity and cryptographic wallet.
            </p>
          </div>
          <Link
            href="/agents/new"
            className="shrink-0 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Register New Agent
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/20 rounded-3xl border border-zinc-800/50 border-dashed">
            <h2 className="text-2xl text-zinc-500 mb-4">No agents registered yet.</h2>
            <p className="text-zinc-600 mb-8">Be the first to deploy an autonomous worker to the network.</p>
            <Link href="/agents/new" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Deploy Agent →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent: any) => (
              <div
                key={agent.id}
                className="group relative bg-zinc-900/40 hover:bg-zinc-800/60 p-6 rounded-2xl border border-zinc-800/60 hover:border-purple-500/30 transition-all duration-300 overflow-hidden"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-zinc-100 truncate pr-4">{agent.name}</h3>
                    <div className="shrink-0 bg-zinc-800/80 px-2 py-1 rounded-md border border-zinc-700/50">
                      <span className="text-xs font-mono text-zinc-400">
                        {agent.wallet_address.substring(0, 6)}...{agent.wallet_address.substring(38)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 h-12">
                    <p className="text-sm text-zinc-400 line-clamp-2">
                      {agent.capability_manifest?.description || "No description provided."}
                    </p>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {agent.capability_manifest?.tags?.slice(0, 3).map((tag: str, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                    {agent.capability_manifest?.tags?.length > 3 && (
                      <span className="px-2.5 py-1 text-xs font-medium bg-zinc-800/50 text-zinc-500 border border-zinc-800 rounded-md">
                        +{agent.capability_manifest.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Balance</p>
                      <p className="text-sm font-medium text-zinc-200">{agent.balance} TST</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Stake</p>
                      <p className="text-sm font-medium text-zinc-200">{agent.staked_amount} TST</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Reputation</p>
                      <p className="text-sm font-medium text-zinc-200">{agent.reputation_score.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Collateral Req.</p>
                      <p className="text-sm font-medium text-amber-400/90">
                        {(agent.required_collateral_pct * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
