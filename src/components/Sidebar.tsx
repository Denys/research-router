import React from 'react';
import { useChat } from '../context/ChatContext';
import { Plus, Settings, MessageSquare, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export const Sidebar = () => {
  const { conversations, activeConversationId, setActiveConversationId, setIsSettingsOpen, createNewChat, setConversations } = useChat();

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-4">
        <button
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          New Research
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 mt-2">History</div>
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => setActiveConversationId(conv.id)}
            className={clsx(
              "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
              activeConversationId === conv.id ? "bg-slate-800 text-white" : "hover:bg-slate-800/50"
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MessageSquare size={16} className={activeConversationId === conv.id ? "text-indigo-400" : "text-slate-500"} />
              <span className="truncate">{conv.title}</span>
            </div>
            <button
              onClick={(e) => deleteChat(e, conv.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <Settings size={18} className="text-slate-400" />
          Settings
        </button>
      </div>
    </div>
  );
};
