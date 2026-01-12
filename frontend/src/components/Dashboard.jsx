import { useEffect, useState, useCallback } from "react";
import * as knowledgeService from "../api/knowledge";
import * as chatApi from "../api/chat";
import DashboardSidebar from "./dashboard/DashboardSidebar";
import KnowledgeTable from "./dashboard/KnowledgeTable";
import EditorCanvas from "./dashboard/EditorCanvas";
import NotePopup from "./dashboard/NotePopup";

export default function Dashboard({ token, handleLogout, username }) {
    const [sources, setSources] = useState([]);
    const [filter, setFilter] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatWidth, setChatWidth] = useState(() => {
        const saved = localStorage.getItem("dashboard_chat_width");
        return saved ? parseInt(saved, 10) : 450;
    });
    
    useEffect(() => {
        localStorage.setItem("dashboard_chat_width", chatWidth);
    }, [chatWidth]);

    const [isResizing, setIsResizing] = useState(false);

    // View state
    const [viewMode, setViewMode] = useState('sources'); // 'sources' or 'canvas'

    // Tag edit state
    const [editingId, setEditingId] = useState(null);
    const [tagInput, setTagInput] = useState("");

    // Undo / delete animation state
    const [deletingId, setDeletingId] = useState(null);
    const [undoState, setUndoState] = useState(null);

    // Notes state
    const [activeNote, setActiveNote] = useState(null);
    const [noteInput, setNoteInput] = useState("");

    // Conversation history state
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);

    // Load conversations from backend
    const loadConversations = useCallback(async (autoSelectId = null) => {
        if (!token) return;
        try {
            const data = await chatApi.getSessions("conversation");
            setConversations(data);
            if (autoSelectId) {
                const found = data.find(c => c.id === autoSelectId);
                if (found) setActiveConversation(found);
            }
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }, [token]);

    // Delete a conversation
    const deleteConversation = async (e, id) => {
        e.stopPropagation();
        const wasActive = activeConversation?.id === id;
        await chatApi.deleteSession(id);
        if (wasActive) {
            setActiveConversation(null);
        }
        loadConversations();
    };

    // On mount: restore previously active conversation from sessionStorage
    useEffect(() => {
        if (token) {
            const savedId = sessionStorage.getItem("kb_active_conversation_id");
            loadConversations(savedId);
        }
    }, [token, loadConversations]);

    // Persist active conversation ID to sessionStorage
    useEffect(() => {
        if (activeConversation) {
            sessionStorage.setItem("kb_active_conversation_id", activeConversation.id);
        } else {
            sessionStorage.removeItem("kb_active_conversation_id");
        }
    }, [activeConversation]);

    // --- Knowledge sources management ---

    const loadSources = useCallback(async () => {
        if (!token) return;
        try {
            const data = await knowledgeService.getSavedResults();
            const sortedData = data.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));
            setSources(sortedData);
        } catch (err) {
            console.error("Failed to load sources:", err);
            if (err.response?.status === 401) {
                handleLogout();
            }
        }
    }, [token, handleLogout]);

    useEffect(() => {
        loadSources();
    }, [loadSources]);

    const openNote = (s, e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        const spaceRight = window.innerWidth - rect.right;
        const overlayWidth = 280;
        const xPos = spaceRight < overlayWidth
            ? rect.left - overlayWidth + 20
            : rect.right + 10;
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

    // Handle clicking outside to close tag input
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
    };

    const updateSource = async (id, update) => {
        try {
            await knowledgeService.updateResult(id, update);
            loadSources();
        } catch (err) {
            console.error("Update error:", err);
        }
    };

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
            <main className="flex-1 flex items-start w-full h-full pt-24">
                <DashboardSidebar
                    isHistoryOpen={isHistoryOpen}
                    setIsHistoryOpen={setIsHistoryOpen}
                    conversations={conversations}
                    activeConversation={activeConversation}
                    setActiveConversation={setActiveConversation}
                    deleteConversation={deleteConversation}
                    username={username}
                    isChatOpen={isChatOpen}
                    setIsChatOpen={setIsChatOpen}
                    chatWidth={chatWidth}
                    setChatWidth={setChatWidth}
                    isResizing={isResizing}
                    setIsResizing={setIsResizing}
                    loadConversations={loadConversations}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />

                {/* Resize Handle / Spacer */}
                <div
                    className="w-8 h-full flex flex-col justify-center items-center cursor-ew-resize group/resizer transition-colors shrink-0"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                        document.body.style.cursor = 'ew-resize';
                    }}
                >
                    <div className="w-1 h-8 bg-border rounded-full group-hover/resizer:bg-primary transition-colors" />
                </div>

                {viewMode === 'sources' ? (
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
                ) : (
                    <EditorCanvas />
                )}

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
