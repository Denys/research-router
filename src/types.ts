export type Provider = 'perplexity' | 'openai' | 'anthropic' | 'gemini' | 'openrouter';
export type Mode = 'Quick Answer' | 'Research' | 'Deep Research' | 'Compare Sources';
export type SearchSource = 'web' | 'social' | 'academic' | 'github' | 'notebooklm' | 'shopping';
export type ProviderStatusSource = 'none' | 'local' | 'environment' | 'both';
export type AnswerType = 'web-grounded' | 'model-only' | 'fallback';

export interface Citation {
  id: number;
  url: string;
  domain: string;
  title?: string;
}

export interface ProviderAvailability {
  configured: boolean;
  source: ProviderStatusSource;
  supportsWebGrounding: boolean;
}

export type ProviderAvailabilityMap = Record<Provider, ProviderAvailability>;

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: Citation[];
  provider?: Provider;
  model?: string;
  answerType?: AnswerType;
  requestedProvider?: Provider;
  resolvedProvider?: Provider;
  fallbackReason?: string;
  weakGrounding?: boolean;
  confidence?: 'low' | 'medium' | 'high';
  thinking?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: Mode;
  providers: Provider[];
  messages: Message[];
}

export interface APIKeys {
  pplx: string;
  openai: string;
  anthropic: string;
  gemini: string;
  openrouter: string;
}
