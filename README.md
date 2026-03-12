# Research Router

Research Router is a production-minded research chat app for comparing provider-backed answers while being explicit about what is web-grounded, what is model-only, and when the system had to fall back.

The current implementation supports `perplexity`, `openai`, `anthropic`, and `gemini`. OpenRouter and Groq are intentionally out of scope for this repository right now.

## Product Overview

Research Router is optimized for two kinds of work:

- Web-grounded research, where the app routes research-oriented prompts toward Perplexity and surfaces citations directly in the UI.
- Model-only tasks, where OpenAI, Anthropic, and Gemini remain available for writing, formatting, and general reasoning.

This cycle adds explicit routing labels so each assistant response can show:

- the requested provider,
- the resolved provider actually used,
- whether the answer is `web-grounded`, `model-only`, or `fallback`,
- whether source coverage was weak.

## Current Capabilities

### Implemented today

- Responsive research-chat UI with sidebar history, top-level mode controls, and a citations drawer.
- Provider settings for browser-stored keys plus server-side environment detection through `/api/provider-status`.
- Routing classification for research-heavy prompts and research modes.
- Explicit answer metadata in the stream returned by `/api/chat`.
- Fallback labeling when research routing cannot stay on the preferred web-grounded path.
- Anthropic extended-thinking budget control.
- Prompt optimization via Gemini.

### Current provider behavior

- `perplexity`: preferred for research-mode and web-grounded requests.
- `openai`, `anthropic`, `gemini`: available for model-only tasks and fallback responses.
- Research-oriented prompts are routed toward Perplexity first when it is configured.
- If Perplexity is unavailable, the backend can mark a degraded answer as `fallback` and explain why.

## Local Setup

### Prerequisites

- Node.js 24 or newer is recommended.

### Install and run

1. Install dependencies:
   `npm install`
2. Configure any provider keys you want to use in environment variables and/or the in-app Settings modal.
3. Start the app locally:
   `npm run dev`
4. In another terminal, validate the codebase when needed:
   `npm run test`
   `npm run lint`
   `npm run build`

The server runs on `http://localhost:3000` by default.

## Configuration Model

Research Router merges two key sources:

- Browser-stored keys saved from the Settings modal.
- Server environment variables such as `PPLX_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY`.

The UI now reflects whether each provider is configured from:

- browser only,
- server environment only,
- both,
- neither.

Keys are never rendered back in full after save.

## Architecture Snapshot

### Frontend

- React + Vite app under [src](/C:/Users/denko/Gemini/Antigravity/research-router/src).
- Conversation state, provider availability merging, and SSE handling live in [ChatContext.tsx](/C:/Users/denko/Gemini/Antigravity/research-router/src/context/ChatContext.tsx).
- The chat panel and right drawer render explicit routing metadata instead of inferring grounding from provider choice alone.

### Backend

- Express server in [server.ts](/C:/Users/denko/Gemini/Antigravity/research-router/server.ts).
- `/api/provider-status` exposes non-secret configuration availability.
- `/api/chat` classifies intent, resolves provider routing, and streams both answer content and routing metadata.
- Shared routing logic lives in [researchRouting.ts](/C:/Users/denko/Gemini/Antigravity/research-router/src/lib/researchRouting.ts) so server behavior and tests stay aligned.

## Current Status vs Target Spec

This repository is closer to the requested product spec than the original AI Studio scaffold, but it is still not feature-complete.

The authoritative gap tracker is [NON_CONFORMITIES.md](/C:/Users/denko/Gemini/Antigravity/research-router/NON_CONFORMITIES.md). The most important remaining mismatches are:

- Mid-generation instruction input is still a local note, not true in-flight provider control.
- Thinking/search visualization remains synthetic rather than provider-native telemetry.
- Routing behavior is now explicit, but deeper research orchestration and richer source comparison remain limited.

## Known Gaps

- Research decomposition is still lightweight compared with the original deep-research spec.
- Citation quality depends heavily on provider behavior; non-Perplexity paths do not produce equivalent source metadata.
- The UI supports multiple provider selection, but research-mode routing now prioritizes correctness over parallel comparison.

## Next-Cycle Priorities

With routing correctness and labeling now in place, the next implementation cycle should focus on the deferred work:

- Real mid-generation instruction injection instead of local-only system notes.
- Provider-native progress/telemetry in place of simulated thinking steps.
- Broader integration coverage for streaming metadata, badge rendering, and degraded research flows.

## Verification Commands

- `npm run test`
- `npm run lint`
- `npm run build`
