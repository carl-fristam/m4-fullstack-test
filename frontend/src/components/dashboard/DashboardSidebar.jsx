import ChatWidget from "../ChatWidget";
import ViewToggle from "./ViewToggle";

export default function DashboardSidebar({
    isHistoryOpen,
    setIsHistoryOpen,
    conversations,
    activeConversation,
    setActiveConversation,
    deleteConversation,
    username,
    isChatOpen,
    setIsChatOpen,
    chatWidth,
    setChatWidth,
    isResizing,
    setIsResizing,
    loadConversations,
    viewMode,
    setViewMode
}) {
    const handleNewConversation = () => {
        setActiveConversation(null);
        setIsHistoryOpen(false);
    };

    return (
        <div 
            className="h-full flex flex-col pt-6 pb-6 pl-6 relative group/sidebar"
            style={{ width: chatWidth, minWidth: 450, maxWidth: 900, flexShrink: 0 }}
        >
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            {/* Overlay backdrop */}
            {isHistoryOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-500"
                    onClick={() => setIsHistoryOpen(false)}
                />
            )}

            {/* History sidebar */}
            <aside className={`fixed left-0 top-28 bottom-100 w-72 bg-surface/95 backdrop-blur-xl flex flex-col z-40 transition-transform duration-500 rounded-r-3xl ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 space-y-3">
                    <button
                        onClick={handleNewConversation}
                        className="w-full py-3.5 bg-primary text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-glow-primary"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Chat
                    </button>
                    <button
                        onClick={() => setIsHistoryOpen(false)}
                        className="w-full py-2 bg-surface-light hover:bg-surface-hover text-text-muted hover:text-text-primary text-xs font-medium uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                        Collapse
                    </button>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 scrollbar-hide">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-3 mb-2">History</p>

                    {conversations.length === 0 && (
                        <div className="px-3 py-6 text-center">
                            <p className="text-xs text-text-muted">No conversations yet</p>
                        </div>
                    )}

                    {conversations.map(conversation => (
                        <div
                            key={conversation.id}
                            onClick={() => setActiveConversation(conversation)}
                            className={`group relative p-4 rounded-xl cursor-pointer transition-all border ${activeConversation?.id === conversation.id
                                ? "bg-primary/10 border-primary/30"
                                : "border-transparent hover:bg-surface-light hover:border-border"
                                }`}
                        >
                            <div className={`font-medium text-sm truncate pr-6 ${activeConversation?.id === conversation.id ? "text-primary" : "text-text-primary"}`}>
                                {conversation.title || "Untitled Chat"}
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                                {new Date(conversation.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>

                            <button
                                onClick={(e) => deleteConversation(e, conversation.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-text-muted hover:text-accent-coral hover:bg-accent-coral/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Embedded ChatWidget */}
            <ChatWidget
                username={username}
                isOpen={isChatOpen}
                toggleChat={() => setIsChatOpen(!isChatOpen)}
                width={chatWidth}
                setWidth={setChatWidth}
                setIsResizing={setIsResizing}
                isResizing={isResizing}
                isEmbedded={true}
                activeConversation={activeConversation}
                onNewConversation={() => setActiveConversation(null)}
                onConversationUpdated={loadConversations}
                onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
            />
        </div>
    );
}
