export interface SseParser {
  push(chunk: string): string[];
}

export const createSseParser = (): SseParser => {
  let buffer = '';

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      return lines
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
        .map((line) => line.slice(6));
    },
  };
};
