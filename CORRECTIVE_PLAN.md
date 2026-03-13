# Corrective Plan

## Objective
Address reviewer feedback from the previous PR by restoring required task-history content and aligning non-conformity tracking with agreed product scope.

## Actions

1. **Restore removed lines in `research-router_task.md` (review comment resolution)**
   - Reinsert the section corresponding to prior lines 319–371.
   - Keep valid plain text only (no merge markers).
   - Preserve chronological instruction/answer history as requested by reviewer.

2. **Align scope notes with product decision**
   - Update `NON_CONFORMITIES.md` to reflect that OpenRouter/Groq are intentionally excluded.
   - Avoid classifying excluded providers as defects.

3. **Validation checks**
   - Confirm no conflict markers remain in `research-router_task.md`.
   - Review final tail of file to ensure restored block is present and readable.

4. **Delivery**
   - Commit the above documentation corrections in one focused commit.
   - Open PR with explicit mention that the inline comment was addressed.

## Follow-up (next implementation cycle)
- Convert mid-generation instruction input from local note behavior to real-time server-side continuation control.
- Replace synthetic thinking stream with provider-native progress telemetry where available.
- Add routing-policy tests for web-grounded vs model-only vs fallback labels.
