import { useState, useEffect, useCallback } from "react";
import * as chatApi from "../api/chat";
import * as knowledgeService from "../api/knowledge";
import Sidebar from "./exa/Sidebar";
import SearchInput from "./exa/SearchInput";
import SearchResults from "./exa/SearchResults";
import PreviewModal from "./exa/PreviewModal";

export default function ExaShowcase({ token, handleLogout }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [searches, setSearches] = useState([]);
    const [currentSearchId, setCurrentSearchId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [savedItems, setSavedItems] = useState([]);

    // Preview State
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewText, setPreviewText] = useState("");
    const [previewMode, setPreviewMode] = useState("web");
    const [previewExpanded, setPreviewExpanded] = useState(false);
    const [showAllResults, setShowAllResults] = useState(false);

    const selectSearch = useCallback((search) => {
        setCurrentSearchId(search.id);
        sessionStorage.setItem("active_search_id", search.id);
        setQuery(search.title);
        // Searches store results in 'results' list, Exa expects { results: [...] }
        if (search.results && search.results.length > 0) {
            setResults({ results: search.results });
        } else {
            setResults(null);
        }
    }, []);

    const createNewSearch = () => {
        setCurrentSearchId(null);
        setQuery("");
        setResults(null);
        sessionStorage.removeItem("active_search_id");
    };

    const loadSearches = useCallback(async (autoSelectId = null) => {
        try {
            const data = await chatApi.getSessions("search");
            setSearches(data);
            if (autoSelectId) {
                const found = data.find(s => s.id === autoSelectId);
                if (found) selectSearch(found);
            }
        } catch (err) {
            console.error("Failed to load searches", err);
        }
    }, [selectSearch]);

    const loadSavedItems = useCallback(async () => {
        try {
            const data = await knowledgeService.getSavedResults();
            setSavedItems(data);
        } catch (err) {
            console.error("Failed to load saved items", err);
        }
    }, []);

    const deleteSearch = async (e, id) => {
        e.stopPropagation();
        await chatApi.deleteSession(id);
        loadSearches();
        if (currentSearchId === id) createNewSearch();
    };

    useEffect(() => {
        if (token) {
            const savedSearchId = sessionStorage.getItem("active_search_id");
            loadSearches(savedSearchId);
            loadSavedItems();
        }
    }, [token, loadSearches, loadSavedItems]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setShowAllResults(false);

        try {
            // 1. Create search session if needed
            let activeSearchId = currentSearchId;
            if (!activeSearchId) {
                const sessionData = await chatApi.createSession(query, "search");
                activeSearchId = sessionData.id;
                setCurrentSearchId(activeSearchId);
            }

            // 2. Perform Search
            const data = await knowledgeService.searchExa(query);
            setResults(data);

            // 3. Save results to search session
            if (activeSearchId && data.results) {
                await chatApi.updateSessionResults(activeSearchId, data.results);
            }

        } catch (err) {
            setError(err.message || "Search failed");
            if (err.response && err.response.status === 401) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleSave = async (item, savedItem) => {
        try {
            if (savedItem) {
                await knowledgeService.deleteResult(savedItem.id);
                setSavedItems(prev => prev.filter(s => s.id !== savedItem.id));
            } else {
                const payload = {
                    title: item.title,
                    url: item.url,
                    text: item.text,
                    saved_at: new Date().toISOString(),
                    is_favorite: false
                };
                const res = await knowledgeService.saveResult(payload);
                setSavedItems(prev => [...prev, { ...payload, id: res.id, _id: res.id }]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleStarClick = async (item, savedItem) => {
        try {
            if (savedItem) {
                await knowledgeService.updateResult(savedItem.id, { is_favorite: !savedItem.is_favorite });
                setSavedItems(prev => prev.map(s => s.id === savedItem.id ? { ...s, is_favorite: !s.is_favorite } : s));
            } else {
                const payload = {
                    title: item.title,
                    url: item.url,
                    text: item.text,
                    saved_at: new Date().toISOString(),
                    is_favorite: true
                };
                const res = await knowledgeService.saveResult(payload);
                setSavedItems(prev => [...prev, { ...payload, id: res.id, _id: res.id }]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openPreview = (e, url, text) => {
        e.preventDefault();
        setPreviewUrl(url);
        setPreviewText(text || "");
        setPreviewMode("web");
    };

    const closePreview = () => {
        setPreviewUrl(null);
        setPreviewText("");
        setPreviewExpanded(false);
    };

    const togglePreviewSize = () => setPreviewExpanded(!previewExpanded);

    return (
        <div className="flex flex-col h-screen bg-background font-sans overflow-hidden pt-20">
            {/* OVERLAY BACKDROP */}
            {isSidebarOpen && (
                <div
                    className="fixed top-20 left-0 right-0 bottom-0 bg-black/20 backdrop-blur-sm z-[35] transition-opacity duration-500"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    searches={searches}
                    currentSearchId={currentSearchId}
                    selectSearch={selectSearch}
                    deleteSearch={deleteSearch}
                    createNewSearch={createNewSearch}
                />

                <main
                    className={`flex-1 overflow-y-auto bg-background relative transition-all duration-500`}
                    style={previewUrl ? { paddingRight: previewExpanded ? '72vw' : '27vw' } : {}}
                >
                    <SearchInput
                        query={query}
                        setQuery={setQuery}
                        onSearch={handleSearch}
                        loading={loading}
                        currentSearchId={currentSearchId}
                    />

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

                        <SearchResults
                            results={results}
                            showAllResults={showAllResults}
                            setShowAllResults={setShowAllResults}
                            savedItems={savedItems}
                            handleStarClick={handleStarClick}
                            toggleSave={toggleSave}
                            openPreview={openPreview}
                            previewUrl={previewUrl}
                        />
                    </div>
                </main>

                <PreviewModal
                    previewUrl={previewUrl}
                    previewText={previewText}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                    previewExpanded={previewExpanded}
                    togglePreviewSize={togglePreviewSize}
                    closePreview={closePreview}
                />
            </div>
        </div>
    );
}
