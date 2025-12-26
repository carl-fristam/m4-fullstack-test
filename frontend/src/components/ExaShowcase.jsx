import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function ExaShowcase({ token, online, handleLogout }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Chat History State
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);

    useEffect(() => {
        if (token) loadChats();
    }, [token]);

    const loadChats = async () => {
        console.log("Loading chats...");
        try {
            const res = await fetch("http://localhost:8000/chats", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Chats loaded successfully:", data);
                setChats(data);
            } else {
                console.error("Failed to load chats, status:", res.status);
            }
        } catch (err) {
            console.error("Failed to load chats error:", err);
        }
    };

    const createNewChat = () => {
        setCurrentChatId(null);
        setQuery("");
        setResults(null);
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Delete this chat?")) return;
        await fetch(`http://localhost:8000/chats/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        loadChats();
        if (currentChatId === id) createNewChat();
    };

    const fetchResults = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        // If no session, create one
        let activeChatId = currentChatId;
        if (!activeChatId) {
            console.log("No active chat, creating new session for query:", query);
            try {
                const chatRes = await fetch("http://localhost:8000/chats", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: query, last_message: query })
                });
                const chatData = await chatRes.json();
                console.log("New chat created:", chatData);
                activeChatId = chatData.id;
                setCurrentChatId(activeChatId);
                loadChats(); // Refresh sidebar
            } catch (err) {
                console.error("Chat creation failed:", err);
            }
        }

        try {
            const url = new URL("http://localhost:8000/exa-search");
            url.searchParams.append("query", query);

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                if (res.status === 401) {
                    handleLogout();
                    return;
                }
                throw new Error(`API Error: ${res.statusText}`);
            }

            const data = await res.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveResult = async (item) => {
        if (!token) return;
        try {
            const payload = {
                title: item.title,
                url: item.url,
                text: item.text,
                saved_at: new Date().toISOString()
            };

            const res = await fetch("http://localhost:8000/saved-results", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Research saved successfully.");
            } else {
                alert("Failed to save result.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving.");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
            {/* ---------- TOP MENU ---------- */}
            <nav className="shrink-0 w-full z-50 bg-[#003253] border-b border-[#002842] flex justify-center text-white h-20">
                <div className="w-full max-w-7xl px-6 grid grid-cols-3 items-center">
                    <div className="flex items-center justify-start gap-8">
                        <Link to="/" className="flex items-center gap-3 cursor-pointer no-underline text-white">
                            <div className="w-10 h-10 bg-white flex items-center justify-center">
                                <span className="text-[#003253] font-bold text-lg">DB</span>
                            </div>
                            <span className="font-bold tracking-tight text-xl">Master Thesis</span>
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-8">
                        <Link to="/" className="text-sm font-bold text-slate-300 hover:text-white transition-colors no-underline">Knowledge Base</Link>
                        <Link to="/exa-showcase" className="text-sm font-bold text-white border-b-2 border-white pb-1 no-underline">Research Chat</Link>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-white/20 bg-[#002842]`}>
                            <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-400" : "bg-rose-500"}`} />
                            {online ? "Online" : "Offline"}
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR */}
                <aside className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col pt-4">
                    <div className="p-4">
                        <button
                            onClick={createNewChat}
                            className="w-full py-3 bg-[#003253] text-white font-bold uppercase tracking-wider text-xs hover:bg-[#002842] transition-colors flex items-center justify-center gap-2"
                        >
                            <span>+</span> New Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3 mt-2 px-2">History</h3>
                        {chats.length === 0 && <p className="text-[10px] text-slate-400 px-2 italic">No history yet.</p>}
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => { setCurrentChatId(chat.id); setQuery(chat.title); setResults(null); }}
                                className={`group relative p-3 rounded-lg text-sm cursor-pointer transition-colors border ${currentChatId === chat.id ? "bg-white border-slate-300 shadow-sm" : "border-transparent hover:bg-slate-200"}`}
                            >
                                <div className="font-medium text-[#003253] truncate pr-6">{chat.title}</div>
                                <div className="text-[10px] text-slate-400 mt-1 truncate">{new Date(chat.created_at).toLocaleString() || "Just now"}</div>

                                <button
                                    onClick={(e) => deleteChat(e, chat.id)}
                                    className="absolute right-2 top-3 text-slate-300 hover:text-[#E40000] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto bg-slate-50 relative pt-10">
                    <div className="max-w-4xl mx-auto px-6 py-12">
                        <div className="text-center mb-12">
                            <h1 className="text-3xl font-bold text-[#003253] mb-4">
                                {currentChatId ? "Active Session" : "New Research Session"}
                            </h1>
                            <p className="text-slate-500 mb-8">
                                Search verified papers and sources.
                            </p>

                            <form onSubmit={fetchResults} className="max-w-2xl mx-auto flex gap-2">
                                <input
                                    className="flex-1 px-5 py-4 bg-white border border-slate-300 focus:border-[#003253] outline-none text-[#003253] text-lg shadow-sm"
                                    placeholder="Enter research query..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 bg-[#003253] text-white font-bold uppercase tracking-wider text-sm hover:bg-[#002842] disabled:bg-slate-300 transition-colors"
                                >
                                    {loading ? "..." : "Search"}
                                </button>
                            </form>
                        </div>

                        {loading && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-[#003253] rounded-full animate-spin mb-4"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Processing...</p>
                            </div>
                        )}

                        {results && (
                            <div className="space-y-4 pb-20">
                                {results.results && results.results.map((item, idx) => (
                                    <div key={idx} className="bg-white p-6 border border-slate-200 shadow-sm hover:border-[#003253] transition-all group">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <h2 className="text-lg font-bold text-[#003253] leading-tight group-hover:text-[#004870] transition-colors">
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    {item.title || "Untitled Result"}
                                                </a>
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => saveResult(item)}
                                                    className="px-3 py-1 bg-slate-100 hover:bg-[#E40000] hover:text-white text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-colors"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-slate-400 text-xs font-mono mb-4 truncate">{item.url}</p>
                                        <div className="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-4">
                                            {item.text || <span className="italic opacity-50">No preview available.</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
