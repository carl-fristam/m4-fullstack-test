import React from "react";

export default function SearchInput({
    query,
    setQuery,
    onSearch,
    loading,
    currentSearchId
}) {
    return (
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="text-center mb-6">
                    {currentSearchId && query ? (
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Active Session</p>
                    ) : null}
                    <h1 className="font-display text-display-lg text-text-primary">
                        {currentSearchId && query ? query : "Research Papers"}
                    </h1>
                    {!currentSearchId && (
                        <p className="text-sm text-text-muted mt-2">Search academic papers with AI-powered discovery</p>
                    )}
                </div>

                <form onSubmit={onSearch} className="flex gap-3">
                    <div className="flex-1 relative">
                        <input
                            autoFocus
                            className="w-full bg-surface border border-border text-text-primary px-6 py-4 pr-12 rounded-2xl text-base placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all shadow-card"
                            placeholder="Describe what you're researching..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <svg className="w-5 h-5 text-text-muted absolute right-5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="px-8 py-4 bg-primary text-background font-bold text-sm uppercase tracking-wider rounded-2xl hover:bg-primary-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow-primary"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        ) : (
                            "Search"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
