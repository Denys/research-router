import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import type { APIKeys, Mode, Provider, SearchSource } from './src/types.ts';
import { buildServerProviderStatus, resolveRoutingDecision } from './src/lib/researchRouting.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  provider?: Provider;
  model?: string;
  mode?: Mode;
  sources?: SearchSource[];
  keys?: APIKeys;
  extendedThinking?: boolean;
  shoppingResearch?: boolean;
  anthropicThinkingBudget?: number;
}

interface ProviderStreamResult {
  citations: string[];
}

const PORT = 3000;
const defaultApiKeys: APIKeys = {
  pplx: '',
  openai: '',
  anthropic: '',
  gemini: '',
};

const defaultModels: Record<Provider, string> = {
  perplexity: 'sonar-pro',
  openai: 'gpt-5.4-thinking',
  anthropic: 'claude-4.6-sonnet',
  gemini: 'gemini-3.1-pro-preview',
};

const fallbackProviderOrder: Provider[] = ['openai', 'anthropic', 'gemini'];

const writeEvent = (res: express.Response, payload: Record<string, unknown>) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const getApiKey = (provider: Provider, keys?: APIKeys): string | undefined => {
  const mergedKeys = keys ?? defaultApiKeys;

  switch (provider) {
    case 'perplexity':
      return mergedKeys.pplx || process.env.PPLX_API_KEY;
    case 'openai':
      return mergedKeys.openai || process.env.OPENAI_API_KEY;
    case 'anthropic':
      return mergedKeys.anthropic || process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return mergedKeys.gemini || process.env.GEMINI_API_KEY;
    default:
      return undefined;
  }
};

const resolveModel = (provider: Provider, requestedModel?: string): string => {
  const activeModel = requestedModel || defaultModels[provider];

  if (provider === 'openai') {
    if (activeModel === 'gpt-5.4-thinking') return 'o3-mini';
    if (activeModel === 'gpt-5.3-instant') return 'gpt-4o';
    if (activeModel === 'gpt-5.2-thinking') return 'o1-mini';
    if (activeModel === 'gpt-5.2-instant') return 'gpt-4o-mini';
  }

  if (provider === 'anthropic') {
    if (activeModel === 'claude-4.6-sonnet') return 'claude-3-7-sonnet-20250219';
    if (activeModel === 'claude-4.6-opus') return 'claude-3-opus-20240229';
    if (activeModel === 'claude-4.5-haiku') return 'claude-3-5-haiku-20241022';
  }

  return activeModel;
};

const withSourceInstructions = (messages: ChatMessage[], sources: SearchSource[] = [], shoppingResearch = false): ChatMessage[] => {
  if (sources.length === 0) {
    return messages;
  }

  return messages.map((message) => {
    if (message.role !== 'system') {
      return message;
    }

    let content = `${message.content}\n\nCRITICAL INSTRUCTION: Focus your search and response primarily on the following sources: ${sources.join(', ')}.`;
    if (sources.includes('shopping') || shoppingResearch) {
      content += '\nAlso, perform deep shopping research, comparing prices, reviews, and availability.';
    }

    return {
      ...message,
      content,
    };
  });
};

const maybeEmitThinking = async (
  res: express.Response,
  provider: Provider,
  requestedModel: string,
  extendedThinking = false,
) => {
  const isThinkingModel = requestedModel.includes('thinking') || requestedModel.includes('sonnet') || requestedModel.includes('opus') || requestedModel.includes('haiku');
  if (!isThinkingModel && !extendedThinking) {
    return;
  }

  const baseSteps = provider === 'perplexity'
    ? ['Classifying research intent...', 'Preparing web-grounded retrieval...', 'Collecting cited material...', 'Synthesizing answer...']
    : ['Analyzing request parameters...', 'Formulating response strategy...', 'Synthesizing answer...'];

  const steps = extendedThinking
    ? [...baseSteps, 'Performing extended reasoning...', 'Finalizing output structure...']
    : baseSteps;

  for (const step of steps) {
    writeEvent(res, { thinking: `${step}\n` });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
};

const collectUniqueCitations = (existing: string[], incoming: unknown): string[] => {
  if (!Array.isArray(incoming)) {
    return existing;
  }

  const merged = new Set(existing);
  for (const item of incoming) {
    if (typeof item === 'string' && item.trim()) {
      merged.add(item);
    }
  }

  return Array.from(merged);
};

const streamPerplexity = async (
  res: express.Response,
  messages: ChatMessage[],
  apiKey: string,
  requestedModel: string,
): Promise<ProviderStreamResult> => {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: requestedModel,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity Error: ${response.status} ${response.statusText}`);
  }

  const citations: string[] = [];
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') {
          continue;
        }

        try {
          const data = JSON.parse(line.slice(6));
          const text = data.choices?.[0]?.delta?.content || '';
          const nextCitations = collectUniqueCitations(citations, data.citations);
          citations.splice(0, citations.length, ...nextCitations);
          writeEvent(res, { text, citations });
        } catch {
          // Ignore partial chunks.
        }
      }
    }
  }

  return { citations };
};

const streamGemini = async (
  res: express.Response,
  messages: ChatMessage[],
  apiKey: string,
  requestedModel: string,
): Promise<ProviderStreamResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = messages.find((message) => message.role === 'system')?.content;
  const prompt = messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');

  const responseStream = await ai.models.generateContentStream({
    model: requestedModel,
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  for await (const chunk of responseStream) {
    writeEvent(res, { text: chunk.text });
  }

  return { citations: [] };
};

const streamOpenAI = async (
  res: express.Response,
  messages: ChatMessage[],
  apiKey: string,
  requestedModel: string,
  extendedThinking = false,
): Promise<ProviderStreamResult> => {
  const isReasoningModel = requestedModel.startsWith('o1') || requestedModel.startsWith('o3');
  const body: Record<string, unknown> = {
    model: requestedModel,
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
  };

  if (!isReasoningModel) {
    body.stream = true;
  } else if (requestedModel === 'o3-mini') {
    body.reasoning_effort = extendedThinking ? 'high' : 'medium';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Error: ${response.statusText} - ${errorText}`);
  }

  if (isReasoningModel) {
    const data = await response.json();
    writeEvent(res, { text: data.choices?.[0]?.message?.content || '' });
    return { citations: [] };
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') {
          continue;
        }

        try {
          const data = JSON.parse(line.slice(6));
          writeEvent(res, { text: data.choices?.[0]?.delta?.content || '' });
        } catch {
          // Ignore partial chunks.
        }
      }
    }
  }

  return { citations: [] };
};

const streamAnthropic = async (
  res: express.Response,
  messages: ChatMessage[],
  apiKey: string,
  requestedModel: string,
  extendedThinking = false,
  anthropicThinkingBudget = 2048,
): Promise<ProviderStreamResult> => {
  const systemPrompt = messages.find((message) => message.role === 'system')?.content;
  const history = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: requestedModel,
      system: systemPrompt,
      messages: history,
      max_tokens: 4096,
      stream: true,
      ...(extendedThinking && requestedModel.includes('sonnet')
        ? {
            thinking: {
              type: 'enabled',
              budget_tokens: Math.min(Math.max(Number(anthropicThinkingBudget) || 2048, 1024), 8192),
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) {
          continue;
        }

        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta' && data.delta?.text) {
            writeEvent(res, { text: data.delta.text });
          }
        } catch {
          // Ignore partial chunks.
        }
      }
    }
  }

  return { citations: [] };
};

const streamProviderResponse = async (
  res: express.Response,
  provider: Provider,
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  extendedThinking = false,
  anthropicThinkingBudget = 2048,
): Promise<ProviderStreamResult> => {
  switch (provider) {
    case 'perplexity':
      return streamPerplexity(res, messages, apiKey, model);
    case 'gemini':
      return streamGemini(res, messages, apiKey, model);
    case 'openai':
      return streamOpenAI(res, messages, apiKey, model, extendedThinking);
    case 'anthropic':
      return streamAnthropic(res, messages, apiKey, model, extendedThinking, anthropicThinkingBudget);
    default:
      throw new Error(`Provider ${provider} is not supported.`);
  }
};

const findFallbackProvider = (keys: APIKeys | undefined): Provider | undefined => {
  return fallbackProviderOrder.find((provider) => Boolean(getApiKey(provider, keys)?.trim()));
};

async function startServer() {
  const app = express();

  app.use(express.json());

  app.get('/api/provider-status', (_req, res) => {
    res.json(buildServerProviderStatus(process.env));
  });

  app.post('/api/optimize-prompt', async (req, res) => {
    try {
      const { prompt, keys } = req.body;
      const apiKey = keys?.gemini || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ error: 'Gemini API key missing for prompt optimization.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = "You are an expert prompt engineer. Your task is to take the user's input and rewrite it into a highly effective, detailed, and clear prompt for an AI research assistant. Make it specific, add necessary context, and structure it well. Return ONLY the optimized prompt text, nothing else.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { systemInstruction },
      });

      res.json({ optimizedPrompt: response.text });
    } catch (error: any) {
      console.error('Optimize Prompt Error:', error);
      res.status(500).json({ error: 'Failed to optimize prompt' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const {
        messages,
        provider,
        model,
        mode,
        sources,
        keys,
        extendedThinking,
        shoppingResearch,
        anthropicThinkingBudget,
      } = req.body as ChatRequestBody;

      const requestedProvider = provider || 'perplexity';
      const requestedMode = mode || 'Research';
      const mergedKeys = { ...defaultApiKeys, ...(keys ?? {}) };
      const availability = buildServerProviderStatus({
        PPLX_API_KEY: getApiKey('perplexity', mergedKeys),
        OPENAI_API_KEY: getApiKey('openai', mergedKeys),
        ANTHROPIC_API_KEY: getApiKey('anthropic', mergedKeys),
        GEMINI_API_KEY: getApiKey('gemini', mergedKeys),
      });
      const latestUserMessage = [...(messages ?? [])].reverse().find((message) => message.role === 'user')?.content || '';
      const routing = resolveRoutingDecision({
        mode: requestedMode,
        content: latestUserMessage,
        requestedProvider,
        availability,
      });

      if (!routing.canProceed) {
        writeEvent(res, {
          routing: {
            ...routing,
            weakGrounding: true,
          },
        });
        writeEvent(res, { error: routing.errorMessage || 'Unable to route request.' });
        res.end();
        return;
      }

      const resolvedProvider = routing.resolvedProvider;
      const requestedModel = resolvedProvider === requestedProvider ? model || defaultModels[requestedProvider] : defaultModels[resolvedProvider];
      const resolvedModel = resolveModel(resolvedProvider, requestedModel);
      const preparedMessages = withSourceInstructions(messages ?? [], sources, shoppingResearch);

      writeEvent(res, {
        routing: {
          ...routing,
          weakGrounding: routing.answerType === 'fallback',
        },
        model: requestedModel,
      });

      await maybeEmitThinking(res, resolvedProvider, requestedModel, extendedThinking);

      let apiKey = getApiKey(resolvedProvider, mergedKeys);
      let activeRouting = routing;
      let activeProvider = resolvedProvider;
      let activeModel = resolvedModel;

      if (!apiKey && routing.requiresWebGrounding) {
        const fallbackProvider = findFallbackProvider(mergedKeys);
        if (fallbackProvider) {
          activeProvider = fallbackProvider;
          activeModel = resolveModel(fallbackProvider, defaultModels[fallbackProvider]);
          activeRouting = {
            ...routing,
            resolvedProvider: fallbackProvider,
            answerType: 'fallback',
            fallbackReason: 'Perplexity is unavailable, so the request was answered by a secondary provider without guaranteed live web grounding.',
          };
          apiKey = getApiKey(fallbackProvider, mergedKeys);
          writeEvent(res, {
            routing: {
              ...activeRouting,
              weakGrounding: true,
            },
            model: defaultModels[fallbackProvider],
          });
        }
      }

      if (!apiKey) {
        writeEvent(res, { error: `No API key available for ${activeProvider}. Please configure it in Settings.` });
        res.end();
        return;
      }

      const result = await streamProviderResponse(
        res,
        activeProvider,
        activeModel,
        preparedMessages,
        apiKey,
        extendedThinking,
        anthropicThinkingBudget,
      );

      const weakGrounding = activeRouting.answerType === 'web-grounded'
        ? result.citations.length < 2
        : activeRouting.answerType === 'fallback';

      writeEvent(res, {
        routing: {
          ...activeRouting,
          weakGrounding,
        },
        done: true,
      });
      res.end();
    } catch (error: any) {
      console.error('Chat API Error:', error);
      writeEvent(res, { error: error?.message || 'Internal Server Error' });
      res.end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
