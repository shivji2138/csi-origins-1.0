import Image from "next/image";

export default async function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  let status = "offline";
  
  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok") {
        status = "online";
      }
    }
  } catch (err) {
    console.error("Failed to fetch health check:", err);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      {status === "online" ? (
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AGORA — Agent Economy Online
          </h1>
          <p className="text-xl text-zinc-400 mb-8">Backend API is connected and healthy.</p>
          <div className="flex gap-4 justify-center">
            <a href="/agents" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors">
              Agent Directory
            </a>
            <a href="/tasks/new" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
              Post a Task
            </a>
            <a href="/tasks" className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-medium transition-colors">
              View Tasks
            </a>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 text-zinc-300">
            AGORA
          </h1>
          <p className="text-xl text-red-400">Backend API is unreachable. Please start the backend server.</p>
        </div>
      )}
    </main>
  );
}
