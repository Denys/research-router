# Research Router non-conformities (requested vs implemented)

## Verified gaps

1. **Prompt-time provider gating by configured keys is missing**.
   - Request: models/providers should become selectable once corresponding key is configured.
   - Current: providers can be selected in UI regardless of key presence; key failures happen only at request-time from API errors.

2. **Mid-generation instruction injection is only partially implemented**.
   - Request: add instructions into the _current_ research process while model is still processing.
   - Current: UI accepts extra instructions, but they are appended as local system notes and are not injected into already-running provider streams.

3. **Thinking/search visualization is simulated, not provider-grounded**.
   - Request: visualize real ongoing thinking/search process.
   - Current: backend emits synthetic "thinking steps"; this can diverge from actual provider/tool operations.

4. **Research router policy is incomplete vs original spec**.
   - Missing from implementation: fallback warning badge semantics, robust routing classifier for "current/latest/news/prices/laws/releases" signals, and explicit web-grounded vs fallback labeling logic tied to actual retrieval.

5. **Provider coverage is narrower than requested in original product brief**.
   - Missing adapters/UI for OpenRouter and Groq.

## Fixes completed in this pass

1. **Resolved task-file conflict artifact** by removing Git conflict markers from `research-router_task.md`.
2. **Fixed provider selection behavior for active conversations** so selected providers at send-time are used and persisted for that turn (parallel runs now reflect current top control selections).
3. **Added Anthropic extended-thinking budget slider plumbing** (UI + context state + backend request mapping with bounds).
