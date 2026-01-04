import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API_BASE_URL from "../config";

export default function ExaShowcase({ token, handleLogout, username }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        if (token) {
            const savedChatId = sessionStorage.getItem("active_chat_id");
            loadChats(savedChatId);
        }
    }, [token]);

    const loadChats = async (autoSelectId = null) => {
        try {
            const res = await fetch(`${API_BASE_URL}/chats?type=research`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChats(data);

                if (autoSelectId) {
                    const found = data.find(c => c.id === autoSelectId);
                    if (found) selectChat(found);
                }
            }
        } catch (err) {
            console.error("Failed to load chats", err);
        }
    };


    const createNewChat = () => {
        setCurrentChatId(null);
        setQuery("");
        setResults(null);
        sessionStorage.removeItem("active_chat_id");
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        e.stopPropagation();
        await fetch(`${API_BASE_URL}/chats/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        loadChats();
        if (currentChatId === id) createNewChat();
    };

    const selectChat = (chat) => {
        setCurrentChatId(chat.id);
        sessionStorage.setItem("active_chat_id", chat.id);
        setQuery(chat.title);
        if (chat.results && chat.results.length > 0) {
            // Wrap in exa format if needed, but backend stored results as list
            setResults({ results: chat.results });
        } else {
            setResults(null);
            // Optional: auto-fetch if no results
            // fetchResults(null, chat.title, chat.id);
        }
    };

    const fetchResults = async (e, forceQuery = null, forceChatId = null) => {
        if (e) e.preventDefault();
        const searchTarget = forceQuery || query;
        if (!searchTarget.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setShowAllResults(false); // Reset to show limited results

        let activeChatId = forceChatId || currentChatId;
        if (!activeChatId) {
            try {
                const chatRes = await fetch(`${API_BASE_URL}/chats`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: searchTarget, last_message: searchTarget, type: "research" })
                });
                const chatData = await chatRes.json();
                activeChatId = chatData.id;
                setCurrentChatId(activeChatId);
            } catch (err) {
                console.error("Chat creation failed", err);
            }
        }

        try {
            const url = new URL(`${API_BASE_URL}/exa-search`);
            url.searchParams.append("query", searchTarget);

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

            // Persist results to chat session
            if (activeChatId) {
                await fetch(`${API_BASE_URL}/chats/${activeChatId}/results`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ results: data.results })
                });
                loadChats(); // Refresh sidebar to get stored results
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const [savedItems, setSavedItems] = useState([]);

    useEffect(() => {
        if (token) {
            fetchSavedItems();
        }
    }, [token]);

    const fetchSavedItems = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/saved-results`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSavedItems(data);
            }
        } catch (err) {
            console.error("Failed to load saved items", err);
        }
    };

    const toggleSave = async (item, savedItem) => {
        if (!token) return;

        try {
            if (savedItem) {
                // DELETE (Undo Save)
                const res = await fetch(`${API_BASE_URL}/saved-results/${savedItem.id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    setSavedItems(prev => prev.filter(s => s.id !== savedItem.id));
                }
            } else {
                // SAVE
                const payload = {
                    title: item.title,
                    url: item.url,
                    text: item.text,
                    saved_at: new Date().toISOString(),
                    is_favorite: false // Default to false when just saving
                };

                const res = await fetch(`${API_BASE_URL}/saved-results`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();

                    // FIX: Ensure clean state update with ID from backend
                    // The backend returns {message, id}, so we construct the full object
                    const newItem = { ...payload, id: data.id, _id: data.id };
                    setSavedItems(prev => [...prev, newItem]);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleStarClick = async (item, savedItem) => {
        if (!token) return;

        try {
            if (savedItem) {
                // ALREADY SAVED -> TOGGLE FAVORITE
                const update = { is_favorite: !savedItem.is_favorite };
                const res = await fetch(`${API_BASE_URL}/saved-results/${savedItem.id}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(update)
                });

                if (res.ok) {
                    // Update local state
                    setSavedItems(prev => prev.map(s =>
                        s.id === savedItem.id ? { ...s, is_favorite: !s.is_favorite } : s
                    ));
                }
            } else {
                // NOT SAVED -> SAVE AND FAVORITE
                const payload = {
                    title: item.title,
                    url: item.url,
                    text: item.text,
                    saved_at: new Date().toISOString(),
                    is_favorite: true // Set to true immediately
                };

                const res = await fetch(`${API_BASE_URL}/saved-results`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    const newItem = { ...payload, id: data.id, _id: data.id };
                    setSavedItems(prev => [...prev, newItem]);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewText, setPreviewText] = useState("");
    const [previewMode, setPreviewMode] = useState("web"); // 'web' | 'text'
    const [previewExpanded, setPreviewExpanded] = useState(false); // false = 25%, true = 70%
    const [showAllResults, setShowAllResults] = useState(false); // Show limited results initially

    const openPreview = (e, url, text) => {
        e.preventDefault();
        setPreviewUrl(url);
        setPreviewText(text || "");
        setPreviewMode("web"); // Reset to web by default
    };

    const closePreview = () => {
        setPreviewUrl(null);
        setPreviewText("");
        setPreviewExpanded(false); // Reset to collapsed
    };

    const togglePreviewSize = () => {
        setPreviewExpanded(!previewExpanded);
    };

    return (
        <div className="flex flex-col h-screen bg-background font-sans overflow-hidden pt-20">
            <div className="flex flex-1 overflow-hidden relative">
                {/* SIDEBAR */}
                <aside className={`fixed left-0 top-20 bottom-0 w-64 bg-surface border-r border-border/50 flex flex-col pt-8 pl-4 pr-2 transition-transform duration-500 ease-in-out z-40 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="mb-6 space-y-3">
                        <button
                            onClick={createNewChat}
                            className="w-full py-4 bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary-dark transition-all flex items-center justify-center gap-3 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98]"
                        >
                            <span>+</span> New Research Session
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="w-full py-2 bg-surface-light hover:bg-surface text-slate-400 hover:text-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                            title="Collapse sidebar"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                            </svg>
                            Collapse
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pb-8">
                        <h3 className="text-[10px] font-bold uppercase text-primary-light/60 tracking-widest px-3">History</h3>
                        {chats.length === 0 && <p className="text-[10px] text-slate-400 px-3 italic">No history yet.</p>}
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => selectChat(chat)}
                                className={`group relative p-5 rounded-2xl text-[13px] cursor-pointer transition-all border ${currentChatId === chat.id ? "bg-surface-light border-primary/30 shadow-xl shadow-primary/10 translate-x-1" : "border-transparent hover:bg-surface-light/50 hover:border-border"}`}>
                                <div className={`font-bold truncate pr-6 ${currentChatId === chat.id ? "text-primary-light" : "text-slate-300"}`}>{chat.title || "Untitled Search"}</div>
                                <div className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest">{new Date(chat.created_at).toLocaleDateString() || "Just now"}</div>

                                <button
                                    onClick={(e) => deleteChat(e, chat.id)}
                                    className="absolute right-2 top-3 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* SIDEBAR TOGGLE BUTTON (when collapsed) */}
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="fixed left-4 top-28 z-50 w-12 h-12 bg-surface border border-border shadow-xl rounded-full flex items-center justify-center text-slate-300 hover:text-primary-light hover:border-primary-light transition-all hover:scale-110"
                        title="Open sidebar"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
                        </svg>
                    </button>
                )}

                <main
                    className={`flex-1 overflow-y-auto bg-background relative transition-all duration-500 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}
                    style={previewUrl ? { paddingRight: previewExpanded ? '72vw' : '27vw' } : {}}
                >
                    {/* STICKY HEADER */}
                    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
                        <div className="max-w-7xl mx-auto px-6 py-6">
                            <div className="text-center">
                                {currentChatId && query && (
                                    <p className="text-sm text-slate-400 mb-2 font-medium">Active Session</p>
                                )}
                                <h1 className="text-2xl font-bold text-primary-light mb-4">
                                    {currentChatId && query ? query : "New Research Session"}
                                </h1>
                                <form onSubmit={fetchResults} className="max-w-2xl mx-auto flex gap-2">
                                <input
                                    autoFocus
                                    className="flex-1 bg-surface border-2 border-border text-slate-100 px-8 py-5 rounded-[28px] outline-none text-[15px] font-medium transition-all focus:border-primary focus:shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] placeholder:text-slate-500 placeholder:font-normal"
                                    placeholder="Describe what you want to find..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !query.trim()}
                                    className="px-10 py-5 bg-primary text-white font-black uppercase tracking-[0.25em] text-[11px] rounded-[28px] hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                                >
                                    {loading ? "..." : "Search"}
                                </button>
                            </form>
                        </div>
                    </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-6 py-12">
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Processing...</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/30 border border-red-700/50 p-6 text-center max-w-2xl mx-auto mb-8 rounded-xl">
                                <p className="text-red-300 font-bold text-sm">{error}</p>
                            </div>
                        )}

                        {/* RESULTS GRID */}
                        {results && (
                            <div className="space-y-4 pb-20">
                                {results.results && results.results.slice(0, showAllResults ? results.results.length : 10).map((item, idx) => {
                                    // Check if item is already saved by matching URL
                                    // savedItems comes from our new state
                                    const savedItem = savedItems.find(s => s.url === item.url);
                                    const isSaved = !!savedItem;
                                    const isFav = savedItem?.is_favorite;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={(e) => openPreview(e, item.url, item.text)}
                                            className={`bg-surface p-4 border shadow-sm transition-all group rounded-xl cursor-pointer ${previewUrl === item.url ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-light"}`}
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <h2 className="text-base font-bold text-slate-100 leading-tight group-hover:text-primary-light transition-colors">
                                                    <span className="hover:underline">
                                                        {item.title || "Untitled Result"}
                                                    </span>
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    {/* STAR BUTTON */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStarClick(item, savedItem);
                                                        }}
                                                        className={`text-xl transition-colors ${isFav ? "text-amber-400 hover:text-amber-500" : "text-slate-700 hover:text-amber-400"}`}
                                                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                                                    >
                                                        ★
                                                    </button>

                                                    {/* SAVE BUTTON */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSave(item, savedItem);
                                                        }}
                                                        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors rounded-full ${isSaved
                                                            ? "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60"
                                                            : "bg-surface-light hover:bg-primary hover:text-white text-slate-400"
                                                            }`}
                                                    >
                                                        {isSaved ? "SAVED" : "Save"}
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-slate-500 text-[10px] font-mono mb-2 truncate">{item.url}</p>

                                            <div className="text-slate-300 text-xs leading-relaxed mb-1 line-clamp-4">
                                                {item.text || <span className="italic opacity-50">No preview available.</span>}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* SHOW MORE BUTTON */}
                                {results.results && results.results.length > 10 && !showAllResults && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            onClick={() => setShowAllResults(true)}
                                            className="px-8 py-4 bg-surface border border-border hover:border-primary hover:bg-surface-light text-slate-300 hover:text-primary-light font-bold text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-primary/20"
                                        >
                                            Show More Results ({results.results.length - 10} remaining)
                                        </button>
                                    </div>
                                )}

                                {showAllResults && results.results && results.results.length > 10 && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            onClick={() => setShowAllResults(false)}
                                            className="px-8 py-4 bg-surface-light border border-border hover:border-primary text-slate-400 hover:text-primary-light font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
                                        >
                                            Show Less
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* PREVIEW OVERLAY */}
                {previewUrl && (
                    <div
                        className="fixed bottom-6 right-6 top-32 bg-surface border border-border shadow-2xl z-50 flex flex-col rounded-2xl overflow-hidden ring-1 ring-primary/20 transition-all duration-300 ease-in-out"
                        style={{
                            width: previewExpanded ? '70vw' : '25vw'
                        }}
                    >
                        <div className="flex items-center justify-between px-6 py-3 bg-surface-light border-b border-border">
                            <div className="flex items-center gap-4 overflow-hidden flex-1">
                                <div className="flex rounded-md bg-surface border border-border overflow-hidden shrink-0">
                                    <button
                                        onClick={() => setPreviewMode("web")}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${previewMode === "web" ? "bg-primary text-white" : "text-slate-400 hover:bg-surface-light"}`}
                                    >
                                        Website
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode("text")}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${previewMode === "text" ? "bg-primary text-white" : "text-slate-400 hover:bg-surface-light"}`}
                                    >
                                        Reader Mode
                                    </button>
                                </div>

                                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-slate-100 hover:text-primary-light hover:underline truncate flex-1 min-w-0">
                                    {previewUrl} <span className="text-[10px] text-slate-500 italic ml-2 opacity-50 font-sans normal-case">(Click to open in new tab if blocked)</span>
                                </a>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* SIZE TOGGLE BUTTON */}
                                <button
                                    onClick={togglePreviewSize}
                                    className="text-slate-400 hover:text-slate-100 font-bold p-2 transition-colors"
                                    title={previewExpanded ? "Minimize" : "Expand"}
                                >
                                    {previewExpanded ? "Minimize" : "Expand"}
                                </button>
                                <button onClick={closePreview} className="text-slate-400 hover:text-red-400 font-bold p-2 transition-colors">
                                    ✕ Close
                                </button>
                            </div>
                        </div>

                        {previewMode === "web" ? (
                            <iframe
                                src={previewUrl}
                                className="w-full flex-1 bg-white"
                                title="Preview"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                            />
                        ) : (
                            <div className="w-full flex-1 bg-surface overflow-y-auto p-12 max-w-4xl mx-auto">
                                <h2 className="text-2xl font-bold text-slate-100 mb-6">Text Content Preview</h2>
                                <div className="prose prose-slate max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {previewText || <span className="italic text-slate-500">No text content available for this result. Try opening the website directly.</span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
