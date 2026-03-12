export type Provider = 'perplexity' | 'openai' | 'anthropic' | 'gemini';
export type Mode = 'Quick Answer' | 'Research' | 'Deep Research' | 'Compare Sources';
export type SearchSource = 'web' | 'social' | 'academic' | 'github' | 'notebooklm' | 'shopping';

export interface Citation {
  id: number;
  url: string;
  domain: string;
  title?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: Citation[];
  provider?: Provider;
  model?: string;
  grounded?: boolean;
  fallbackUsed?: boolean;
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
}
