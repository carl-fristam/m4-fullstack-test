import React from 'react';

export default function ViewToggle({ viewMode, setViewMode }) {
    return (
        <div className="flex p-1 bg-surface-light border border-border rounded-xl mb-4 shrink-0 relative z-20 mx-1">
            <button
                onClick={() => setViewMode('sources')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    viewMode === 'sources'
                        ? 'bg-surface shadow-sm text-primary border border-border'
                        : 'text-text-muted hover:text-text-primary'
                }`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Sources
            </button>
            <button
                onClick={() => setViewMode('canvas')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    viewMode === 'canvas'
                        ? 'bg-surface shadow-sm text-primary border border-border'
                        : 'text-text-muted hover:text-text-primary'
                }`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Canvas
            </button>
        </div>
    );
}
