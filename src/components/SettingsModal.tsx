import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { AlertCircle, CheckCircle2, Key, Save, X } from 'lucide-react';
import type { APIKeys } from '../types';

const statusText: Record<string, string> = {
  both: 'Configured via browser key and server env',
  local: 'Configured via browser key only',
  environment: 'Configured via server environment only',
  none: 'Not configured yet',
};

export const SettingsModal = () => {
  const { isSettingsOpen, setIsSettingsOpen, apiKeys, setApiKeys, providerAvailability } = useChat();
  const [localKeys, setLocalKeys] = useState<APIKeys>(apiKeys);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      setLocalKeys(apiKeys);
    }
  }, [apiKeys, isSettingsOpen]);

  if (!isSettingsOpen) {
    return null;
  }

  const handleSave = () => {
    setApiKeys(localKeys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providers = [
    { id: 'pplx', providerId: 'perplexity', name: 'Perplexity API Key', placeholder: 'pplx-...' },
    { id: 'openai', providerId: 'openai', name: 'GPT (OpenAI) API Key', placeholder: 'sk-...' },
    { id: 'anthropic', providerId: 'anthropic', name: 'Claude (Anthropic) API Key', placeholder: 'sk-ant-...' },
    { id: 'gemini', providerId: 'gemini', name: 'Gemini API Key', placeholder: 'AIza...' },
    { id: 'openrouter', providerId: 'openrouter', name: 'OpenRouter API Key', placeholder: 'sk-or-...' },
  ] as const;

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
              <p className="font-medium mb-1">Provider configuration</p>
              <p className="text-indigo-700/80">
                Browser keys stay in local storage. Server environment keys are detected via the new provider-status endpoint and never exposed in full.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {providers.map((provider) => {
              const status = providerAvailability[provider.providerId];

              return (
                <div key={provider.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-start border border-slate-100 rounded-xl p-4">
                  <div className="md:text-right space-y-1">
                    <label className="text-sm font-medium text-slate-700">{provider.name}</label>
                    <div className="flex items-center gap-1.5 md:justify-end text-xs text-slate-500">
                      <CheckCircle2 size={14} className={status.configured ? 'text-emerald-500' : 'text-slate-300'} />
                      <span>{statusText[status.source]}</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <input
                      type="password"
                      value={localKeys[provider.id]}
                      onChange={(event) => setLocalKeys({ ...localKeys, [provider.id]: event.target.value })}
                      placeholder={provider.placeholder}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      {status.supportsWebGrounding
                        ? 'Used for live web-grounded routing when research intent is detected.'
                        : 'Available for model-only tasks or fallback responses when web-grounded routing is unavailable.'}
                    </p>
                  </div>
                </div>
              );
            })}
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
