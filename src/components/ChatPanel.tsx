import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Send, User, Bot, Loader2, AlertCircle, FileText, CheckCircle2, Search, Wand2, Globe, Github, Book, Users, Database, ShoppingBag, Square, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { SearchSource } from '../types';

export const ChatPanel = () => {
  const { activeConversation, sendMessage, setIsRightDrawerOpen, selectedSources, setSelectedSources, optimizePrompt, isGenerating, stopGeneration, appendInstruction } = useChat();
  const [input, setInput] = useState('');
  const [instructionInput, setInstructionInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);

  const availableSources: { id: SearchSource, name: string, icon: React.ElementType }[] = [
    { id: 'web', name: 'Web', icon: Globe },
    { id: 'social', name: 'Social', icon: Users },
    { id: 'academic', name: 'Academic', icon: Book },
    { id: 'github', name: 'GitHub', icon: Github },
    { id: 'notebooklm', name: 'NotebookLM', icon: Database },
    { id: 'shopping', name: 'Shopping Research', icon: ShoppingBag },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourcesRef.current && !sourcesRef.current.contains(event.target as Node)) {
        setIsSourcesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || isOptimizing) return;
    
    const content = input;
    setInput('');
    setIsSending(true);
    await sendMessage(content);
    setIsSending(false);
  };

  const handleOptimize = async () => {
    if (!input.trim() || isOptimizing) return;
    setIsOptimizing(true);
    const optimized = await optimizePrompt(input);
    setInput(optimized);
    setIsOptimizing(false);
  };

  const handleAppendInstruction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructionInput.trim() || !isGenerating) return;
    appendInstruction(instructionInput);
    setInstructionInput('');
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Search size={32} />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">Research Router</h2>
          <p className="text-slate-500">
            Ask a complex question to start deep web research. The system will automatically route to Perplexity Sonar Pro for current events and factual queries.
          </p>
          <div className="pt-8 flex flex-col gap-3">
            {[
              "Research the latest GaN power supply controller ICs under 300 W",
              "Summarize recent EU AI Act enforcement developments",
              "Compare STM32H7 vs i.MX RT for low-latency embedded DSP"
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(prompt);
                  document.getElementById('chat-input')?.focus();
                }}
                className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all text-sm text-slate-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
        {activeConversation.messages.map((msg, index) => (
          <div key={msg.id} className={clsx("flex gap-4 max-w-4xl mx-auto", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
            )}
            
            <div className={clsx(
              "rounded-2xl px-6 py-4 max-w-[85%] shadow-sm",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-sm" 
                : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
            )}>
              {msg.role === 'assistant' && msg.provider && (
                <div className="flex items-center gap-2 mb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {msg.grounded ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-amber-500" />}
                  <span>{msg.provider} {msg.model && `(${msg.model})`}</span>
                  {msg.grounded ? <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Web Grounded</span> : <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Model Only</span>}
                </div>
              )}

              {msg.thinking && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking Process
                  </div>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap font-mono">
                    {msg.thinking}
                  </div>
                </div>
              )}
              
              <div className={clsx("prose prose-sm max-w-none", msg.role === 'user' ? "prose-invert" : "prose-slate")}>
                {msg.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Researching...</span>
                  </div>
                )}
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <FileText size={14} /> Sources ({msg.citations.length})
                    </span>
                    <button 
                      onClick={() => setIsRightDrawerOpen(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.slice(0, 3).map((cit, i) => (
                      <a 
                        key={i} 
                        href={cit.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs transition-colors border border-slate-200"
                        title={cit.url}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {cit.id}
                        </span>
                        <span className="truncate max-w-[120px]">{cit.domain}</span>
                      </a>
                    ))}
                    {msg.citations.length > 3 && (
                      <button 
                        onClick={() => setIsRightDrawerOpen(true)}
                        className="inline-flex items-center px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md text-xs border border-slate-200 hover:bg-slate-100"
                      >
                        +{msg.citations.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative bg-white border border-slate-300 rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or start research..."
              className="w-full bg-transparent text-slate-800 pl-6 pr-28 py-4 focus:outline-none"
              disabled={isSending || isOptimizing}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleOptimize}
                disabled={!input.trim() || isSending || isOptimizing || isGenerating}
                title="Pump my Prompt"
                className="w-10 h-10 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:text-slate-300 disabled:hover:bg-transparent rounded-xl flex items-center justify-center transition-colors"
              >
                {isOptimizing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              </button>
              {isGenerating ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                  title="Stop Generation"
                >
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isSending || isOptimizing}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
                </button>
              )}
            </div>
          </div>
          
          {isGenerating && (
            <div className="mt-3 relative bg-white border border-indigo-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <input
                type="text"
                value={instructionInput}
                onChange={(e) => setInstructionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAppendInstruction(e);
                  }
                }}
                placeholder="Add instructions while thinking..."
                className="w-full bg-transparent text-sm text-slate-800 pl-4 pr-12 py-2.5 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAppendInstruction}
                disabled={!instructionInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-100 hover:bg-indigo-200 disabled:bg-slate-100 text-indigo-600 disabled:text-slate-400 rounded-lg flex items-center justify-center transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <div className="relative" ref={sourcesRef}>
              <button
                type="button"
                onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Globe size={14} />
                Sources ({selectedSources.length})
              </button>
              
              {isSourcesOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    Search Sources
                  </div>
                  {availableSources.map(s => {
                    const Icon = s.icon;
                    const isSelected = selectedSources.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              if (selectedSources.length > 1) {
                                setSelectedSources(selectedSources.filter(src => src !== s.id));
                              }
                            } else {
                              setSelectedSources([...selectedSources, s.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Icon size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-700">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
