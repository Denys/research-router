import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { X, Key, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { APIKeys } from '../types';

export const SettingsModal = () => {
  const { isSettingsOpen, setIsSettingsOpen, apiKeys, setApiKeys } = useChat();
  const [localKeys, setLocalKeys] = useState<APIKeys>(apiKeys);
  const [saved, setSaved] = useState(false);

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    setApiKeys(localKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providers = [
    { id: 'pplx', name: 'Perplexity API Key', placeholder: 'pplx-...' },
    { id: 'openai', name: 'OpenAI API Key', placeholder: 'sk-...' },
    { id: 'anthropic', name: 'Anthropic API Key', placeholder: 'sk-ant-...' },
    { id: 'gemini', name: 'Gemini API Key', placeholder: 'AIza...' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Key size={20} className="text-indigo-600" />
            Provider Settings
          </h2>
          <button 
            onClick={() => setIsSettingsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-800 text-sm">
            <AlertCircle size={20} className="shrink-0 text-indigo-600" />
            <div>
              <p className="font-medium mb-1">API Key Configuration</p>
              <p className="text-indigo-700/80">
                Keys entered here are stored locally in your browser and sent securely to the backend. 
                If left blank, the system will attempt to use environment variables configured on the server.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {providers.map(p => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
                <label className="text-sm font-medium text-slate-700 md:text-right">
                  {p.name}
                </label>
                <div className="md:col-span-2 relative">
                  <input
                    type="password"
                    value={localKeys[p.id as keyof APIKeys]}
                    onChange={(e) => setLocalKeys({ ...localKeys, [p.id]: e.target.value })}
                    placeholder={p.placeholder}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          {saved && (
            <span className="text-emerald-600 text-sm font-medium flex items-center gap-1.5 mr-2">
              <CheckCircle2 size={16} />
              Saved successfully
            </span>
          )}
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
          >
            <Save size={16} />
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
};
