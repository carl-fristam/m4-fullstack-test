import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:8000/tasks";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(false);

  /* ---------- API STATUS ---------- */
  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("http://localhost:8000/");
        setOnline(res.ok);
      } catch {
        setOnline(false);
      }
    };
    ping();
    const i = setInterval(ping, 5000);
    return () => clearInterval(i);
  }, []);

  /* ---------- DATA ---------- */
  const loadTasks = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const createTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, priority: 1 }),
    });
    setTitle("");
    setDesc("");
    setLoading(false);
    loadTasks();
  };

  const removeTask = async (id) => {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    loadTasks();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased flex flex-col items-center">
      {/* FORCE CENTERING CSS */}
      <style>{`
      body { margin: 0; padding: 0; background: white; }
      #root { width: 100%; display: flex; justify-content: center; }
      main, header, nav > div { margin-left: auto; margin-right: auto; }
    `}</style>

      {/* ---------- TOP MENU ---------- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-center">
        <div className="w-full max-w-6xl px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="font-black tracking-tighter text-2xl text-slate-900">AgentOS</span>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest border ${online ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"}`}>
            <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {online ? "System Operational" : "System Offline"}
          </div>
        </div>
      </nav>

      {/* ---------- HERO SECTION (CENTERED CONTENT) ---------- */}
      <header className="w-full pt-48 pb-20 px-6 bg-gradient-to-b from-indigo-50/50 to-white flex flex-col items-center text-center">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
            Work faster with <span className="text-indigo-600">Autonomous</span> Tasks.
          </h1>
          <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
            The next generation of task management. Connect your agents,
            automate your workflow, and monitor everything in one clean place.
          </p>
        </div>
      </header>

      {/* ---------- MAIN CONTROL PANEL (CENTERED GRID) ---------- */}
      <main className="w-full max-w-6xl px-6 py-20 mx-auto">
        <div className="grid lg:grid-cols-3 gap-12 items-start justify-center">

          {/* Create Task Column */}
          <div className="lg:col-span-1 sticky top-32">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              Dispatch Objective
            </h2>
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
              <form onSubmit={createTask} className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-widest">Task Title</label>
                  <input
                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    placeholder="E.g. Scraping LinkedIn"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-widest">Notes</label>
                  <textarea
                    className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all min-h-[120px] resize-none"
                    placeholder="Add specific parameters..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
                <button
                  disabled={!online || loading}
                  className="w-full py-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:bg-slate-200 disabled:shadow-none"
                >
                  {loading ? "Deploying..." : "Deploy Agent Task"}
                </button>
              </form>
            </div>
          </div>

          {/* Table Overview Column */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3 group">
                <h2 className="text-2xl font-bold">Active Pipeline</h2>
                <button
                  onClick={loadTasks}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:rotate-180 duration-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                  </svg>
                </button>
              </div>
              <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs font-black border border-slate-200 tracking-tighter">
                {tasks.length} OBJECTIVES
              </span>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Task Details</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400 text-right text-transparent">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group/row">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors">{t.title}</div>
                        <div className="text-sm text-slate-400 mt-0.5 line-clamp-1 max-w-sm">{t.description || "No metadata provided"}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          In Queue
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => removeTask(t.id)}
                          className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 border border-transparent transition-all"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tasks.length === 0 && (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Pipeline Cleared</h3>
                  <p className="text-slate-400 font-medium">Add a new objective to begin automation.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <footer className="w-full py-12 border-t border-slate-100 flex justify-center mt-auto">
        <p className="text-sm text-slate-400 font-medium">© 2025 AgentOS. Autonomous Processing Unit.</p>
      </footer>
    </div>
  );
}