import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Provider, Mode } from '../types';
import { Settings, ChevronDown, Zap, BookOpen, Search, Scale, Check, Info } from 'lucide-react';
import clsx from 'clsx';

export const TopControls = () => {
  const { 
    selectedProviders, setSelectedProviders, 
    selectedModels, setSelectedModels,
    defaultMode, setDefaultMode, 
    setIsSettingsOpen,
    extendedThinking, setExtendedThinking
  } = useChat();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const providers: { id: Provider, name: string, models: string[], advice: string }[] = [
    { 
      id: 'perplexity', 
      name: 'Perplexity', 
      models: ['sonar-pro', 'sonar', 'sonar-reasoning-pro'],
      advice: 'Best for real-time web research, current events, and citing sources.' 
    },
    { 
      id: 'openai', 
      name: 'OpenAI', 
      models: ['gpt-5.4-thinking', 'gpt-5.3-instant', 'gpt-5.2-thinking', 'gpt-5.2-instant'],
      advice: 'Best for general reasoning, coding, formatting, and complex logic.' 
    },
    { 
      id: 'anthropic', 
      name: 'Anthropic', 
      models: ['claude-4.6-sonnet', 'claude-4.6-opus', 'claude-4.5-haiku'],
      advice: 'Best for deep analysis, creative writing, and large context windows.' 
    },
    { 
      id: 'gemini', 
      name: 'Gemini', 
      models: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash'],
      advice: 'Best for fast multimodal tasks, document analysis, and Google ecosystem integration.' 
    },
  ];

  const toggleProvider = (providerId: Provider) => {
    if (selectedProviders.includes(providerId)) {
      if (selectedProviders.length > 1) {
        setSelectedProviders(selectedProviders.filter(p => p !== providerId));
      }
    } else {
      setSelectedProviders([...selectedProviders, providerId]);
    }
  };

  const setModel = (providerId: Provider, model: string) => {
    setSelectedModels(prev => ({ ...prev, [providerId]: model }));
  };

  const modes: { id: Mode, name: string, icon: React.ElementType }[] = [
    { id: 'Quick Answer', name: 'Quick Answer', icon: Zap },
    { id: 'Research', name: 'Research', icon: BookOpen },
    { id: 'Deep Research', name: 'Deep Research', icon: Search },
    { id: 'Compare Sources', name: 'Compare Sources', icon: Scale },
  ];

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm z-10">
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-4 pr-3 rounded-xl focus:outline-none hover:bg-slate-100 transition-colors font-medium text-sm"
          >
            {selectedProviders.length === 1 
              ? providers.find(p => p.id === selectedProviders[0])?.name 
              : `${selectedProviders.length} Providers Selected`}
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Info size={14} />
                Select multiple for parallel search
              </div>
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {providers.map(p => {
                  const isSelected = selectedProviders.includes(p.id);
                  return (
                    <div key={p.id} className={clsx("p-3 rounded-lg border transition-all", isSelected ? "border-indigo-200 bg-indigo-50/50" : "border-transparent hover:bg-slate-50")}>
                      <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleProvider(p.id)}>
                        <div className="flex items-center gap-2">
                          <div className={clsx("w-4 h-4 rounded flex items-center justify-center border", isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white")}>
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className="font-medium text-sm text-slate-800">{p.name}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-500 mb-3 ml-6">{p.advice}</p>
                      
                      {isSelected && (
                        <div className="ml-6 mt-2 space-y-3">
                          <select
                            value={selectedModels[p.id]}
                            onChange={(e) => setModel(p.id, e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 text-slate-700 py-1.5 px-2 rounded-lg focus:outline-none focus:border-indigo-400"
                          >
                            {p.models.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          
                          {((p.id === 'openai' && selectedModels[p.id]?.includes('thinking')) || p.id === 'anthropic') && (
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-700">Extended thinking</span>
                                <span className="text-[10px] text-slate-500">Think longer for complex tasks</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExtendedThinking(!extendedThinking)}
                                className={clsx(
                                  "relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
                                  extendedThinking ? "bg-indigo-600" : "bg-slate-200"
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={clsx(
                                    "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                    extendedThinking ? "translate-x-4" : "translate-x-0"
                                  )}
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {modes.map(mode => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setDefaultMode(mode.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  defaultMode === mode.id 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                <Icon size={16} />
                {mode.name}
              </button>
            );
          })}
        </div>
      </div>
      
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};
