import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import {
  AlertCircle,
  Bot,
  Book,
  CheckCircle2,
  Database,
  FileText,
  Github,
  Globe,
  Loader2,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Square,
  User,
  Users,
  Wand2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import type { Message, SearchSource } from '../types';

const answerBadgeStyles = {
  'web-grounded': 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  'model-only': 'text-slate-700 bg-slate-100 border border-slate-200',
  fallback: 'text-amber-700 bg-amber-50 border border-amber-200',
} as const;

const answerBadgeLabels = {
  'web-grounded': 'Web Grounded',
  'model-only': 'Model Only',
  fallback: 'Fallback',
} as const;

const renderProviderLine = (message: Message) => {
  const requested = message.requestedProvider || message.provider || 'unknown';
  const resolved = message.resolvedProvider || message.provider || requested;

  if (requested === resolved) {
    return resolved;
  }

  return `${requested} -> ${resolved}`;
};

export const ChatPanel = () => {
  const {
    activeConversation,
    sendMessage,
    setIsRightDrawerOpen,
    selectedSources,
    setSelectedSources,
    optimizePrompt,
    isGenerating,
    stopGeneration,
    appendInstruction,
  } = useChat();
  const [input, setInput] = useState('');
  const [instructionInput, setInstructionInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);

  const availableSources: Array<{ id: SearchSource; name: string; icon: React.ElementType }> = [
    { id: 'web', name: 'Web', icon: Globe },
    { id: 'social', name: 'Social', icon: Users },
    { id: 'academic', name: 'Academic', icon: Book },
    { id: 'github', name: 'GitHub', icon: Github },
    { id: 'notebooklm', name: 'NotebookLM', icon: Database },
    { id: 'shopping', name: 'Shopping Research', icon: ShoppingBag },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isSending || isOptimizing) {
      return;
    }

    const content = input;
    setInput('');
    setIsSending(true);
    await sendMessage(content);
    setIsSending(false);
  };

  const handleOptimize = async () => {
    if (!input.trim() || isOptimizing) {
      return;
    }

    setIsOptimizing(true);
    const optimized = await optimizePrompt(input);
    setInput(optimized);
    setIsOptimizing(false);
  };

  const handleAppendInstruction = (event: React.FormEvent) => {
    event.preventDefault();
    if (!instructionInput.trim() || !isGenerating) {
      return;
    }

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
            Ask a question that needs either quick reasoning or live web-backed research. Research modes now surface explicit routing labels for web-grounded, model-only, and fallback answers.
          </p>
          <div className="pt-8 flex flex-col gap-3">
            {[
              'Research the latest GaN power supply controller ICs under 300 W',
              'Summarize recent EU AI Act enforcement developments',
              'Compare STM32H7 vs i.MX RT for low-latency embedded DSP',
            ].map((prompt, index) => (
              <button
                key={index}
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
        {activeConversation.messages.map((message) => (
          <div key={message.id} className={clsx('flex gap-4 max-w-4xl mx-auto', message.role === 'user' ? 'justify-end' : 'justify-start')}>
            {message.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
            )}

            <div
              className={clsx(
                'rounded-2xl px-6 py-4 max-w-[85%] shadow-sm',
                message.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm',
              )}
            >
              {message.role === 'assistant' && (
                <div className="space-y-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {message.answerType === 'web-grounded' ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={14} className={message.answerType === 'fallback' ? 'text-amber-500' : 'text-slate-400'} />
                    )}
                    <span>{renderProviderLine(message)} {message.model && `(${message.model})`}</span>
                    {message.answerType && (
                      <span className={clsx('px-2 py-0.5 rounded-full', answerBadgeStyles[message.answerType])}>
                        {answerBadgeLabels[message.answerType]}
                      </span>
                    )}
                  </div>

                  {message.fallbackReason && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {message.fallbackReason}
                    </div>
                  )}

                  {message.weakGrounding && message.answerType === 'web-grounded' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      This answer is labeled web-grounded, but source coverage was thin. Treat it as weakly grounded until corroborated.
                    </div>
                  )}
                </div>
              )}

              {message.thinking && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking Process
                  </div>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap font-mono">{message.thinking}</div>
                </div>
              )}

              <div className={clsx('prose prose-sm max-w-none', message.role === 'user' ? 'prose-invert' : 'prose-slate')}>
                {message.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Researching...</span>
                  </div>
                )}
              </div>

              {message.citations && message.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <FileText size={14} /> Sources ({message.citations.length})
                    </span>
                    <button onClick={() => setIsRightDrawerOpen(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                      View All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.citations.slice(0, 3).map((citation) => (
                      <a
                        key={citation.id}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs transition-colors border border-slate-200"
                        title={citation.url}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {citation.id}
                        </span>
                        <span className="truncate max-w-[120px]">{citation.domain}</span>
                      </a>
                    ))}
                    {message.citations.length > 3 && (
                      <button
                        onClick={() => setIsRightDrawerOpen(true)}
                        className="inline-flex items-center px-2.5 py-1 bg-slate-50 text-slate-500 rounded-md text-xs border border-slate-200 hover:bg-slate-100"
                      >
                        +{message.citations.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
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
              onChange={(event) => setInput(event.target.value)}
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
                onChange={(event) => setInstructionInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAppendInstruction(event);
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
                  {availableSources.map((source) => {
                    const Icon = source.icon;
                    const isSelected = selectedSources.includes(source.id);
                    return (
                      <label key={source.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              if (selectedSources.length > 1) {
                                setSelectedSources(selectedSources.filter((item) => item !== source.id));
                              }
                            } else {
                              setSelectedSources([...selectedSources, source.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Icon size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-700">{source.name}</span>
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
