import React from "react";

export default function Sidebar({
    isOpen,
    setIsOpen,
    chats,
    currentChatId,
    selectChat,
    deleteChat,
    createNewChat
}) {
    return (
        <>
            {/* Sidebar */}
            <aside className={`fixed left-0 top-28 bottom-100 w-72 bg-surface/95 backdrop-blur-xl flex flex-col z-40 transition-transform duration-500 rounded-r-3xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Header */}
                <div className="p-4 space-y-3">
                    <button
                        onClick={createNewChat}
                        className="w-full py-3.5 bg-primary text-background font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-glow-primary"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Research
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full py-2 bg-surface-light hover:bg-surface-hover text-text-muted hover:text-text-primary text-xs font-medium uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                        Collapse
                    </button>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 scrollbar-hide">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-3 mb-2">History</p>

                    {chats.length === 0 && (
                        <div className="px-3 py-6 text-center">
                            <p className="text-xs text-text-muted">No searches yet</p>
                        </div>
                    )}

                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => selectChat(chat)}
                            className={`group relative p-4 rounded-xl cursor-pointer transition-all border ${currentChatId === chat.id
                                ? "bg-primary/10 border-primary/30"
                                : "border-transparent hover:bg-surface-light hover:border-border"
                                }`}
                        >
                            <div className={`font-medium text-sm truncate pr-6 ${currentChatId === chat.id ? "text-primary" : "text-text-primary"
                                }`}>
                                {chat.title || "Untitled Search"}
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                                {new Date(chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>

                            <button
                                onClick={(e) => deleteChat(e, chat.id)}
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

            {/* Toggle button when collapsed */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed left-4 top-28 z-50 w-10 h-10 bg-surface border border-border shadow-elevated rounded-xl flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/50 transition-all"
                    title="Open sidebar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </>
    );
}
