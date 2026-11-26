interface Env {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const ALLOWED_ORIGINS = new Set([
  'http://dates.franekmat.com',
  'https://dates.franekmat.com',
  'https://franekmat.github.io',
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = isAllowedOrigin(origin) ? origin! : 'https://dates.franekmat.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

function extractOpenAiResponseText(json: Record<string, unknown>): string {
  if (typeof json.output_text === 'string' && json.output_text.trim()) {
    return json.output_text;
  }
  const output = Array.isArray(json.output) ? json.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const rec = item as { type?: string; content?: Array<{ type?: string; text?: string }> };
    if (rec.type === 'message' && Array.isArray(rec.content)) {
      for (const c of rec.content) {
        if ((c.type === 'output_text' || c.type === 'text') && typeof c.text === 'string') {
          parts.push(c.text);
        }
      }
    }
  }
  return parts.join('\n').trim();
}

async function callOpenAi(apiKey: string, prompt: string, model: string): Promise<string> {
  const targetModel = model.trim() || 'gpt-6.2-sol';
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      tools: [{ type: 'web_search' }],
      input: prompt,
    }),
  });

  if (res.ok) {
    const json = (await res.json()) as Record<string, unknown>;
    const text = extractOpenAiResponseText(json);
    if (!text) throw new Error('OpenAI returned an empty response');
    return text;
  }

  if (res.status === 400) {
    const fallback = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        input: prompt,
      }),
    });
    if (fallback.ok) {
      const json = (await fallback.json()) as Record<string, unknown>;
      const text = extractOpenAiResponseText(json);
      if (!text) throw new Error('OpenAI returned an empty response');
      return text;
    }
    const errTxt = await fallback.text();
    throw new Error(`OpenAI API error (${fallback.status}): ${errTxt.slice(0, 180)}`);
  }

  const errTxt = await res.text();
  throw new Error(`OpenAI API error (${res.status}): ${errTxt.slice(0, 180)}`);
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'gemini-3.8-flash',
      tools: [{ type: 'google_search' }],
      input: prompt,
    }),
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errTxt.slice(0, 180)}`);
  }
  const json = (await res.json()) as {
    output_text?: string;
    outputs?: Array<{ type?: string; text?: string }>;
  };
  const text =
    json.output_text ||
    (json.outputs || [])
      .filter((o) => o.type === 'text' && o.text)
      .map((o) => o.text)
      .join('\n');
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      const hasOpenAi = Boolean(env.OPENAI_API_KEY?.trim());
      const hasGemini = Boolean(env.GEMINI_API_KEY?.trim());
      return jsonResponse(
        {
          ok: true,
          configured: hasOpenAi || hasGemini,
          provider: hasOpenAi ? 'openai' : hasGemini ? 'gemini' : 'none',
        },
        200,
        origin
      );
    }

    if (url.pathname === '/ai-fill' && request.method === 'POST') {
      if (!isAllowedOrigin(origin)) {
        return jsonResponse({ ok: false, error: 'Origin not allowed' }, 403, origin);
      }

      let body: { prompt?: string; model?: string };
      try {
        body = (await request.json()) as { prompt?: string; model?: string };
      } catch {
        return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400, origin);
      }

      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt || prompt.length > 8000) {
        return jsonResponse({ ok: false, error: 'Prompt missing or too long' }, 400, origin);
      }

      const model =
        typeof body.model === 'string' && /^[a-zA-Z0-9._-]{2,64}$/.test(body.model.trim())
          ? body.model.trim()
          : 'gpt-6.2-sol';

      try {
        if (env.OPENAI_API_KEY?.trim()) {
          const text = await callOpenAi(env.OPENAI_API_KEY.trim(), prompt, model);
          return jsonResponse({ ok: true, text, provider: `OpenAI (${model})` }, 200, origin);
        }
        if (env.GEMINI_API_KEY?.trim()) {
          const text = await callGemini(env.GEMINI_API_KEY.trim(), prompt);
          return jsonResponse({ ok: true, text, provider: 'Gemini' }, 200, origin);
        }
        return jsonResponse({ ok: false, error: 'NO_KEY' }, 400, origin);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResponse({ ok: false, error: message }, 502, origin);
      }
    }

    return jsonResponse({ ok: false, error: 'Not found' }, 404, origin);
  },
};
