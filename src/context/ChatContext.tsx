import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { APIKeys, Conversation, Message, Mode, Provider, ProviderAvailabilityMap, SearchSource } from '../types.ts';
import { buildServerProviderStatus, mergeProviderAvailability, resolveRoutingDecision } from '../lib/researchRouting.ts';
import { createSseParser } from '../lib/sse.ts';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | undefined;
  apiKeys: APIKeys;
  providerAvailability: ProviderAvailabilityMap;
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

const defaultApiKeys: APIKeys = {
  pplx: '',
  openai: '',
  anthropic: '',
  gemini: '',
};

const defaultProviderStatus = buildServerProviderStatus({});

const toCitationDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKeys>(() => {
    const saved = localStorage.getItem('apiKeys');
    return saved ? JSON.parse(saved) : defaultApiKeys;
  });
  const [serverProviderStatus, setServerProviderStatus] = useState<ProviderAvailabilityMap>(defaultProviderStatus);
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>(['perplexity']);
  const [selectedModels, setSelectedModels] = useState<Record<Provider, string>>({
    perplexity: 'sonar-pro',
    openai: 'gpt-5.4-thinking',
    anthropic: 'claude-4.6-sonnet',
    gemini: 'gemini-3.1-pro-preview',
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

  useEffect(() => {
    const loadProviderStatus = async () => {
      try {
        const res = await fetch('/api/provider-status');
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setServerProviderStatus(data);
      } catch (error) {
        console.error('Failed to load provider status', error);
      }
    };

    void loadProviderStatus();
  }, []);

  const providerAvailability = mergeProviderAvailability(apiKeys, serverProviderStatus);
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);

  const createNewChat = () => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: defaultMode,
      providers: selectedProviders,
      messages: [],
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const updateMessage = (conversationId: string, messageId: string, updates: Partial<Message>) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          messages: conversation.messages.map((message) => (message.id === messageId ? { ...message, ...updates } : message)),
        };
      }),
    );
  };

  const optimizePrompt = async (content: string): Promise<string> => {
    try {
      const res = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content, keys: apiKeys }),
      });
      if (!res.ok) {
        throw new Error('Failed to optimize prompt');
      }

      const data = await res.json();
      return data.optimizedPrompt || content;
    } catch (error) {
      console.error(error);
      return content;
    }
  };

  const stopGeneration = () => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current = [];
    setIsGenerating(false);
  };

  const appendInstruction = (instruction: string) => {
    if (!activeConversationId || !isGenerating) {
      return;
    }

    const instructionMessage: Message = {
      id: uuidv4(),
      role: 'system',
      content: `User added instruction during generation: ${instruction}`,
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== activeConversationId) {
          return conversation;
        }

        return {
          ...conversation,
          messages: [...conversation.messages, instructionMessage],
        };
      }),
    );
  };

  const sendMessage = async (content: string) => {
    let conversationId = activeConversationId;
    if (!conversationId) {
      const newConversation: Conversation = {
        id: uuidv4(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: defaultMode,
        providers: selectedProviders,
        messages: [],
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
      conversationId = newConversation.id;
    }

    const currentConversation = conversations.find((conversation) => conversation.id === conversationId) || {
      mode: defaultMode,
      providers: selectedProviders,
      messages: [],
    };

    const messageMode = currentConversation.mode || defaultMode;
    const requestedProviders: Provider[] = selectedProviders.length > 0 ? selectedProviders : ['perplexity'];
    const previewRouting = resolveRoutingDecision({
      mode: messageMode,
      content,
      requestedProvider: requestedProviders[0],
      availability: providerAvailability,
    });

    const providerPlans = previewRouting.requiresWebGrounding
      ? [
          resolveRoutingDecision({
            mode: messageMode,
            content,
            requestedProvider: requestedProviders[0],
            availability: providerAvailability,
          }),
        ]
      : requestedProviders.map((provider) =>
          resolveRoutingDecision({
            mode: messageMode,
            content,
            requestedProvider: provider,
            availability: providerAvailability,
          }),
        );

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantMessages: Message[] = providerPlans.map((plan) => ({
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      provider: plan.resolvedProvider,
      model: selectedModels[plan.requestedProvider],
      answerType: plan.answerType,
      requestedProvider: plan.requestedProvider,
      resolvedProvider: plan.resolvedProvider,
      fallbackReason: plan.fallbackReason,
      weakGrounding: plan.requiresWebGrounding ? false : plan.answerType === 'fallback',
      thinking: '',
    }));

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          providers: providerPlans.map((plan) => plan.requestedProvider),
          title: conversation.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : conversation.title,
          updatedAt: Date.now(),
          messages: [...conversation.messages, userMessage, ...assistantMessages],
        };
      }),
    );

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
      { role: 'system' as const, content: systemPrompt },
      ...currentConversation.messages.map((message) => ({ role: message.role, content: message.content })),
      { role: 'user' as const, content },
    ];

    setIsGenerating(true);
    abortControllersRef.current = [];

    await Promise.all(
      assistantMessages.map(async (assistantMessage) => {
        const controller = new AbortController();
        abortControllersRef.current.push(controller);

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messagesToSend,
              provider: assistantMessage.requestedProvider,
              model: selectedModels[assistantMessage.requestedProvider || 'perplexity'],
              mode: messageMode,
              sources: selectedSources,
              keys: apiKeys,
              extendedThinking,
              shoppingResearch,
              anthropicThinkingBudget,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error('Network response was not ok');
          }

          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let fullContent = '';
          let fullThinking = '';
          let citationsList: string[] = [];
          let latestAnswerType = assistantMessage.answerType;
          let latestWeakGrounding = assistantMessage.weakGrounding;

          if (reader) {
            const parser = createSseParser();

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              for (const line of parser.push(chunk)) {
                try {
                  const data = JSON.parse(line);
                  if (data.error) {
                    fullContent += `\n\n**Error:** ${data.error}`;
                    updateMessage(conversationId!, assistantMessage.id, {
                      content: fullContent,
                      weakGrounding: true,
                    });
                  }

                  if (data.routing) {
                    latestAnswerType = data.routing.answerType;
                    latestWeakGrounding = data.routing.weakGrounding;
                    updateMessage(conversationId!, assistantMessage.id, {
                      provider: data.routing.resolvedProvider,
                      model: data.model || assistantMessage.model,
                      answerType: data.routing.answerType,
                      requestedProvider: data.routing.requestedProvider,
                      resolvedProvider: data.routing.resolvedProvider,
                      fallbackReason: data.routing.fallbackReason,
                      weakGrounding: data.routing.weakGrounding,
                    });
                  }

                  if (data.model && !data.routing) {
                    updateMessage(conversationId!, assistantMessage.id, { model: data.model });
                  }

                  if (data.thinking) {
                    fullThinking += data.thinking;
                    updateMessage(conversationId!, assistantMessage.id, { thinking: fullThinking });
                  }

                  if (data.text) {
                    fullContent += data.text;
                    updateMessage(conversationId!, assistantMessage.id, { content: fullContent });
                  }

                  if (Array.isArray(data.citations) && data.citations.length > 0) {
                    citationsList = data.citations;
                    updateMessage(conversationId!, assistantMessage.id, {
                      citations: citationsList.map((url: string, index: number) => ({
                        id: index + 1,
                        url,
                        domain: toCitationDomain(url),
                      })),
                    });
                  }
                } catch (error) {
                  console.error('Failed to parse SSE chunk', error);
                }
              }
            }
          }

          updateMessage(conversationId!, assistantMessage.id, {
            weakGrounding: latestWeakGrounding ?? (latestAnswerType === 'web-grounded' ? citationsList.length < 2 : latestAnswerType === 'fallback'),
          });
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('Generation stopped by user');
          } else {
            console.error(error);
            updateMessage(conversationId!, assistantMessage.id, {
              content: 'An error occurred while fetching the response.',
              answerType: 'fallback',
              weakGrounding: true,
            });
          }
        }
      }),
    );

    setIsGenerating(false);
    abortControllersRef.current = [];
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        apiKeys,
        providerAvailability,
        selectedProviders,
        selectedModels,
        selectedSources,
        defaultMode,
        isSettingsOpen,
        isRightDrawerOpen,
        extendedThinking,
        shoppingResearch,
        anthropicThinkingBudget,
        isGenerating,
        setConversations,
        setActiveConversationId,
        setApiKeys,
        setSelectedProviders,
        setSelectedModels,
        setSelectedSources,
        setDefaultMode,
        setIsSettingsOpen,
        setIsRightDrawerOpen,
        setExtendedThinking,
        setShoppingResearch,
        setAnthropicThinkingBudget,
        createNewChat,
        sendMessage,
        updateMessage,
        optimizePrompt,
        stopGeneration,
        appendInstruction,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
};

