import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        config: { systemInstruction }
      });

      res.json({ optimizedPrompt: response.text });
    } catch (error: any) {
      console.error('Optimize Prompt Error:', error);
      res.status(500).json({ error: 'Failed to optimize prompt' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, provider, model, mode, sources, keys, extendedThinking, shoppingResearch, anthropicThinkingBudget } = req.body;
      
      // Basic routing logic
      const activeProvider = provider || 'perplexity';
      const activeModel = model || (
        activeProvider === 'perplexity' ? 'sonar-pro' :
        activeProvider === 'openai' ? 'gpt-5.4-thinking' :
        activeProvider === 'anthropic' ? 'claude-4.6-sonnet' :
        'gemini-3.1-pro-preview'
      );

      // Map mock models to real models
      let realModel = activeModel;
      if (activeProvider === 'openai') {
        if (activeModel === 'gpt-5.4-thinking') realModel = 'o3-mini';
        else if (activeModel === 'gpt-5.3-instant') realModel = 'gpt-4o';
        else if (activeModel === 'gpt-5.2-thinking') realModel = 'o1-mini';
        else if (activeModel === 'gpt-5.2-instant') realModel = 'gpt-4o-mini';
      } else if (activeProvider === 'anthropic') {
        if (activeModel === 'claude-4.6-sonnet') realModel = 'claude-3-7-sonnet-20250219';
        else if (activeModel === 'claude-4.6-opus') realModel = 'claude-3-opus-20240229';
        else if (activeModel === 'claude-4.5-haiku') realModel = 'claude-3-5-haiku-20241022';
      }

      // Inject sources instruction if present
      if (sources && sources.length > 0) {
        const systemMsg = messages.find((m: any) => m.role === 'system');
        if (systemMsg) {
          systemMsg.content += `\n\nCRITICAL INSTRUCTION: Focus your search and response primarily on the following sources: ${sources.join(', ')}.`;
          if (sources.includes('shopping') || shoppingResearch) {
            systemMsg.content += `\nAlso, perform deep shopping research, comparing prices, reviews, and availability.`;
          }
        }
      }
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Simulate thinking process
      const isThinkingModel = activeModel.includes('thinking') || activeModel.includes('sonnet') || activeModel.includes('opus') || activeModel.includes('haiku');
      if (isThinkingModel || extendedThinking) {
        const thinkingSteps = [
          "Analyzing request parameters...",
          "Formulating search strategy...",
          "Querying knowledge base...",
          "Evaluating sources...",
          "Synthesizing information...",
        ];
        
        const steps = extendedThinking ? [...thinkingSteps, "Performing deep reasoning...", "Cross-referencing facts...", "Finalizing output structure..."] : thinkingSteps;
        
        for (const step of steps) {
          res.write(`data: ${JSON.stringify({ thinking: step + '\n' })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      if (activeProvider === 'perplexity') {
        const apiKey = keys?.pplx || process.env.PPLX_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ error: 'Perplexity API key missing. Please configure it in settings.' })}\n\n`);
          res.end();
          return;
        }

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: activeModel,
            messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          res.write(`data: ${JSON.stringify({ error: `Perplexity Error: ${response.statusText}` })}\n\n`);
          res.end();
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  const text = data.choices[0]?.delta?.content || '';
                  const citations = data.citations || [];
                  res.write(`data: ${JSON.stringify({ text, citations })}\n\n`);
                } catch (e) {
                  // Ignore parse errors on incomplete chunks
                }
              }
            }
          }
        }
        res.end();
      } else if (activeProvider === 'gemini') {
        const apiKey = keys?.gemini || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ error: 'Gemini API key missing. Please configure it in settings.' })}\n\n`);
          res.end();
          return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const systemInstruction = messages.find((m: any) => m.role === 'system')?.content;
        const history = messages.filter((m: any) => m.role !== 'system');
        
        // Gemini expects alternating user/model messages. For simplicity, just send the last message if history is complex,
        // or format properly. Let's just use generateContentStream for the last message with history as context.
        const prompt = history.map((m: any) => `${m.role}: ${m.content}`).join('\n');

        try {
          const responseStream = await ai.models.generateContentStream({
            model: realModel,
            contents: prompt,
            config: {
              systemInstruction,
            }
          });

          for await (const chunk of responseStream) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        } catch (error: any) {
          res.write(`data: ${JSON.stringify({ error: `Gemini Error: ${error.message}` })}\n\n`);
        }
        res.end();
      } else if (activeProvider === 'openai') {
        const apiKey = keys?.openai || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ error: 'OpenAI API key missing. Please configure it in settings.' })}\n\n`);
          res.end();
          return;
        }

        const isOModel = realModel.startsWith('o1') || realModel.startsWith('o3');
        const reqBody: any = {
          model: realModel,
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
        };
        
        if (!isOModel) {
          reqBody.stream = true;
        } else if (realModel === 'o3-mini') {
          reqBody.reasoning_effort = extendedThinking ? 'high' : 'medium';
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          res.write(`data: ${JSON.stringify({ error: `OpenAI Error: ${response.statusText} - ${errText}` })}\n\n`);
          res.end();
          return;
        }

        if (isOModel) {
          const data = await response.json();
          const text = data.choices[0]?.message?.content || '';
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } else {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const data = JSON.parse(line.slice(6));
                    const text = data.choices[0]?.delta?.content || '';
                    res.write(`data: ${JSON.stringify({ text })}\n\n`);
                  } catch (e) {}
                }
              }
            }
          }
        }
        res.end();
      } else if (activeProvider === 'anthropic') {
        const apiKey = keys?.anthropic || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.write(`data: ${JSON.stringify({ error: 'Anthropic API key missing. Please configure it in settings.' })}\n\n`);
          res.end();
          return;
        }

        const systemMsg = messages.find((m: any) => m.role === 'system')?.content;
        const history = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: realModel,
            system: systemMsg,
            messages: history,
            max_tokens: 4096,
            stream: true,
            ...(extendedThinking && realModel.includes('sonnet') ? {
              thinking: {
                type: "enabled",
                budget_tokens: Math.min(Math.max(Number(anthropicThinkingBudget) || 2048, 1024), 8192)
              }
            } : {})
          }),
        });

        if (!response.ok) {
          res.write(`data: ${JSON.stringify({ error: `Anthropic Error: ${response.statusText}` })}\n\n`);
          res.end();
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('event: content_block_delta')) {
                // Anthropic streaming format is slightly different, we need to parse the data line that follows
                continue;
              }
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    res.write(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`);
                  }
                } catch (e) {}
              }
            }
          }
        }
        res.end();
      } else {
        res.write(`data: ${JSON.stringify({ error: `Provider ${activeProvider} not fully implemented yet.` })}\n\n`);
        res.end();
      }

    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
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
