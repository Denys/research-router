import React from 'react';
import { useChat } from '../context/ChatContext';
import { X, ExternalLink, FileText, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export const RightDrawer = () => {
  const { isRightDrawerOpen, setIsRightDrawerOpen, activeConversation } = useChat();

  if (!isRightDrawerOpen) return null;

  const lastAssistantMessage = activeConversation?.messages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0];

  const citations = lastAssistantMessage?.citations || [];

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-xl z-20 absolute right-0 top-0 bottom-0 transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={18} className="text-indigo-600" />
          Sources
        </h3>
        <button 
          onClick={() => setIsRightDrawerOpen(false)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {citations.length === 0 ? (
          <div className="text-center text-slate-500 py-8 flex flex-col items-center gap-3">
            <AlertTriangle size={32} className="text-slate-300" />
            <p className="text-sm">No sources available for this response.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {citations.length === 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-amber-800 text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>Only a single source was found. The information may be less reliable.</p>
              </div>
            )}
            
            {citations.map((cit, i) => (
              <a
                key={i}
                href={cit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                    {cit.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                      {cit.title || cit.domain}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1">
                      <ExternalLink size={12} />
                      {cit.url}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      
      {lastAssistantMessage?.provider === 'perplexity' && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <p>Powered by Perplexity Sonar Pro.</p>
          <p className="mt-1">Citations are automatically extracted from the web search results.</p>
        </div>
      )}
    </div>
  );
};
