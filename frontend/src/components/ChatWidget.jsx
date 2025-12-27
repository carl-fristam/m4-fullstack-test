import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import API_BASE_URL from '../config';

export default function ChatWidget({ token, isOpen, toggleChat, width, setWidth, isResizing, setIsResizing }) {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Ask me anything about your saved sources.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
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
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Add a placeholder AI message for streaming
        const aiMessageId = Date.now();
        setMessages(prev => [...prev, { role: 'ai', text: '', id: aiMessageId, sources: [], showSources: false }]);

        try {
            const response = await fetch(`${API_BASE_URL}/chat-query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question: input })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to fetch');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');

                // Keep the last partial part in the buffer
                buffer = parts.pop() || '';

                for (const line of parts) {
                    if (!line.trim()) continue;

                    if (line.startsWith('metadata:')) {
                        const metadata = JSON.parse(line.replace('metadata:', ''));
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, sources: metadata.sources_used } : msg
                        ));
                    } else if (line.startsWith('content:')) {
                        const text = line.replace('content:', '');
                        aiText += text;

                        // Check for [SHOW_SOURCES] tag
                        let displayText = aiText;
                        let shouldShow = false;
                        if (aiText.includes('[SHOW_SOURCES]')) {
                            shouldShow = true;
                            displayText = aiText.replace('[SHOW_SOURCES]', '').trim();
                        }

                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, text: displayText, showSources: shouldShow || msg.showSources } : msg
                        ));
                    } else if (line.startsWith('error:')) {
                        const error = line.replace('error:', '');
                        setMessages(prev => prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, text: `Error: ${error}` } : msg
                        ));
                    }
                }
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
        setMessages([]);
        setInput('');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <>
            {/* CONSOLIDATED TOGGLE BUTTON (Y-Centered) 
                When closed: it sits on the right edge of the screen like a pull-tab.
                When open: it sits on the left edge of the sidebar.
            */}
            <button
                onClick={toggleChat}
                className={`fixed top-1/2 -translate-y-1/2 w-12 h-12 bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full flex items-center justify-center text-slate-900 overflow-hidden hover:scale-110 active:scale-95 z-[101] group ${isOpen ? '' : 'translate-x-6'} ${isResizing ? '' : 'transition-all duration-500'}`}
                style={{ right: isOpen ? `${width - 24}px` : '0px' }}
            >
                {!isOpen && (
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-900 group-hover:bg-black transition-colors">
                        <svg className={`w-6 h-6 text-white transition-transform duration-500 ${isOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </span>
                )}
                {isOpen && (
                    <svg className={`w-6 h-6 text-slate-900 transition-transform duration-500 ${isOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
                    </svg>
                )}
            </button>

            {/* Sidebar Chat */}
            <div
                className={`fixed top-[12vh] right-0 h-[76vh] bg-white border-l border-slate-100 rounded-l-[40px] shadow-[-30px_0_100px_rgba(0,0,0,0.08)] flex flex-col z-[80] ${isResizing ? '' : 'transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)'} ${isOpen ? 'translate-x-0' : 'translate-x-full opacity-0 pointer-events-none'}`}
                style={{ width: `${width}px` }}
            >
                {/* RESIZE HANDLE */}
                <div
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                        document.body.style.cursor = 'ew-resize';
                    }}
                    className="absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize group z-[90] flex items-center justify-center"
                >
                    <div className="w-1.5 h-16 bg-slate-100 group-hover:bg-slate-300 rounded-full transition-all group-hover:scale-y-125 opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-tl-[40px]">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Chat about sources</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected to Vector DB</p>
                        </div>
                    </div>
                    <button
                        onClick={handleNewChat}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors"
                    >
                        New Chat
                    </button>
                </div>

                {/* Messages Panel with Fade Mask */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Top Fade Mask */}
                    <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>

                    <div
                        className="h-full overflow-y-auto p-8 pt-12 space-y-10 scroll-smooth"
                        ref={scrollRef}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <style>{`
                            div::-webkit-scrollbar { display: none; }
                        `}</style>
                        {messages.map((m, i) => (
                            <div key={i} className="flex flex-col gap-4 animate-fade-in-up">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm ${m.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white'}`}>
                                        {m.role === 'user' ? 'ME' : 'AI'}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                        {m.role === 'user' ? 'Researcher' : 'AI Assistant'}
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

                                <div className={`text-[15px] leading-relaxed text-slate-700 ${m.role === 'ai' ? 'prose prose-slate max-w-none' : ''}`}>
                                    {m.role === 'ai' ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {m.text}
                                        </ReactMarkdown>
                                    ) : (
                                        <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100/50 backdrop-blur-sm text-slate-800 font-medium">
                                            {m.text}
                                        </div>
                                    )}
                                </div>

                                {/* Source Citations */}
                                {m.showSources && m.sources && m.sources.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {m.sources.map((s, si) => (
                                            <div key={si} className="text-[10px] bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-slate-500 font-bold tracking-tight hover:bg-slate-100 transition-colors cursor-default" title={s}>
                                                ⌘ {s.split('/').pop() || s}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 p-4">
                                <div className="flex gap-1.5 h-6 items-center">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Fade Mask */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>
                </div>

                {/* Pill-Shaped Input Area */}
                <div className="p-8 pt-4">
                    <div className="relative group flex items-center">
                        <textarea
                            autoFocus
                            rows="1"
                            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-[30px] outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all text-[15px] resize-none shadow-inner placeholder:text-slate-400 text-slate-700"
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
                            className="absolute right-2 p-3 bg-slate-900 text-white rounded-[25px] shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </div>
                    <div className="mt-6 flex justify-center items-center gap-4 opacity-40">
                        <div className="h-[1px] flex-1 bg-slate-200"></div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Claude Sonnet 4.5</p>
                        <div className="h-[1px] flex-1 bg-slate-200"></div>
                    </div>
                </div>
            </div>
        </>
    );
}