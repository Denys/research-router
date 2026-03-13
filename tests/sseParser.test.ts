import assert from 'node:assert/strict';

import { createSseParser } from '../src/lib/sse.ts';

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'createSseParser preserves JSON messages split across chunks',
    run: () => {
      const parser = createSseParser();
      const events: string[] = [];

      for (const line of parser.push('data: {"choices":[{"delta":{"content":"https://github.com/bartp')) {
        events.push(line);
      }
      for (const line of parser.push('leiter/ESP32Synth"}}],"citations":["https://github.com/bartpleiter/ESP32Synth"]}\n\n')) {
        events.push(line);
      }

      assert.equal(events.length, 1);
      assert.match(events[0], /bartpleiter\/ESP32Synth/);
    },
  },
  {
    name: 'createSseParser ignores non-data lines while preserving complete data payloads',
    run: () => {
      const parser = createSseParser();
      const lines = parser.push('event: message\ndata: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n');

      assert.deepEqual(lines, ['{"type":"content_block_delta","delta":{"text":"Hello"}}']);
    },
  },
];

for (const entry of tests) {
  entry.run();
  console.log(`PASS ${entry.name}`);
}
