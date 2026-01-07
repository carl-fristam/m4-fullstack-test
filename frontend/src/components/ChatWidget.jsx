import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as chatService from '../api/chat';

export default function ChatWidget({
    username, isOpen, toggleChat, width, setWidth, isResizing, setIsResizing, isEmbedded = false,
    activeChat, onNewChat, onChatUpdated, onToggleHistory
}) {
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('kb_chat_messages');
        return saved ? JSON.parse(saved) : [];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(() => {
        return localStorage.getItem('kb_chat_session_id');
    });
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [chatType, setChatType] = useState('thesis'); // 'thesis' or 'other'
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (activeChat) {
            setSessionId(activeChat.id);
            const normalizedMessages = (activeChat.messages || []).map(m => ({
                ...m,
                role: m.role === 'assistant' ? 'ai' : m.role,
                text: m.text || m.content || ''
            }));
            setMessages(normalizedMessages);

            // Update chat type based on the active chat's type
            // Map backend types to frontend chatType values
            // Default to 'thesis' for older chats without a type field
            if (activeChat.type === 'research') {
                setChatType('other');
            } else {
                // Default to 'thesis' for 'knowledge_base' or missing type
                setChatType('thesis');
            }

            // Clear localStorage when using activeChat to avoid conflicts
            localStorage.removeItem('kb_chat_messages');
            localStorage.removeItem('kb_chat_session_id');
            localStorage.removeItem('kb_chat_type');
        } else {
            const savedMsgs = localStorage.getItem('kb_chat_messages');
            setMessages(savedMsgs ? JSON.parse(savedMsgs) : []);
            const savedSession = localStorage.getItem('kb_chat_session_id');
            setSessionId(savedSession);
            const savedChatType = localStorage.getItem('kb_chat_type');
            if (savedChatType) {
                setChatType(savedChatType);
            }
        }
    }, [activeChat]);

    // Save to localStorage ONLY when NOT using activeChat
    useEffect(() => {
        if (!activeChat) {
            localStorage.setItem('kb_chat_messages', JSON.stringify(messages));
        }
    }, [messages, activeChat]);

    useEffect(() => {
        if (!activeChat && sessionId) {
            localStorage.setItem('kb_chat_session_id', sessionId);
        }
    }, [sessionId, activeChat]);

    useEffect(() => {
        if (!activeChat) {
            localStorage.setItem('kb_chat_type', chatType);
        }
    }, [chatType, activeChat]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isEmbedded]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            const maxHeight = 200;
            textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        }
    }, [input]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
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
        const currentInput = input;
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        let currentSessionId = sessionId;

        try {
            if (!sessionId) {
                try {
                    // Map frontend chatType to backend session type
                    const sessionType = chatType === 'thesis' ? 'knowledge_base' : 'research';
                    const sessionData = await chatService.createChat(currentInput.substring(0, 50), sessionType);
                    currentSessionId = sessionData.id;
                    setSessionId(currentSessionId);
                } catch (err) {
                    console.error('Failed to create session:', err);
                }
            }

            const aiMessageId = Date.now();
            setMessages(prev => [...prev, { role: 'ai', text: '', id: aiMessageId, sources: [], showSources: false }]);

            const data = await chatService.sendQuery(currentInput, currentSessionId, chatType);

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

            if (onChatUpdated) {
                onChatUpdated();
            }

        } catch (err) {
            console.error(err);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.role === 'ai' && !last.text) {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: `Error: ${err.message}` } : m);
                }
                return [...prev, { role: 'ai', text: `Error: ${err.message}` }];
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setShowTypeModal(true); // Show the modal instead of creating chat immediately
    };

    const confirmNewChat = (type) => {
        setChatType(type); // Store the selected type
        setShowTypeModal(false); // Hide the modal

        if (onNewChat) {
            onNewChat(); // This sets activeChat to null
        }
        const initialMessage = [];
        setMessages(initialMessage);
        setInput('');
        setSessionId(null);
        // Only clear localStorage when creating truly new chat (not switching to existing)
        if (!activeChat) {
            localStorage.removeItem('kb_chat_messages');
            localStorage.removeItem('kb_chat_session_id');
            localStorage.setItem('kb_chat_type', type);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            // Copy as plain text (fallback)
            await navigator.clipboard.writeText(text);
            console.log('Copied to clipboard');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <>
            {/* Toggle button for non-embedded mode */}
            {!isEmbedded && (
                <button
                    onClick={toggleChat}
                    className={`fixed top-1/2 -translate-y-1/2 w-10 h-10 bg-surface border border-border shadow-elevated rounded-xl flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/50 z-[101] ${isOpen ? '' : '-translate-x-5'} ${isResizing ? '' : 'transition-all duration-500'}`}
                    style={{ left: isOpen ? `${width - 20}px` : '0px' }}
                >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Main chat panel */}
            <div
                className={`${isEmbedded ? 'relative h-full rounded-2xl bg-surface border border-border' : 'fixed top-24 left-0 bottom-6 rounded-r-2xl shadow-elevated z-[80] bg-surface border-r border-y border-border'} flex flex-col ${isResizing ? '' : 'transition-all duration-500'} ${isOpen || isEmbedded ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}
                style={{ width: isEmbedded ? '100%' : `${width}px` }}
            >
                {/* Resize handle */}
                {!isEmbedded && (
                    <div
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizing(true);
                            document.body.style.cursor = 'ew-resize';
                        }}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize group z-[90] flex items-center justify-center"
                    >
                        <div className="w-0.5 h-12 bg-border group-hover:bg-primary/50 rounded-full transition-all opacity-0 group-hover:opacity-100" />
                    </div>
                )}

                {/* Header */}
                <div className="p-6 border-border flex justify-between items-center">
                    <div>
                        <h3 className="text-base font-semibold text-text-primary">
                            {activeChat?.title || "Research Assistant"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="status-dot online" />
                            <span className="text-xs text-text-muted">Connected to knowledge base</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onToggleHistory && (
                            <button
                                onClick={onToggleHistory}
                                className="w-9 h-9 flex items-center justify-center bg-surface-light border border-border hover:border-border-light text-text-muted hover:text-text-primary rounded-xl transition-all"
                                title="History"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={handleNewChat}
                            className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-background text-xs font-semibold uppercase tracking-wider rounded-xl transition-all"
                        >
                            New Chat
                        </button>
                    </div>
                </div>

                {/* Messages area */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Top fade */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-surface to-transparent z-10 pointer-events-none" />

                    <div
                        className="h-full overflow-y-auto p-6 space-y-6 scrollbar-hide"
                        ref={scrollRef}
                    >
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex flex-col gap-2 animate-fade-in-up ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                {/* Sender label */}
                                <div className={`flex items-center gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-xs font-medium text-text-muted">
                                        {m.role === 'user' ? username : 'Claude'}
                                    </span>
                                    {m.role === 'ai' && m.text && (
                                        <button
                                            onClick={() => copyToClipboard(m.text)}
                                            className="p-1 text-text-muted hover:text-text-primary transition-colors"
                                            title="Copy"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Message bubble */}
                                <div className={`max-w-[85%] ${m.role === 'ai' ? 'w-full' : ''}`}>
                                    {m.role === 'ai' ? (
                                        <div className="bg-surface-light border border-border rounded-2xl rounded-tl-sm p-5">
                                            {m.text ? (
                                                <div className="prose prose-sm max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-strong:text-text-primary prose-a:text-primary prose-code:text-text-primary prose-code:bg-surface prose-code:px-1 prose-code:rounded">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {m.text}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1.5 h-6 items-center">
                                                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-5 py-4">
                                            <p className="text-sm text-text-primary">{m.text}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface to-transparent z-10 pointer-events-none" />
                </div>

                {/* Floating Input area */}
                <div className="relative p-4">
                    {/* Shadow gradient - creates upward shadow effect */}
                    <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-surface/95 via-surface/50 to-transparent pointer-events-none" />

                    {/* Input container with shadow and conditional primary border */}
                    <div className={`relative bg-surface rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-2 overflow-hidden transition-colors ${isFocused ? 'border-primary' : 'border-border'
                        }`}>
                        {/* Top section - Textarea only */}
                        <div className="bg-surface-light p-4">
                            <textarea
                                ref={textareaRef}
                                autoFocus
                                rows="1"
                                className="w-full px-1 py-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none outline-none focus:outline-none focus:ring-0 border-0"
                                style={{ minHeight: '48px', maxHeight: '200px' }}
                                placeholder="Ask about your research..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                        </div>

                        {/* Bottom section - Chat mode indicator + Send button */}
                        <div className="border-t border-border bg-surface px-4 py-2.5 flex items-center justify-between">
                            {/* Chat mode indicator */}
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${chatType === 'thesis'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-surface-light text-text-muted border border-border'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${chatType === 'thesis' ? 'bg-primary' : 'bg-text-muted'}`} />
                                {chatType === 'thesis' ? 'AML Thesis' : 'General Mode'}
                            </div>

                            {/* Send button */}
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="w-9 h-9 flex items-center justify-center bg-primary hover:bg-primary-dark text-background rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>

                        {/* Chat Type Selection Modal */}
                        {showTypeModal && (
                            <div
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center"
                                onClick={() => setShowTypeModal(false)}
                            >
                                <div
                                    className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-elevated"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                                        Choose Chat Type
                                    </h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => confirmNewChat('thesis')}
                                            className="w-full p-4 bg-primary/10 hover:bg-primary text-primary hover:text-background border border-primary/30 rounded-xl transition-all text-left"
                                        >
                                            <div className="font-semibold">For AML Thesis</div>
                                            <div className="text-sm opacity-80 mt-1">Research assistant with access to your saved papers</div>
                                        </button>
                                        <button
                                            onClick={() => confirmNewChat('other')}
                                            className="w-full p-4 bg-surface-light hover:bg-surface-hover border border-border hover:border-border-light rounded-xl transition-all text-left text-text-primary"
                                        >
                                            <div className="font-semibold">Other Project</div>
                                            <div className="text-sm text-text-muted mt-1">General purpose assistant</div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}


                    </div>
                </div>
            </div>
        </>
    );
}
