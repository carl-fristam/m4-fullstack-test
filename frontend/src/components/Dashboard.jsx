import { useEffect, useState, useCallback } from "react";
import * as knowledgeService from "../api/knowledge";
import * as chatService from "../api/chat";
import DashboardSidebar from "./dashboard/DashboardSidebar";
import KnowledgeTable from "./dashboard/KnowledgeTable";
import NotePopup from "./dashboard/NotePopup";

export default function Dashboard({ token, handleLogout, username }) {
    const [sources, setSources] = useState([]);
    const [filter, setFilter] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatWidth, setChatWidth] = useState(450);
    const [isResizing, setIsResizing] = useState(false);

    // Tag Edit State
    const [editingId, setEditingId] = useState(null);
    const [tagInput, setTagInput] = useState("");

    // Undo / Delete Animation State
    const [deletingId, setDeletingId] = useState(null);
    const [undoState, setUndoState] = useState(null); // { item, index, timerId, y }

    // Notes State
    const [activeNote, setActiveNote] = useState(null); // { id, x, y }
    const [noteInput, setNoteInput] = useState("");

    // History Sidebar State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);

    const loadChats = useCallback(async () => {
        if (!token) return;
        try {
            const data = await chatService.getChats(); // Load all chats, not just knowledge_base
            setChats(data);
        } catch (err) {
            console.error("Failed to load chats", err);
        }
    }, [token]);

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        await chatService.deleteChat(id);
        loadChats();
        if (activeChat?.id === id) setActiveChat(null);
    };

    useEffect(() => {
        loadChats();
    }, [loadChats]);

    const openNote = (s, e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        const spaceRight = window.innerWidth - rect.right;
        const overlayWidth = 280;

        let xPos;
        if (spaceRight < overlayWidth) {
            xPos = rect.left - overlayWidth + 20;
        } else {
            xPos = rect.right + 10;
        }

        setActiveNote({ id: s.id, x: xPos, y: rect.top - 20 });
        setNoteInput(s.note || "");
    };

    const saveNote = async () => {
        if (!activeNote) return;
        try {
            setSources(prev => prev.map(s => s.id === activeNote.id ? { ...s, note: noteInput } : s));
            await knowledgeService.updateResult(activeNote.id, { note: noteInput });
            setActiveNote(null);
        } catch (err) {
            console.error(err);
        }
    };

    const loadSources = useCallback(async () => {
        if (!token) return;
        try {
            const data = await knowledgeService.getSavedResults();
            const sortedData = data.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));
            setSources(sortedData);
        } catch (err) {
            console.error("Failed to load sources:", err);
            if (err.response && err.response.status === 401) {
                handleLogout();
            }
        }
    }, [token, handleLogout]);

    useEffect(() => {
        loadSources();
    }, [loadSources]);

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
        await updateSource(id, { tags: newTags });
        setTagInput("");
        setEditingId(null);
    };

    const removeTag = async (item, tagToRemove) => {
        const newTags = item.tags.filter(t => t !== tagToRemove);
        await updateSource(item.id, { tags: newTags });
    }

    const updateSource = async (id, update) => {
        try {
            await knowledgeService.updateResult(id, update);
            loadSources();
        } catch (err) {
            console.error("Update error:", err);
        }
    }

    const removeSource = (id, e) => {
        const row = e.target.closest('tr');
        const rect = row.getBoundingClientRect();
        const yPos = rect.top + (rect.height / 2) - 20;

        setDeletingId(id);

        setTimeout(() => {
            setSources(prev => {
                const index = prev.findIndex(s => s.id === id);
                if (index === -1) return prev;

                const itemToRemove = prev[index];
                const newSources = [...prev];
                newSources.splice(index, 1);

                const timerId = setTimeout(async () => {
                    try {
                        await knowledgeService.deleteResult(id);
                        setUndoState(current => current?.item.id === id ? null : current);
                    } catch (err) {
                        console.error("Remove source error:", err);
                    }
                }, 5000);

                setUndoState({ item: itemToRemove, index, timerId, y: yPos });
                return newSources;
            });
            setDeletingId(null);
        }, 300);
    };

    const undoDelete = () => {
        if (!undoState) return;
        clearTimeout(undoState.timerId);
        setSources(prev => {
            const newSources = [...prev];
            newSources.splice(undoState.index, 0, undoState.item);
            return newSources;
        });
        setUndoState(null);
    };

    const [selectedTags, setSelectedTags] = useState([]);
    const [showFavorites, setShowFavorites] = useState(false);
    const allTags = Array.from(new Set(sources.flatMap(s => s.tags || []))).sort();

    const toggleTagSelect = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    return (
        <div className="h-screen bg-background flex overflow-hidden">
            <main className="flex-1 flex gap-10 items-start w-full h-full pt-24">
                <DashboardSidebar
                    isHistoryOpen={isHistoryOpen}
                    setIsHistoryOpen={setIsHistoryOpen}
                    chats={chats}
                    activeChat={activeChat}
                    setActiveChat={setActiveChat}
                    deleteChat={deleteChat}
                    token={token}
                    username={username}
                    isChatOpen={isChatOpen}
                    setIsChatOpen={setIsChatOpen}
                    chatWidth={chatWidth}
                    setChatWidth={setChatWidth}
                    isResizing={isResizing}
                    setIsResizing={setIsResizing}
                    loadChats={loadChats}
                />

                <KnowledgeTable
                    sources={sources}
                    filter={filter}
                    setFilter={setFilter}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                    showFavorites={showFavorites}
                    setShowFavorites={setShowFavorites}
                    allTags={allTags}
                    toggleTagSelect={toggleTagSelect}
                    deletingId={deletingId}
                    undoDelete={undoDelete}
                    undoState={undoState}
                    toggleFavorite={toggleFavorite}
                    removeSource={removeSource}
                    openNote={openNote}
                    addTag={addTag}
                    removeTag={removeTag}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    tagInput={tagInput}
                    setTagInput={setTagInput}
                />

                <NotePopup
                    activeNote={activeNote}
                    saveNote={saveNote}
                    noteInput={noteInput}
                    setNoteInput={setNoteInput}
                />
            </main>
        </div>
    );
}
