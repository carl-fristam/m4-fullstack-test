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
                    setSavedItems(prev => [prev, { payload, data }]);
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
                        s.id === savedItem.id ? { s, is_favorite: !s.is_favorite } : s
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
                    setSavedItems(prev => [prev, { payload, data }]);
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
        <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden pt-20">
            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR */}
                <aside className="w-64 bg-slate-50 flex flex-col pt-4">
                    <div className="p-4">
                        <button
                            onClick={createNewChat}
                            className="w-full py-3 bg-slate-900 text-white font-bold uppercase tracking-wider text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 rounded-full shadow-sm"
                        >
                            <span>+</span> New Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px- pb-4 space-y-1">
                        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3 mt-2 px-4">History</h3>
                        {chats.length === 0 && <p className="text-[10px] text-slate-400 px-2 italic">No history yet.</p>}
                        {chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => selectChat(chat)}
                                className={`group relative p-3 rounded-lg text-sm cursor-pointer transition-all ${currentChatId === chat.id ? "bg-white ring-1 ring-slate-200 shadow-sm" : "hover:bg-slate-200/50"}`}>
                                <div className={`font-medium truncate pr-6 ${currentChatId === chat.id ? "text-slate-900" : "text-slate-600"}`}>{chat.title}</div>
                                <div className="text-[10px] text-slate-400 mt-1 truncate">{new Date(chat.created_at).toLocaleString() || "Just now"}</div>

                                <button
                                    onClick={(e) => deleteChat(e, chat.id)}
                                    className="absolute right-2 top-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                <main
                    className="flex-1 overflow-y-auto bg-slate-50 relative pt-10 transition-all duration-300"
                    style={previewUrl ? { paddingRight: previewExpanded ? '72vw' : '27vw' } : {}}
                >
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="text-center mb-12">
                            <h1 className="text-3xl font-bold text-slate-900 mb-4">
                                {currentChatId ? "Active Session" : "New Research Session"}
                            </h1>
                            <form onSubmit={fetchResults} className="max-w-2xl mx-auto flex gap-2">
                                <input
                                    className="flex-1 px-5 py-4 bg-white border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 outline-none text-slate-900 text-lg shadow-sm rounded-full transition-all"
                                    placeholder="Enter research query..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 bg-slate-900 text-white font-bold uppercase tracking-wider text-sm hover:bg-black disabled:bg-slate-300 transition-colors rounded-full shadow-md"
                                >
                                    {loading ? "..." : "Search"}
                                </button>
                            </form>
                        </div>

                        {loading && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Processing...</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-50 border border-rose-100 p-6 text-center max-w-2xl mx-auto mb-8">
                                <p className="text-[#E40000] font-bold text-sm">{error}</p>
                            </div>
                        )}

                        {/* RESULTS GRID */}
                        {results && (
                            <div className="space-y-4 pb-20">
                                {results.results && results.results.map((item, idx) => {
                                    // Check if item is already saved by matching URL
                                    // savedItems comes from our new state
                                    const savedItem = savedItems.find(s => s.url === item.url);
                                    const isSaved = !!savedItem;
                                    const isFav = savedItem?.is_favorite;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={(e) => openPreview(e, item.url, item.text)}
                                            className={`bg-white p-4 border shadow-sm transition-all group rounded-xl cursor-pointer ${previewUrl === item.url ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-400"}`}
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <h2 className="text-base font-bold text-slate-800 leading-tight group-hover:text-black transition-colors">
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
                                                        className={`text-xl transition-colors ${isFav ? "text-amber-400 hover:text-amber-500" : "text-slate-200 hover:text-amber-400"}`}
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
                                                            ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                                            : "bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-500"
                                                            }`}
                                                    >
                                                        {isSaved ? "SAVED" : "Save"}
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-slate-400 text-[10px] font-mono mb-2 truncate">{item.url}</p>

                                            <div className="text-slate-600 text-xs leading-relaxed mb-1 line-clamp-4">
                                                {item.text || <span className="italic opacity-50">No preview available.</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>

                {/* PREVIEW OVERLAY */}
                {previewUrl && (
                    <div
                        className="fixed bottom-6 right-6 top-24 bg-white border border-slate-200 shadow-2xl z-50 flex flex-col rounded-2xl overflow-hidden ring-1 ring-slate-900/5 transition-all duration-300 ease-in-out"
                        style={{
                            width: previewExpanded ? '70vw' : '25vw'
                        }}
                    >
                        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="flex items-center gap-4 overflow-hidden flex-1">
                                <div className="flex rounded-md bg-white border border-slate-300 overflow-hidden shrink-0">
                                    <button
                                        onClick={() => setPreviewMode("web")}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${previewMode === "web" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                                    >
                                        Website
                                    </button>
                                    <button
                                        onClick={() => setPreviewMode("text")}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${previewMode === "text" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                                    >
                                        Reader Mode
                                    </button>
                                </div>

                                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-slate-900 hover:text-slate-600 hover:underline truncate flex-1 min-w-0">
                                    {previewUrl} <span className="text-[10px] text-slate-400 italic ml-2 opacity-50 font-sans normal-case">(Click to open in new tab if blocked)</span>
                                </a>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* SIZE TOGGLE BUTTON */}
                                <button
                                    onClick={togglePreviewSize}
                                    className="text-slate-500 hover:text-slate-900 font-bold p-2 transition-colors"
                                    title={previewExpanded ? "Minimize" : "Expand"}
                                >
                                    {previewExpanded ? "Minimize" : "Expand"}
                                </button>
                                <button onClick={closePreview} className="text-slate-500 hover:text-[#E40000] font-bold p-2 transition-colors">
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
                            <div className="w-full flex-1 bg-white overflow-y-auto p-12 max-w-4xl mx-auto">
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">Text Content Preview</h2>
                                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {previewText || <span className="italic text-slate-400">No text content available for this result. Try opening the website directly.</span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
