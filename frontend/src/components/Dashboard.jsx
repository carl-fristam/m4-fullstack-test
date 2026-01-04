import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChatWidget from "./ChatWidget";
import API_BASE_URL from "../config";

const API_URL = `${API_BASE_URL}/saved-results`;

export default function Dashboard({ token, handleLogout, username }) {
    const [sources, setSources] = useState([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatWidth, setChatWidth] = useState(450);
    const [isResizing, setIsResizing] = useState(false);

    // New state for tag edit
    const [editingId, setEditingId] = useState(null);
    const [tagInput, setTagInput] = useState("");

    // Undo / Delete Animation State
    const [deletingId, setDeletingId] = useState(null); // ID of item currently animating out
    const [undoState, setUndoState] = useState(null); // { item, index, timerId, y }

    // Notes State
    const [activeNote, setActiveNote] = useState(null); // { id, x, y }
    const [noteInput, setNoteInput] = useState("");

    // History Sidebar State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);

    const loadChats = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/chats?type=knowledge_base`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChats(data);
            }
        } catch (err) {
            console.error("Failed to load chats", err);
        }
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        await fetch(`${API_BASE_URL}/chats/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        loadChats();
        if (activeChat?.id === id) setActiveChat(null);
    };

    useEffect(() => {
        if (token) loadChats();
    }, [token]);

    const openNote = (s, e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();

        // Smart positioning: Check if we have space on the right
        const spaceRight = window.innerWidth - rect.right;
        const overlayWidth = 280; // w-64 is 256px + padding/margin safety

        let xPos;
        if (spaceRight < overlayWidth) {
            // Not enough space on right, show on left
            xPos = rect.left - overlayWidth + 20; // +20 overlap/adjustment
        } else {
            // Show on right
            xPos = rect.right + 10;
        }

        setActiveNote({ id: s.id, x: xPos, y: rect.top - 20 });
        setNoteInput(s.note || "");
    };

    const saveNote = async () => {
        if (!activeNote) return;
        try {
            // Optimistic update
            setSources(prev => prev.map(s => s.id === activeNote.id ? { ...s, note: noteInput } : s));

            await fetch(`${API_URL}/${activeNote.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ note: noteInput })
            });
            setActiveNote(null);
        } catch (err) {
            console.error(err);
        }
    };

    const loadSources = async () => {
        if (!token) return;
        setLoading(true);
        // console.log("Loading sources from:", API_URL);
        try {
            const res = await fetch(API_URL, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401) {
                handleLogout();
            } else if (res.ok) {
                const data = await res.json();
                // console.log("Sources loaded:", data);
                const sortedData = data.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));
                setSources(sortedData);
            } else {
                console.error("Failed to load sources, status:", res.status);
            }
        } catch (err) {
            console.error("Failed to load sources:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) loadSources();
    }, [token]);

    // Handle clicking outside to close Tag Input
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (editingId) {
                if (!event.target.closest(".tag-popup") && !event.target.closest(".tag-trigger")) {
                    setEditingId(null);
                    setTagInput("");
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [editingId]);

    const toggleFavorite = async (item) => {
        // console.log("Toggling favorite for:", item.id);
        await updateSource(item.id, { is_favorite: !item.is_favorite });
    };

    const addTag = async (id, currentTags, specificTag = null) => {
        const tagToAdd = specificTag || tagInput.trim();
        if (!tagToAdd) return;
        if (currentTags?.includes(tagToAdd)) {
            setTagInput("");
            setEditingId(null);
            return;
        }

        const newTags = [...(currentTags || []), tagToAdd];
        // console.log("Adding tag:", tagToAdd, "to", id);
        await updateSource(id, { tags: newTags });
        setTagInput("");
        setEditingId(null);
    };

    const removeTag = async (item, tagToRemove) => {
        const newTags = item.tags.filter(t => t !== tagToRemove);
        // console.log("Removing tag:", tagToRemove, "from", item.id);
        await updateSource(item.id, { tags: newTags });
    }

    const updateSource = async (id, update) => {
        // console.log("Updating source:", id, update);
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(update)
            });
            if (res.ok) {
                // console.log("Update successful");
                loadSources();
            } else {
                console.error("Update failed with status:", res.status);
            }
        } catch (err) {
            console.error("Update fetch error:", err);
        }
    }

    const removeSource = (id, e) => {
        // Capture position before animation starts
        // We want the button to appear "outside the list" on the right, vertically centered on the row
        const row = e.target.closest('tr');
        const rect = row.getBoundingClientRect();
        // Calculate vertical center of the row
        const yPos = rect.top + (rect.height / 2) - 20; // 20 is half of 40px button height

        // 1. Trigger exit animation
        setDeletingId(id);

        // 2. Wait for animation, then remove locally
        setTimeout(() => {
            setSources(prev => {
                const index = prev.findIndex(s => s.id === id);
                if (index === -1) return prev;

                const itemToRemove = prev[index];
                const newSources = [...prev];
                newSources.splice(index, 1);

                // 3. Set Undo State with Timer
                const timerId = setTimeout(async () => {
                    // Permanently delete after 5 seconds if not undone
                    try {
                        await fetch(`${API_URL}/${id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        // Clear undo state after permanent delete
                        setUndoState(current => current?.item.id === id ? null : current);
                    } catch (err) {
                        console.error("Remove source error:", err);
                    }
                }, 5000);

                setUndoState({ item: itemToRemove, index, timerId, y: yPos });
                return newSources;
            });
            setDeletingId(null);
        }, 300); // Match CSS duration
    };

    const undoDelete = () => {
        if (!undoState) return;

        // Cancel permanent delete
        clearTimeout(undoState.timerId);

        // Restore item
        setSources(prev => {
            const newSources = [...prev];
            newSources.splice(undoState.index, 0, undoState.item);
            return newSources;
        });

        setUndoState(null);
    };

    const [selectedTags, setSelectedTags] = useState([]);
    const [showFavorites, setShowFavorites] = useState(false);

    // Derived unique tags logic
    const allTags = Array.from(new Set(sources.flatMap(s => s.tags || []))).sort();

    // Toggle Tag Filter
    const toggleTagSelect = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const filteredSources = sources.filter(s => {
        // 1. Text Search (Multi-keyword, Case-Insensitive)
        const searchLower = filter.toLowerCase();
        const keywords = searchLower.split(" ").filter(k => k.trim());
        const matchesSearch = keywords.length === 0 || keywords.every(k =>
            s.title?.toLowerCase().includes(k) ||
            s.url?.toLowerCase().includes(k) ||
            s.tags?.some(t => t.toLowerCase().includes(k))
        );

        // 2. Tag Filter (AND logic)
        const matchesTags = selectedTags.length === 0 || selectedTags.every(t => s.tags?.includes(t));

        // 3. Favorites Filter
        const matchesFav = !showFavorites || s.is_favorite;

        return matchesSearch && matchesTags && matchesFav;
    });

    return (
        <div className="h-screen bg-background flex overflow-hidden">
            <main
                className="flex-1 flex gap-10 items-start w-full h-full pt-24"
            >
                {/* LEFT COLUMN: EMBEDDED CHAT */}
                <div className="w-[40%] h-full flex flex-col pt-10 pb-8 pl-8 relative">
                    {/* HISTORY OVERLAY BACKDROP */}
                    {isHistoryOpen && (
                        <div
                            className="fixed inset-0 z-[90] bg-black/30 transition-opacity duration-300 pointer-events-auto"
                            onClick={() => setIsHistoryOpen(false)}
                        ></div>
                    )}

                    <aside
                        className={`fixed left-0 top-[20vh] bottom-[20vh] w-80 bg-surface/95 backdrop-blur-md z-[100] transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col shadow-[10px_0_40px_-20px_rgba(0,0,0,0.5)] rounded-tr-[32px] rounded-br-[32px] border-r border-border ${isHistoryOpen ? "translate-x-0" : "-translate-x-full"}`}
                    >
                        <div className="px-8 py-8 border-b border-border">
                            <h3 className="text-[11px] font-black uppercase text-primary-light tracking-[0.25em]">Research History</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative scrollbar-hide">
                            <style>{`
                                .scrollbar-hide::-webkit-scrollbar { display: none; }
                                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                            `}</style>
                            {chats.length === 0 && <p className="text-[11px] text-slate-400 px-4 py-6 italic font-medium">No history yet.</p>}
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        setActiveChat(chat);
                                    }}
                                    className={`group relative p-5 rounded-[22px] text-sm cursor-pointer transition-all border ${activeChat?.id === chat.id ? "bg-surface-light border-primary shadow-lg shadow-primary/20 scale-[1.02] z-10" : "border-transparent hover:bg-surface-light/60 hover:border-border hover:shadow-sm"}`}>
                                    <div className={`font-bold truncate pr-6 ${activeChat?.id === chat.id ? "text-primary-light" : "text-slate-300 group-hover:text-primary-light"}`}>{chat.title || "Untitled Chat"}</div>
                                    <div className="text-[10px] text-slate-500 mt-1.5 font-bold tracking-tight uppercase flex justify-between items-center">
                                        <span>{new Date(chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">View Details →</span>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteChat(e, chat.id);
                                        }}
                                        className="absolute right-3 top-4 w-7 h-7 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-950/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete chat"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            ))}
                            {/* Sticky Gradient Fade at Bottom */}
                            <div className="sticky bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent pointer-events-none z-20"></div>
                        </div>
                    </aside>



                    <ChatWidget
                        token={token}
                        username={username}
                        isOpen={isChatOpen}
                        toggleChat={() => setIsChatOpen(!isChatOpen)}
                        width={chatWidth}
                        setWidth={setChatWidth}
                        setIsResizing={setIsResizing}
                        isResizing={isResizing}
                        isEmbedded={true}
                        activeChat={activeChat}
                        onNewChat={() => setActiveChat(null)}
                        onChatUpdated={loadChats} // callback to refresh list when chat updates title/etc
                        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                    />
                </div>

                {/* RIGHT COLUMN: KNOWLEDGE BASE TABLE */}
                <div className="w-[60%] h-full overflow-y-auto pt-10 pb-32 pr-8 scroll-smooth">
                    {/* UNDO BUTTON: Contextual, Minimalist */}
                    {undoState && (
                        <button
                            onClick={undoDelete}
                            className="absolute -right-4 top-12 z-50 bg-surface text-primary-light w-10 h-10 rounded-lg shadow-xl shadow-primary/20 border border-primary flex items-center justify-center hover:scale-110 transition-transform animate-pop-in cursor-pointer"
                            title="Undo Delete"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                        </button>
                    )}

                    <div className="bg-surface border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden rounded-xl transition-shadow hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] w-full overflow-x-auto">
                        <div className="p-4">
                            <h1 className="text-3xl font-bold text-primary-light">Saved sources</h1>
                            <p className="text-slate-400 mt-2">Overview of your saved research papers.</p>
                            <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                                {/* LEFT: TAG FILTERS */}
                                {allTags.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 mr-2 tracking-widest">Filters:</span>
                                        {allTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => toggleTagSelect(tag)}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full border transition-all ${selectedTags.includes(tag)
                                                    ? "bg-primary text-white border-primary"
                                                    : "bg-surface-light text-slate-300 border-border hover:border-primary-light hover:text-primary-light"
                                                    }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                        {selectedTags.length > 0 && (
                                            <button onClick={() => setSelectedTags([])} className="text-[10px] font-bold uppercase text-slate-400 hover:text-red-400 hover:underline ml-2 tracking-tight">
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* RIGHT: FAVORITES & SEARCH */}
                                <div className="flex items-center gap-4 ml-auto">
                                    <button
                                        onClick={() => setShowFavorites(!showFavorites)}
                                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all ${showFavorites
                                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                            : "bg-surface-light text-slate-300 border-border hover:border-primary-light hover:text-primary-light"
                                            }`}
                                    >
                                        ★ Favorites Only
                                    </button>
                                    <div className="relative">
                                        <input
                                            className="pl-10 pr-4 py-2 border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-xs w-48 bg-surface-light rounded-full transition-all focus:shadow-sm placeholder:text-slate-500 text-slate-100"
                                            placeholder="Search keywords..."
                                            value={filter}
                                            onChange={(e) => setFilter(e.target.value)}
                                        />
                                        <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-primary border-b border-primary-dark shadow-sm">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white w-12 text-center">Fav</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white min-w-[300px] whitespace-normal">Source Title / URL</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white w-1/5">Tags</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white w-1/5">Notes</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white text-right w-24">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredSources.map((s) => (
                                    <tr
                                        key={s.id}
                                        className={`hover:bg-surface-light transition-all duration-300 group ${deletingId === s.id ? "opacity-0 scale-95" : "opacity-100"}`}
                                    >
                                        <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleFavorite(s)}>
                                            <span className={`text-xl ${s.is_favorite ? "text-amber-400" : "text-slate-700 group-hover:text-slate-500"}`}>★</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-bold text-slate-100 text-sm mb-1 break-words whitespace-normal hover:underline hover:text-primary-light block"
                                            >
                                                {s.title || "Untitled Document"}
                                            </a>
                                            <div className="text-xs text-slate-400 font-mono truncate max-w-[200px]">{s.url}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {s.tags?.map(t => (
                                                    <span key={t} className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-surface-light text-slate-300 border border-border">
                                                        {t}
                                                        <button onClick={() => removeTag(s, t)} className="ml-1 hover:text-red-400">×</button>
                                                    </span>
                                                ))}
                                                <button
                                                    onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                                                    className="tag-trigger px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-background border border-border text-slate-500 hover:border-primary-light hover:text-primary-light transition-colors"
                                                >
                                                    {editingId === s.id ? "Close" : "+ Tag"}
                                                </button>
                                            </div>
                                            {editingId === s.id && (
                                                <div className="tag-popup absolute z-10 bg-surface border border-border shadow-xl p-2 rounded-xl mt-1 flex flex-col gap-2 min-w-[160px]">
                                                    <div className="flex gap-1">
                                                        <input
                                                            className="px-2 py-1 text-xs border border-border bg-surface-light text-slate-100 outline-none focus:border-primary w-full rounded-l-lg placeholder:text-slate-500"
                                                            placeholder="New tag..."
                                                            value={tagInput}
                                                            onChange={e => setTagInput(e.target.value)}
                                                            autoFocus
                                                            onKeyDown={e => e.key === 'Enter' && addTag(s.id, s.tags || [])}
                                                        />
                                                        <button onClick={() => addTag(s.id, s.tags || [])} className="px-2 py-1 bg-primary text-white text-xs rounded-r-lg hover:bg-primary-dark transition-colors">OK</button>
                                                    </div>
                                                    {/* Suggestions */}
                                                    {allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !s.tags?.includes(t)).length > 0 && (
                                                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border-t border-border/50 pt-1">
                                                            <span className="text-[9px] uppercase font-bold text-slate-500 px-1">Suggestions</span>
                                                            {allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !s.tags?.includes(t)).map(t => (
                                                                <button
                                                                    key={t}
                                                                    onClick={() => addTag(s.id, s.tags || [], t)}
                                                                    className="text-left text-xs px-2 py-1 hover:bg-surface-light text-slate-300 hover:text-slate-100 rounded-md font-medium truncate"
                                                                >
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 relative">
                                            {/* NOTES COLUMN */}
                                            {s.note ? (
                                                <div onClick={(e) => openNote(s, e)} className="cursor-pointer group/note">
                                                    <p className="text-xs text-slate-400 line-clamp-2 hover:text-slate-200 transition-colors">{s.note}</p>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => openNote(s, e)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-light text-slate-300 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-all font-bold text-lg"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={(e) => removeSource(s.id, e)} className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSources.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-16 text-center text-slate-400 text-sm">
                                            {filter ? "No matches found." : "Repository is empty. Start researching!"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* NOTES OVERLAY */}
                    {activeNote && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => saveNote()}></div>
                            <div
                                className="fixed z-[70] bg-surface w-64 p-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-border animate-pop-in"
                                style={{ top: activeNote.y, left: activeNote.x }}
                            >
                                <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Edit Note</h4>
                                <textarea
                                    className="w-full text-sm text-slate-200 bg-surface-light border-none rounded-lg p-2 resize-none outline-none focus:ring-1 focus:ring-border h-24 mb-2 placeholder:text-slate-500"
                                    placeholder="Add a note..."
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={saveNote}
                                        className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:scale-105 transition-transform shadow-md shadow-primary/30"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
