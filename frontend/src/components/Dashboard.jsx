import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:8000/saved-results";

export default function Dashboard({ token, online, handleLogout }) {
    const [sources, setSources] = useState([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(false);

    // New state for tag edit
    const [editingId, setEditingId] = useState(null);
    const [tagInput, setTagInput] = useState("");

    const loadSources = async () => {
        if (!token) return;
        setLoading(true);
        console.log("Loading sources from:", API_URL);
        try {
            const res = await fetch(API_URL, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 401) {
                handleLogout();
            } else if (res.ok) {
                const data = await res.json();
                console.log("Sources loaded:", data);
                setSources(data);
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

    const toggleFavorite = async (item) => {
        console.log("Toggling favorite for:", item.id);
        await updateSource(item.id, { is_favorite: !item.is_favorite });
    };

    const addTag = async (id, currentTags) => {
        if (!tagInput.trim()) return;
        const newTags = [...currentTags, tagInput.trim()];
        console.log("Adding tag:", tagInput, "to", id);
        await updateSource(id, { tags: newTags });
        setTagInput("");
        setEditingId(null);
    };

    const removeTag = async (item, tagToRemove) => {
        const newTags = item.tags.filter(t => t !== tagToRemove);
        console.log("Removing tag:", tagToRemove, "from", item.id);
        await updateSource(item.id, { tags: newTags });
    }

    const updateSource = async (id, update) => {
        console.log("Updating source:", id, update);
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
                console.log("Update successful");
                loadSources();
            } else {
                console.error("Update failed with status:", res.status);
            }
        } catch (err) {
            console.error("Update fetch error:", err);
        }
    }

    const removeSource = async (id) => {
        if (!confirm("Delete this source?")) return;
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) loadSources();
        } catch (err) {
            console.error("Remove source error:", err);
        }
    };

    const filteredSources = sources.filter(s =>
        s.title?.toLowerCase().includes(filter.toLowerCase()) ||
        s.tags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="fixed top-0 w-full z-50 bg-[#003253] border-b border-[#002842] flex justify-center text-white h-20">
                <div className="w-full max-w-7xl px-6 grid grid-cols-3 items-center h-full">
                    <div className="flex items-center justify-start gap-8">
                        <Link to="/" className="flex items-center gap-3 cursor-pointer no-underline text-white">
                            <div className="w-10 h-10 bg-white flex items-center justify-center">
                                <span className="text-[#003253] font-bold text-lg">DB</span>
                            </div>
                            <span className="font-bold tracking-tight text-xl">Master thesis</span>
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-8">
                        <Link to="/" className="text-sm font-bold text-white border-b-2 border-white pb-1 no-underline">Knowledge Base</Link>
                        <Link to="/exa-showcase" className="text-sm font-bold text-slate-300 hover:text-white transition-colors no-underline">Research Chat</Link>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button onClick={handleLogout} className="px-5 py-2 bg-[#E40000] text-white text-xs font-bold hover:bg-red-700 transition-colors uppercase tracking-wider">Log Out</button>
                    </div>
                </div>
            </nav>

            <main className="w-full max-w-7xl px-6 py-32 mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[#003253]">Knowledge Repository</h1>
                        <p className="text-slate-500 mt-2">Manage your saved research papers and verified sources.</p>
                    </div>
                    <div className="relative">
                        <input
                            className="pl-10 pr-4 py-2 border border-slate-300 focus:border-[#003253] outline-none text-sm w-64 bg-white"
                            placeholder="Filter by title or tag..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-12 text-center">Fav</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Source Title / URL</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-1/4">Tags</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSources.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleFavorite(s)}>
                                        <span className={`text-xl ${s.is_favorite ? "text-amber-400" : "text-slate-200 group-hover:text-slate-300"}`}>★</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#003253] text-sm mb-1">{s.title || "Untitled Document"}</div>
                                        <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-[#003253] truncate block max-w-md font-mono">{s.url}</a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {s.tags?.map(t => (
                                                <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                    {t}
                                                    <button onClick={() => removeTag(s, t)} className="ml-1 hover:text-[#E40000]">×</button>
                                                </span>
                                            ))}
                                            <button
                                                onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-400 hover:border-[#003253] hover:text-[#003253] transition-colors"
                                            >
                                                + Tag
                                            </button>
                                        </div>
                                        {editingId === s.id && (
                                            <div className="flex gap-1">
                                                <input
                                                    className="px-2 py-1 text-xs border border-slate-300 outline-none focus:border-[#003253] w-24"
                                                    placeholder="New tag..."
                                                    value={tagInput}
                                                    onChange={e => setTagInput(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && addTag(s.id, s.tags || [])}
                                                />
                                                <button onClick={() => addTag(s.id, s.tags || [])} className="px-2 py-1 bg-[#003253] text-white text-xs">OK</button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => removeSource(s.id)} className="text-slate-300 hover:text-[#E40000] p-2 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredSources.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="py-16 text-center text-slate-400 text-sm">
                                        {filter ? "No matches found." : "Repository is empty. Start researching!"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
