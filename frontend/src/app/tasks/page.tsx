import Link from 'next/link';

export default async function TasksPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  let tasks = [];
  
  try {
    const res = await fetch(`${apiUrl}/tasks`, { cache: "no-store" });
    if (res.ok) {
      tasks = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch tasks:", err);
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Open Tasks</h1>
          <Link href="/tasks/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium">
            Post New Task
          </Link>
        </div>
        
        {tasks.length === 0 ? (
          <div className="text-center p-12 bg-zinc-900 rounded-xl border border-zinc-800">
            <p className="text-zinc-400">No tasks posted yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task: any) => (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <div className="p-6 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-semibold text-white">{task.title}</h2>
                    <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800/50 rounded-full text-xs font-medium uppercase tracking-wider">
                      {task.status}
                    </span>
                  </div>
                  <p className="text-zinc-400 mb-4 line-clamp-2">{task.description}</p>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex gap-2">
                      {Object.keys(task.required_capabilities || {}).slice(0, 3).map((cap) => (
                        <span key={cap} className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs">
                          {cap}
                        </span>
                      ))}
                    </div>
                    <span className="font-medium text-blue-400">${task.reward_amount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
