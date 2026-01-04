import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import API_BASE_URL from '../config';

export default function ChatWidget({
    username, token, isOpen, toggleChat, width, setWidth, isResizing, setIsResizing, isEmbedded = false,
    activeChat, onNewChat, onChatUpdated, onToggleHistory
}) {
    const [messages, setMessages] = useState(() => {
        // Load from localStorage on mount (unless activeChat overrides)
        const saved = localStorage.getItem('kb_chat_messages');
        return saved ? JSON.parse(saved) : [{ role: 'ai', text: 'Ask me anything about your saved sources.' }];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(() => {
        return localStorage.getItem('kb_chat_session_id');
    });
    const [expandedMessages, setExpandedMessages] = useState(new Set());
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);

    // Sync with activeChat prop
    useEffect(() => {
        if (activeChat) {
            setSessionId(activeChat.id);
            // Normalize messages for legacy support (role: assistant -> ai, content -> text)
            const normalizedMessages = (activeChat.messages || []).map(m => ({
                ...m,
                role: m.role === 'assistant' ? 'ai' : m.role,
                text: m.text || m.content || ''
            }));
            setMessages(normalizedMessages);
        } else {
            // Restore from localStorage if activeChat is cleared (Back to New/Draft)
            const savedMsgs = localStorage.getItem('kb_chat_messages');
            setMessages(savedMsgs ? JSON.parse(savedMsgs) : [{ role: 'ai', text: 'Ask me anything about your saved sources.' }]);

            const savedSession = localStorage.getItem('kb_chat_session_id');
            setSessionId(savedSession);
        }
    }, [activeChat]);

    // Save messages to localStorage
    useEffect(() => {
        if (!activeChat) { // Only save to default local storage if NOT viewing a specific history item? Or always save?
            // If viewing history, we don't want to overwrite "current draft" in localStorage maybe?
            // Or maybe we treat "current active" as what's in local storage.
            localStorage.setItem('kb_chat_messages', JSON.stringify(messages));
        }
    }, [messages, activeChat]);

    // Save session ID
    useEffect(() => {
        if (!activeChat && sessionId) {
            localStorage.setItem('kb_chat_session_id', sessionId);
        }
    }, [sessionId, activeChat]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isEmbedded]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            const maxHeight = 200; // ~10 lines max
            textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }
    }, [input]);

    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            // Constrain width between 450px and 900px
            if (newWidth >= 450 && newWidth <= 900) {
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, setWidth, setIsResizing]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', text: input };
        const currentInput = input;  // Save input before clearing
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Create session if doesn't exist
        let currentSessionId = sessionId;
        let isNewSession = false;

        if (!sessionId) {
            try {
                const sessionResponse = await fetch(`${API_BASE_URL}/chats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: currentInput.substring(0, 50),
                        last_message: currentInput,
                        type: 'knowledge_base'
                    })
                });
                const sessionData = await sessionResponse.json();
                currentSessionId = sessionData.id;
                setSessionId(currentSessionId);
                isNewSession = true;
                console.log('Created new session:', currentSessionId);
            } catch (err) {
                console.error('Failed to create session:', err);
            }
        }

        // Add placeholder
        const aiMessageId = Date.now();
        setMessages(prev => [...prev, { role: 'ai', text: '', id: aiMessageId, sources: [], showSources: false }]);

        try {
            const response = await fetch(`${API_BASE_URL}/chat-query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: currentInput,
                    session_id: currentSessionId
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to fetch');
            }

            const data = await response.json();

            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId
                    ? {
                        ...msg,
                        text: data.response.replace('[SHOW_SOURCES]', '').trim(),
                        sources: data.sources_used || [],
                        showSources: data.response.includes('[SHOW_SOURCES]')
                    }
                    : msg
            ));

            // Notify parent to refresh list if new session or updated
            if (onChatUpdated) {
                onChatUpdated();
            }

        } catch (err) {
            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, text: `Error: ${err.message}` } : msg
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        if (onNewChat) {
            onNewChat(); // Tell parent to clear activeChat
        }
        const initialMessage = [{ role: 'ai', text: 'Ask me anything about your saved sources.' }];
        setMessages(initialMessage);
        setInput('');
        setSessionId(null);
        localStorage.removeItem('kb_chat_messages');
        localStorage.removeItem('kb_chat_session_id');
        console.log('Started new chat session');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <>
            {!isEmbedded && (
                <button
                    onClick={toggleChat}
                    className={`fixed top-1/2 -translate-y-1/2 w-12 h-12 bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full flex items-center justify-center text-slate-900 overflow-hidden hover:scale-110 active:scale-95 z-[101] group ${isOpen ? '' : '-translate-x-6'} ${isResizing ? '' : 'transition-all duration-500'}`}
                    style={{ left: isOpen ? `${width - 24}px` : '0px' }}
                >
                    {!isOpen && (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900 group-hover:bg-black transition-colors">
                            <svg className={`w-6 h-6 text-white transition-transform duration-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </span>
                    )}
                    {isOpen && (
                        <svg className={`w-6 h-6 text-slate-900 transition-transform duration-500 rotate-180`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                        </svg>
                    )}
                </button>
            )}

            {/* Sidebar Chat */}
            <div
                className={`${isEmbedded ? 'relative h-full rounded-[40px] bg-background' : 'fixed top-[12vh] left-0 h-[76vh] rounded-r-[40px] shadow-[30px_0_100px_rgba(0,0,0,0.3)] z-[80] bg-surface border-r border-border'} flex flex-col ${isResizing ? '' : 'transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)'} ${isOpen || isEmbedded ? 'translate-x-0' : '-translate-x-full opacity-0 pointer-events-none'}`}
                style={{ width: isEmbedded ? '100%' : `${width}px` }}
            >
                {/* RESIZE HANDLE */}
                <div
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                        document.body.style.cursor = 'ew-resize';
                    }}
                    className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize group z-[90] flex items-center justify-center"
                >
                    <div className="w-1.5 h-16 bg-slate-100 group-hover:bg-slate-300 rounded-full transition-all group-hover:scale-y-125 opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* Header */}
                <div className={`p-8 pb-4 flex justify-between items-center rounded-tr-[40px] ${isEmbedded ? '' : 'bg-surface/50 backdrop-blur-sm'}`}>
                    <div>
                        <h3 className="text-xl text-primary-light font-bold tracking-tight">Chat about sources</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected to Vector DB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* History Toggle */}
                        <button
                            onClick={onToggleHistory}
                            className="w-8 h-8 flex items-center justify-center bg-surface-light border border-border hover:border-border-light text-slate-500 hover:text-slate-200 rounded-full transition-all text-xs"
                            title="History"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                        {/* New Chat Button */}
                        <button
                            onClick={handleNewChat}
                            className="px-8 py-2 bg-surface-light hover:bg-primary text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-widest rounded-full transition-all shadow-sm hover:shadow-md min-w-[140px]"
                        >
                            New Chat
                        </button>
                    </div>
                </div>

                {/* Messages Panel with Fade Mask */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Top Fade Mask */}
                    <div className={`absolute top-0 left-0 right-0 h-12 bg-gradient-to-b ${isEmbedded ? 'from-background' : 'from-surface'} to-transparent z-10 pointer-events-none`}></div>

                    <div
                        className="h-full overflow-y-auto p-8 pt-12 space-y-10 scroll-smooth"
                        ref={scrollRef}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <style>{`
                            div::-webkit-scrollbar { display: none; }
                        `}</style>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col gap-2 animate-fade-in-up ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-center gap-3 w-full ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                        {m.role === 'user' ? username : 'Claude'}
                                    </span>
                                    {m.role === 'ai' && m.text && (
                                        <button
                                            onClick={() => copyToClipboard(m.text)}
                                            className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <div className={`text-[15px] leading-relaxed w-fit max-w-[90%] ${m.role === 'ai' ? 'prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-strong:font-bold prose-strong:text-slate-100 prose-ul:list-disc prose-ol:list-decimal prose-li:my-1' : 'text-slate-200'}`}>
                                    {m.role === 'ai' ? (
                                        <div className="bg-surface p-6 rounded-[28px] rounded-tl-sm border border-border shadow-sm shadow-black/20">
                                            <style>{`
                                                .markdown-content {
                                                    color: #cbd5e1;
                                                }
                                                .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                                                    font-weight: 700;
                                                    color: #f1f5f9;
                                                    margin-top: 1.25rem;
                                                    margin-bottom: 0.75rem;
                                                }
                                                .markdown-content h1 { font-size: 1.5rem; }
                                                .markdown-content h2 { font-size: 1.25rem; }
                                                .markdown-content h3 { font-size: 1.1rem; }
                                                .markdown-content strong, .markdown-content b {
                                                    font-weight: 700;
                                                    color: #f1f5f9;
                                                }
                                                .markdown-content em, .markdown-content i {
                                                    font-style: italic;
                                                    color: #e2e8f0;
                                                }
                                                .markdown-content a {
                                                    color: #818cf8;
                                                    text-decoration: underline;
                                                }
                                                .markdown-content a:hover {
                                                    color: #a5b4fc;
                                                }
                                                .markdown-content code {
                                                    background-color: #334155;
                                                    color: #e2e8f0;
                                                    padding: 0.2rem 0.4rem;
                                                    border-radius: 0.25rem;
                                                    font-size: 0.875em;
                                                    font-family: 'Courier New', monospace;
                                                }
                                                .markdown-content pre {
                                                    background-color: #1e293b;
                                                    border: 1px solid #475569;
                                                    border-radius: 0.5rem;
                                                    padding: 1rem;
                                                    overflow-x: auto;
                                                    margin: 1rem 0;
                                                }
                                                .markdown-content pre code {
                                                    background-color: transparent;
                                                    padding: 0;
                                                    color: #cbd5e1;
                                                }
                                                .markdown-content ol {
                                                    list-style-type: decimal;
                                                    padding-left: 1.5rem;
                                                    margin: 0.75rem 0;
                                                    color: #cbd5e1;
                                                }
                                                .markdown-content ul {
                                                    list-style-type: disc;
                                                    padding-left: 1.5rem;
                                                    margin: 0.75rem 0;
                                                    color: #cbd5e1;
                                                }
                                                .markdown-content li {
                                                    margin: 0.25rem 0;
                                                }
                                                .markdown-content p {
                                                    margin: 0.5rem 0;
                                                    color: #cbd5e1;
                                                }
                                                .markdown-content blockquote {
                                                    border-left: 3px solid #475569;
                                                    padding-left: 1rem;
                                                    margin: 1rem 0;
                                                    color: #94a3b8;
                                                    font-style: italic;
                                                }
                                                .markdown-content table {
                                                    border-collapse: collapse;
                                                    width: 100%;
                                                    margin: 1rem 0;
                                                }
                                                .markdown-content th, .markdown-content td {
                                                    border: 1px solid #475569;
                                                    padding: 0.5rem;
                                                    text-align: left;
                                                }
                                                .markdown-content th {
                                                    background-color: #334155;
                                                    color: #f1f5f9;
                                                    font-weight: 600;
                                                }
                                                .markdown-content hr {
                                                    border: none;
                                                    border-top: 1px solid #475569;
                                                    margin: 1.5rem 0;
                                                }
                                            `}</style>
                                            <div className="markdown-content">
                                                {m.text ? (
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {m.text}
                                                    </ReactMarkdown>
                                                ) : (
                                                    <div className="flex gap-1.5 h-6 items-center">
                                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-surface-light/80 p-5 rounded-[24px] rounded-tr-sm border border-border backdrop-blur-sm text-slate-100 font-medium">
                                            {(() => {
                                                const MAX_CHARS = 600; // Show ~600 characters before truncating
                                                const isLong = m.text.length > MAX_CHARS;
                                                const isExpanded = expandedMessages.has(i);
                                                const displayText = (isLong && !isExpanded)
                                                    ? m.text.substring(0, MAX_CHARS) + '...'
                                                    : m.text;

                                                return (
                                                    <div>
                                                        <div className="whitespace-pre-wrap">{displayText}</div>
                                                        {isLong && (
                                                            <button
                                                                onClick={() => {
                                                                    const newExpanded = new Set(expandedMessages);
                                                                    if (isExpanded) {
                                                                        newExpanded.delete(i);
                                                                    } else {
                                                                        newExpanded.add(i);
                                                                    }
                                                                    setExpandedMessages(newExpanded);
                                                                }}
                                                                className="mt-2 text-xs text-primary-light hover:text-primary font-bold inline-flex items-center gap-1"
                                                            >
                                                                {isExpanded ? (
                                                                    <>
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
                                                                        </svg>
                                                                        Show Less
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Show More
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                                                        </svg>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Fade Mask */}
                    <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${isEmbedded ? 'from-background' : 'from-surface'} to-transparent z-10 pointer-events-none`}></div>
                </div>

                {/* Pill-Shaped Input Area */}
                <div className="p-8 pt-4">
                    <div className="relative group flex items-end">
                        <textarea
                            ref={textareaRef}
                            autoFocus
                            rows="1"
                            className="w-full pl-6 pr-14 py-4 bg-surface-light border border-border rounded-[30px] outline-primary outline-offset-0 transition-all text-[14px] resize-none shadow-xl shadow-black/20 placeholder:text-slate-500 text-slate-100 overflow-y-auto"
                            style={{ minHeight: '52px', maxHeight: '200px' }}
                            placeholder="Ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="absolute right-2 bottom-2 p-3 bg-primary text-white rounded-[25px] shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </div>
                    <div className="mt-6 flex justify-center items-center gap-4 opacity-40">
                        <div className="h-[1px] flex-1 bg-border"></div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Claude Sonnet 4.5</p>
                        <div className="h-[1px] flex-1 bg-border"></div>
                    </div>
                </div>
            </div>
        </>
    );
}