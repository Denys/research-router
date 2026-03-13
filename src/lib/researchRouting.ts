import type {
  AnswerType,
  APIKeys,
  Mode,
  Provider,
  ProviderAvailability,
  ProviderAvailabilityMap,
  ProviderStatusSource,
} from '../types.ts';

export type { AnswerType, ProviderAvailability, ProviderAvailabilityMap, ProviderStatusSource };

export interface ResearchIntent {
  requiresWebGrounding: boolean;
  reason: 'mode-trigger' | 'keyword-trigger' | 'writing-task' | 'general-task';
}

export interface RoutingDecision {
  canProceed: boolean;
  requiresWebGrounding: boolean;
  requestedProvider: Provider;
  resolvedProvider: Provider;
  answerType: AnswerType;
  fallbackReason?: string;
  errorMessage?: string;
}

interface ResearchIntentInput {
  mode: Mode;
  content: string;
}

interface RoutingDecisionInput extends ResearchIntentInput {
  requestedProvider: Provider;
  availability: ProviderAvailabilityMap;
}

const providerCapabilities: Record<Provider, { supportsWebGrounding: boolean; localKey: keyof APIKeys; envKey: string }> = {
  perplexity: {
    supportsWebGrounding: true,
    localKey: 'pplx',
    envKey: 'PPLX_API_KEY',
  },
  openai: {
    supportsWebGrounding: true,
    localKey: 'openai',
    envKey: 'OPENAI_API_KEY',
  },
  anthropic: {
    supportsWebGrounding: true,
    localKey: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    supportsWebGrounding: true,
    localKey: 'gemini',
    envKey: 'GEMINI_API_KEY',
  },
  openrouter: {
    supportsWebGrounding: true,
    localKey: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
  },
};

const providerOrder: Provider[] = ['perplexity', 'openai', 'anthropic', 'gemini', 'openrouter'];
const researchModes = new Set<Mode>(['Research', 'Deep Research', 'Compare Sources']);
const researchKeywords = /\b(current|latest|recent|news|price|prices|law|laws|release|releases|schedule|schedules|compare|comparison|source|sources|citation|citations|web|research|update|updates)\b/i;
const writingKeywords = /\b(write|rewrite|draft|email|format|brainstorm|polish|rephrase|edit)\b/i;

const isConfigured = (value?: string) => Boolean(value?.trim());

export const buildServerProviderStatus = (env: Partial<Record<string, string | undefined>>): ProviderAvailabilityMap => {
  const entries = providerOrder.map((provider) => {
    const capability = providerCapabilities[provider];
    const configured = isConfigured(env[capability.envKey]);

    return [
      provider,
      {
        configured,
        source: configured ? 'environment' : 'none',
        supportsWebGrounding: capability.supportsWebGrounding,
      },
    ] as const;
  });

  return Object.fromEntries(entries) as ProviderAvailabilityMap;
};

export const mergeProviderAvailability = (
  localKeys: APIKeys,
  serverStatus: ProviderAvailabilityMap,
): ProviderAvailabilityMap => {
  const entries = providerOrder.map((provider) => {
    const capability = providerCapabilities[provider];
    const hasLocalKey = isConfigured(localKeys[capability.localKey]);
    const hasEnvironmentKey = serverStatus[provider]?.configured ?? false;
    let source: ProviderStatusSource = 'none';

    if (hasLocalKey && hasEnvironmentKey) {
      source = 'both';
    } else if (hasLocalKey) {
      source = 'local';
    } else if (hasEnvironmentKey) {
      source = 'environment';
    }

    return [
      provider,
      {
        configured: hasLocalKey || hasEnvironmentKey,
        source,
        supportsWebGrounding: capability.supportsWebGrounding,
      },
    ] as const;
  });

  return Object.fromEntries(entries) as ProviderAvailabilityMap;
};

export const classifyResearchIntent = ({ mode, content }: ResearchIntentInput): ResearchIntent => {
  if (researchModes.has(mode)) {
    return {
      requiresWebGrounding: true,
      reason: 'mode-trigger',
    };
  }

  if (researchKeywords.test(content)) {
    return {
      requiresWebGrounding: true,
      reason: 'keyword-trigger',
    };
  }

  if (writingKeywords.test(content)) {
    return {
      requiresWebGrounding: false,
      reason: 'writing-task',
    };
  }

  return {
    requiresWebGrounding: false,
    reason: 'general-task',
  };
};

const firstConfiguredProvider = (availability: ProviderAvailabilityMap, providers: Provider[]): Provider | undefined => {
  return providers.find((provider) => availability[provider]?.configured);
};

const firstConfiguredWebProvider = (availability: ProviderAvailabilityMap, providers: Provider[]): Provider | undefined => {
  return providers.find((provider) => availability[provider]?.configured && availability[provider]?.supportsWebGrounding);
};

export const resolveRoutingDecision = ({
  mode,
  content,
  requestedProvider,
  availability,
}: RoutingDecisionInput): RoutingDecision => {
  const intent = classifyResearchIntent({ mode, content });

  if (intent.requiresWebGrounding) {
    if (availability[requestedProvider]?.configured && availability[requestedProvider]?.supportsWebGrounding) {
      return {
        canProceed: true,
        requiresWebGrounding: true,
        requestedProvider,
        resolvedProvider: requestedProvider,
        answerType: 'web-grounded',
      };
    }

    const fallbackProvider = firstConfiguredWebProvider(availability, providerOrder);
    if (fallbackProvider) {
      return {
        canProceed: true,
        requiresWebGrounding: true,
        requestedProvider,
        resolvedProvider: fallbackProvider,
        answerType: 'fallback',
        fallbackReason: `${requestedProvider} is not configured for this request, so research was routed through ${fallbackProvider} with web search enabled.`,
      };
    }

    return {
      canProceed: false,
      requiresWebGrounding: true,
      requestedProvider,
      resolvedProvider: requestedProvider,
      answerType: 'fallback',
      errorMessage: 'Research mode requires a configured web-capable provider. Add a Perplexity, GPT (OpenAI), Claude (Anthropic), Gemini, or OpenRouter key in Settings.',
    };
  }

  if (availability[requestedProvider]?.configured) {
    return {
      canProceed: true,
      requiresWebGrounding: false,
      requestedProvider,
      resolvedProvider: requestedProvider,
      answerType: 'model-only',
    };
  }

  const fallbackProvider = firstConfiguredProvider(availability, providerOrder);
  if (fallbackProvider) {
    return {
      canProceed: true,
      requiresWebGrounding: false,
      requestedProvider,
      resolvedProvider: fallbackProvider,
      answerType: 'fallback',
      fallbackReason: `${requestedProvider} is not configured, so the request was routed to ${fallbackProvider}.`,
    };
  }

  return {
    canProceed: false,
    requiresWebGrounding: false,
    requestedProvider,
    resolvedProvider: requestedProvider,
    answerType: 'fallback',
    errorMessage: 'No providers are configured yet. Add an API key in Settings to continue.',
  };
};
