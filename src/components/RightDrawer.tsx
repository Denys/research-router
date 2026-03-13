import React from 'react';
import { useChat } from '../context/ChatContext';
import { AlertTriangle, ExternalLink, FileText, X } from 'lucide-react';

export const RightDrawer = () => {
  const { isRightDrawerOpen, setIsRightDrawerOpen, activeConversation } = useChat();

  if (!isRightDrawerOpen) {
    return null;
  }

  const lastAssistantMessage = activeConversation?.messages.filter((message) => message.role === 'assistant').slice(-1)[0];
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
            <p className="text-sm">
              {lastAssistantMessage?.answerType === 'model-only'
                ? 'This response was routed as model-only, so no web citations were expected.'
                : lastAssistantMessage?.answerType === 'fallback'
                  ? 'This response used a fallback provider, so live source coverage may be limited.'
                  : 'No sources were returned for this response.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(citations.length === 1 || lastAssistantMessage?.weakGrounding) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-amber-800 text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>Source coverage is thin for this answer. Treat it as weakly grounded until more corroboration is available.</p>
              </div>
            )}

            {citations.map((citation, index) => (
              <a
                key={index}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                    {citation.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                      {citation.title || citation.domain}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1">
                      <ExternalLink size={12} />
                      {citation.url}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {lastAssistantMessage?.resolvedProvider && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 space-y-1">
          <p>Requested provider: {lastAssistantMessage.requestedProvider || lastAssistantMessage.resolvedProvider}</p>
          <p>Resolved provider: {lastAssistantMessage.resolvedProvider}</p>
          {lastAssistantMessage.fallbackReason && <p>{lastAssistantMessage.fallbackReason}</p>}
        </div>
      )}
    </div>
  );
};
