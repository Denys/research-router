import assert from 'node:assert/strict';

import {
  buildServerProviderStatus,
  classifyResearchIntent,
  mergeProviderAvailability,
  resolveRoutingDecision,
  type ProviderAvailabilityMap,
} from '../src/lib/researchRouting.ts';

const availability = (overrides: Partial<ProviderAvailabilityMap> = {}): ProviderAvailabilityMap => ({
  perplexity: {
    configured: false,
    source: 'none',
    supportsWebGrounding: true,
  },
  openai: {
    configured: false,
    source: 'none',
    supportsWebGrounding: true,
  },
  anthropic: {
    configured: false,
    source: 'none',
    supportsWebGrounding: true,
  },
  gemini: {
    configured: false,
    source: 'none',
    supportsWebGrounding: true,
  },
  openrouter: {
    configured: false,
    source: 'none',
    supportsWebGrounding: true,
  },
  ...overrides,
});

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'classifyResearchIntent flags latest/current prompts as web-grounded research',
    run: () => {
      const result = classifyResearchIntent({
        mode: 'Quick Answer',
        content: 'What are the latest EU AI Act enforcement updates and cite the sources?',
      });

      assert.equal(result.requiresWebGrounding, true);
      assert.equal(result.reason, 'keyword-trigger');
    },
  },
  {
    name: 'classifyResearchIntent leaves writing requests as model-only tasks',
    run: () => {
      const result = classifyResearchIntent({
        mode: 'Quick Answer',
        content: 'Write a concise follow-up email based on these notes.',
      });

      assert.equal(result.requiresWebGrounding, false);
      assert.equal(result.reason, 'writing-task');
    },
  },
  {
    name: 'resolveRoutingDecision honors explicit provider choice for non-web tasks',
    run: () => {
      const result = resolveRoutingDecision({
        mode: 'Quick Answer',
        content: 'Rewrite this paragraph to sound more concise.',
        requestedProvider: 'openai',
        availability: availability({
          openai: {
            configured: true,
            source: 'environment',
            supportsWebGrounding: true,
          },
        }),
      });

      assert.equal(result.requiresWebGrounding, false);
      assert.equal(result.resolvedProvider, 'openai');
      assert.equal(result.answerType, 'model-only');
      assert.equal(result.fallbackReason, undefined);
    },
  },
  {
    name: 'resolveRoutingDecision keeps research on the requested provider when it supports web grounding',
    run: () => {
      const result = resolveRoutingDecision({
        mode: 'Research',
        content: 'Compare current STM32H7 and i.MX RT board pricing with sources.',
        requestedProvider: 'openai',
        availability: availability({
          openai: {
            configured: true,
            source: 'environment',
            supportsWebGrounding: true,
          },
          perplexity: {
            configured: true,
            source: 'environment',
            supportsWebGrounding: true,
          },
        }),
      });

      assert.equal(result.requiresWebGrounding, true);
      assert.equal(result.resolvedProvider, 'openai');
      assert.equal(result.answerType, 'web-grounded');
    },
  },
  {
    name: 'resolveRoutingDecision falls back to another web-capable provider when requested research provider is unavailable',
    run: () => {
      const result = resolveRoutingDecision({
        mode: 'Deep Research',
        content: 'Research the latest GaN controller ICs under 300 W.',
        requestedProvider: 'anthropic',
        availability: availability({
          openai: {
            configured: true,
            source: 'environment',
            supportsWebGrounding: true,
          },
        }),
      });

      assert.equal(result.requiresWebGrounding, true);
      assert.equal(result.resolvedProvider, 'openai');
      assert.equal(result.answerType, 'fallback');
      assert.match(result.fallbackReason ?? '', /web search enabled/i);
    },
  },
  {
    name: 'resolveRoutingDecision fails fast when research routing has no configured web-capable providers',
    run: () => {
      const result = resolveRoutingDecision({
        mode: 'Compare Sources',
        content: 'Summarize recent robotics chip releases with sources.',
        requestedProvider: 'perplexity',
        availability: availability(),
      });

      assert.equal(result.requiresWebGrounding, true);
      assert.equal(result.canProceed, false);
      assert.match(result.errorMessage ?? '', /web-capable provider/i);
    },
  },
  {
    name: 'buildServerProviderStatus reflects configured environment keys without exposing values',
    run: () => {
      const result = buildServerProviderStatus({
        PPLX_API_KEY: 'pplx-secret',
        OPENAI_API_KEY: '',
        ANTHROPIC_API_KEY: 'anthropic-secret',
        GEMINI_API_KEY: undefined,
        OPENROUTER_API_KEY: '',
      });

      assert.equal(result.perplexity.configured, true);
      assert.equal(result.perplexity.source, 'environment');
      assert.equal(result.anthropic.configured, true);
      assert.equal(result.openai.configured, false);
      assert.equal(result.gemini.configured, false);
      assert.equal(result.openrouter.configured, false);
      assert.equal(result.openai.supportsWebGrounding, true);
    },
  },
  {
    name: 'mergeProviderAvailability combines local and environment configuration sources',
    run: () => {
      const result = mergeProviderAvailability(
        {
          pplx: 'local-pplx',
          openai: '',
          anthropic: '',
          gemini: 'local-gemini',
          openrouter: '',
        },
        availability({
          perplexity: {
            configured: true,
            source: 'environment',
            supportsWebGrounding: true,
          },
          openai: {
            configured: true,
            source: 'environment',
            supportsWebGrounding: true,
          },
        }),
      );

      assert.equal(result.perplexity.source, 'both');
      assert.equal(result.perplexity.configured, true);
      assert.equal(result.openai.source, 'environment');
      assert.equal(result.gemini.source, 'local');
      assert.equal(result.gemini.configured, true);
    },
  },
];

for (const entry of tests) {
  entry.run();
  console.log(`PASS ${entry.name}`);
}
