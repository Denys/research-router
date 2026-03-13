import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, Provider, Mode, APIKeys, SearchSource } from '../types';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | undefined;
  apiKeys: APIKeys;
  selectedProviders: Provider[];
  selectedModels: Record<Provider, string>;
  selectedSources: SearchSource[];
  defaultMode: Mode;
  isSettingsOpen: boolean;
  isRightDrawerOpen: boolean;
  extendedThinking: boolean;
  shoppingResearch: boolean;
  anthropicThinkingBudget: number;
  isGenerating: boolean;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setActiveConversationId: (id: string | null) => void;
  setApiKeys: React.Dispatch<React.SetStateAction<APIKeys>>;
  setSelectedProviders: (providers: Provider[]) => void;
  setSelectedModels: React.Dispatch<React.SetStateAction<Record<Provider, string>>>;
  setSelectedSources: (sources: SearchSource[]) => void;
  setDefaultMode: (mode: Mode) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsRightDrawerOpen: (isOpen: boolean) => void;
  setExtendedThinking: (value: boolean) => void;
  setShoppingResearch: (value: boolean) => void;
  setAnthropicThinkingBudget: (value: number) => void;
  createNewChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  updateMessage: (convId: string, msgId: string, updates: Partial<Message>) => void;
  optimizePrompt: (content: string) => Promise<string>;
  stopGeneration: () => void;
  appendInstruction: (instruction: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [apiKeys, setApiKeys] = useState<APIKeys>(() => {
    const saved = localStorage.getItem('apiKeys');
    return saved ? JSON.parse(saved) : { pplx: '', openai: '', anthropic: '', gemini: '' };
  });

  const [selectedProviders, setSelectedProviders] = useState<Provider[]>(['perplexity']);
  const [selectedModels, setSelectedModels] = useState<Record<Provider, string>>({
    perplexity: 'sonar-pro',
    openai: 'gpt-5.4-thinking',
    anthropic: 'claude-4.6-sonnet',
    gemini: 'gemini-3.1-pro-preview'
  });
  const [selectedSources, setSelectedSources] = useState<SearchSource[]>(['web']);
  const [defaultMode, setDefaultMode] = useState<Mode>('Research');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [shoppingResearch, setShoppingResearch] = useState(false);
  const [anthropicThinkingBudget, setAnthropicThinkingBudget] = useState(2048);
  const [isGenerating, setIsGenerating] = useState(false);

  const abortControllersRef = useRef<AbortController[]>([]);

  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const createNewChat = () => {
    const newConv: Conversation = {
      id: uuidv4(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: defaultMode,
      providers: selectedProviders,
      messages: [],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const updateMessage = (convId: string, msgId: string, updates: Partial<Message>) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        messages: c.messages.map(m => m.id === msgId ? { ...m, ...updates } : m)
      };
    }));
  };

  const optimizePrompt = async (content: string): Promise<string> => {
    try {
      const res = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content, keys: apiKeys })
      });
      if (!res.ok) throw new Error('Failed to optimize prompt');
      const data = await res.json();
      return data.optimizedPrompt || content;
    } catch (e) {
      console.error(e);
      return content;
    }
  };

  const stopGeneration = () => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];
    setIsGenerating(false);
  };

  const appendInstruction = (instruction: string) => {
    if (!activeConversationId || !isGenerating) return;
    
    // In a real implementation, this would send a signal to the backend to inject
    // the instruction into the ongoing generation stream. For this demo, we'll
    // just append it to the active conversation as a system note.
    const instructionMsg: Message = {
      id: uuidv4(),
      role: 'system',
      content: `User added instruction during generation: ${instruction}`,
      timestamp: Date.now(),
    };
    
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConversationId) return c;
      return {
        ...c,
        messages: [...c.messages, instructionMsg]
      };
    }));
  };

  const sendMessage = async (content: string) => {
    let convId = activeConversationId;
    if (!convId) {
      const newConv: Conversation = {
        id: uuidv4(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: defaultMode,
        providers: selectedProviders,
        messages: [],
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      convId = newConv.id;
    }

    const currentConv = conversations.find(c => c.id === convId) || { mode: defaultMode, providers: selectedProviders, messages: [] };
    
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Create an assistant message for each selected provider
    const providersToUse: Provider[] = selectedProviders.length > 0 ? selectedProviders : ['perplexity'];
    const assistantMessages = providersToUse.map(p => ({
      id: uuidv4(),
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      provider: p,
      model: selectedModels[p],
      grounded: p === 'perplexity' || selectedSources.length > 0,
      thinking: '', // Add thinking field
    }));

    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        providers: providersToUse,
        title: c.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : c.title,
        updatedAt: Date.now(),
        messages: [...c.messages, userMsg, ...assistantMessages]
      };
    }));

    const systemPrompt = `You are a web-research-optimized assistant.
Priorities:
1. Accuracy over speed.
2. For time-sensitive or factual claims, prefer web-grounded retrieval.
3. Cite sources whenever the answer depends on external information.
4. Clearly separate verified facts from inference.
5. If sources disagree, say so and summarize the disagreement.
6. If insufficient evidence exists, say that directly.
7. Do not fabricate citations, URLs, studies, prices, dates, or product specs.
8. For model-only responses, explicitly label them as not currently web-verified.
9. For engineering, scientific, legal, medical, or financial topics, use more conservative wording and emphasize uncertainty where appropriate.
10. Keep answers well-structured in markdown.`;

    const messagesToSend = [
      { role: 'system', content: systemPrompt },
      ...currentConv.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content }
    ];

    setIsGenerating(true);
    abortControllersRef.current = [];

    // Fire off requests in parallel
    await Promise.all(assistantMessages.map(async (assistantMsg) => {
      const controller = new AbortController();
      abortControllersRef.current.push(controller);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesToSend,
            provider: assistantMsg.provider,
            model: assistantMsg.model,
            mode: currentConv.mode,
            sources: selectedSources,
            keys: apiKeys,
            extendedThinking,
            shoppingResearch,
            anthropicThinkingBudget
          }),
          signal: controller.signal
        });

        if (!res.ok) throw new Error('Network response was not ok');

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let fullThinking = '';
        let citationsList: any[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.error) {
                    fullContent += `\n\n**Error:** ${data.error}`;
                    updateMessage(convId!, assistantMsg.id, { content: fullContent });
                    break;
                  }
                  if (data.thinking) {
                    fullThinking += data.thinking;
                    updateMessage(convId!, assistantMsg.id, { thinking: fullThinking });
                  }
                  if (data.text) {
                    fullContent += data.text;
                    updateMessage(convId!, assistantMsg.id, { content: fullContent });
                  }
                  if (data.citations && data.citations.length > 0) {
                    citationsList = data.citations;
                    updateMessage(convId!, assistantMsg.id, { 
                      citations: citationsList.map((url, i) => ({
                        id: i + 1,
                        url,
                        domain: new URL(url).hostname.replace('www.', '')
                      }))
                    });
                  }
                } catch (e) {}
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Generation stopped by user');
        } else {
          console.error(error);
          updateMessage(convId!, assistantMsg.id, { content: 'An error occurred while fetching the response.' });
        }
      }
    }));
    
    setIsGenerating(false);
    abortControllersRef.current = [];
  };

  return (
    <ChatContext.Provider value={{
      conversations, activeConversationId, activeConversation, apiKeys, 
      selectedProviders, selectedModels, selectedSources, defaultMode, isSettingsOpen, isRightDrawerOpen,
      extendedThinking, shoppingResearch, anthropicThinkingBudget, isGenerating,
      setConversations, setActiveConversationId, setApiKeys, 
      setSelectedProviders, setSelectedModels, setSelectedSources, setDefaultMode, setIsSettingsOpen, setIsRightDrawerOpen,
      setExtendedThinking, setShoppingResearch, setAnthropicThinkingBudget,
      createNewChat, sendMessage, updateMessage, optimizePrompt, stopGeneration, appendInstruction
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
