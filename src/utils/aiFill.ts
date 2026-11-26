import type { SectionKey, SyncConfig } from '../types';

const STORAGE_AI_KEY = 'kitty_bear_ai_key_v1';
const LEGACY_GEMINI_KEY = 'kitty_bear_gemini_key_v1';
const STORAGE_OPENAI_MODEL = 'kitty_bear_openai_model_v2';

export type AiProvider = 'openai' | 'gemini' | 'none';

export const OPENAI_MODELS = [
  { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol (recommended · fast + web search)' },
  { id: 'gpt-6.2-astra', label: 'GPT-6.2 Astra (flagship · deep research)' },
  { id: 'gpt-6.1-terra', label: 'GPT-6.1 Terra' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna (ultra-fast)' },
] as const;

export const DEFAULT_OPENAI_MODEL = 'gpt-6.2-sol';

export function detectProvider(key: string): AiProvider {
  const clean = key.trim();
  if (!clean) return 'none';
  if (clean.startsWith('sk-')) return 'openai';
  return 'gemini';
}

export function loadAiKey(): string {
  try {
    return localStorage.getItem(STORAGE_AI_KEY) || localStorage.getItem(LEGACY_GEMINI_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAiKey(key: string) {
  const clean = key.trim();
  if (clean) {
    localStorage.setItem(STORAGE_AI_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_AI_KEY);
    localStorage.removeItem(LEGACY_GEMINI_KEY);
  }
}

export function loadOpenAiModel(): string {
  try {
    return localStorage.getItem(STORAGE_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
  } catch {
    return DEFAULT_OPENAI_MODEL;
  }
}

export function saveOpenAiModel(model: string) {
  try {
    localStorage.setItem(STORAGE_OPENAI_MODEL, model);
  } catch {
    // ignore
  }
}

function buildPrompt(section: SectionKey, current: Record<string, unknown>): string {
  const baseRules = `You are filling missing fields for Kitty & Bear's London planning guide.
Their home is right next to Stratford Station (E20, London).
For "travel", estimate door-to-door time from Stratford (home) formatted like:
- "★ ~18 min · 6m walk + 7m Greater Anglia (Liverpool St) + 5m walk" (Tier 1 ★ = walk, Greater Anglia, Southeastern Highspeed, or direct Overground)
- "◆ ~27 min · 6m walk + 13m Elizabeth Line (Tottenham Ct Rd) + 8m walk" (Tier 2 ◆ = Elizabeth Line)
- "● ~26 min · 6m walk + 15m Jubilee Line (London Bridge) + 5m walk" (Tier 3 ● = direct Jubilee/Central/DLR)
- "○ ~45 min · ..." (Tier 4 ○ = requires transfer or out-of-London day trip)
Prioritise Greater Anglia / Overground / Highspeed (★) or Elizabeth Line (◆) whenever convenient.
Return ONLY a valid JSON object (no markdown fences, no commentary) containing ONLY the keys requested below. Keep strings concise and factual.`;

  if (section === 'restaurants') {
    return `${baseRules}
Restaurant info provided by user: ${JSON.stringify(current)}
Research this London restaurant and return JSON with keys:
{
  "cuisine": "short cuisine label e.g. Chinese, Dim Sum / Malaysian / Japanese / Italian / Seafood / Oysters",
  "area": "London neighbourhood e.g. Soho, Shoreditch, Stratford",
  "travel": "Tier symbol + door-to-door estimate & route from Stratford",
  "romance": 1-5 integer (1=casual, 3=nice, 5=very romantic/celebration),
  "budget": integer GBP estimate for dinner for two incl. typical mains/starter/service,
  "occasion": "short tag e.g. Casual / Date night / Celebration / Traditional Dim Sum",
  "booking": "one of: Walk-in | Reserve | Booked | Not checked",
  "mustTry": "2-4 signature dishes separated by commas",
  "linkLabel": "Menu · <Short Name>",
  "linkUrl": "official website or menu https URL (or empty string if unsure)",
  "notes": "1 concise helpful sentence (prices/vibe/tips)",
  "rating": number Google Maps rating out of 5 e.g. 4.6 (or null)
}`;
  }

  if (section === 'dates') {
    return `${baseRules}
Date idea provided by user: ${JSON.stringify(current)}
Research this London/UK date activity and return JSON with keys:
{
  "kind": "one of: At home | Outing | Experience | Day trip | Other",
  "area": "London area or destination",
  "travel": "Tier symbol + door-to-door estimate & route from Stratford (or '★ 0 min · Right at home ♡')",
  "romance": 1-5 integer,
  "budget": integer GBP estimate for two people,
  "timeNeeded": "e.g. 2 hours / Half day / Evening",
  "setting": "one of: Indoor | Outdoor | Either",
  "bestMoment": "e.g. Sunset / Friday evening / Sunday morning",
  "linkLabel": "short venue name",
  "linkUrl": "official https URL (or empty string if at home/unsure)",
  "notes": "1 concise helpful sentence"
}`;
  }

  if (section === 'winter') {
    return `${baseRules}
Winter wardrobe item/store provided by user: ${JSON.stringify(current)}
Return JSON with keys:
{
  "item": "one of: Winter jacket | Winter shoes | Leggings / tights | Knitwear & layers | Accessories | Other",
  "entryType": "one of: Specific item | Physical store | Online store",
  "requirements": "key warmth/material/style notes",
  "price": integer typical GBP price (or null for general store),
  "area": "e.g. Westfield Stratford (3m walk) & Regent St / Online",
  "priority": "one of: Must-have | Nice to have | Maybe",
  "linkLabel": "short label",
  "linkUrl": "official UK https URL (or empty string)",
  "notes": "1 concise shopping tip"
}`;
  }

  return `${baseRules}
Home item provided by user: ${JSON.stringify(current)}
Return JSON with keys:
{
  "room": "one of: Kitchen | Bedroom | Bathroom | Living room | Hallway / storage | Whole flat | Other",
  "when": "one of: Before move-in | First week | First month | Later",
  "priority": "one of: Essential | Soon | Useful | Nice to have | Not sure",
  "budget": integer realistic UK GBP estimate (or null),
  "store": "suggested UK store e.g. IKEA / John Lewis / Argos / Amazon",
  "details": "practical size/spec tip for a compact 2-person London flat",
  "linkLabel": "short label or empty",
  "linkUrl": "https URL or empty",
  "notes": "1 concise helpful note"
}`;
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain valid JSON');
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
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

async function callOpenAi(apiKey: string, prompt: string, model: string): Promise<Record<string, unknown>> {
  const targetModel = model.trim() || DEFAULT_OPENAI_MODEL;

  // Use OpenAI Responses API with native web_search so London venues/prices/ratings are fresh
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
    return extractJson(text);
  }

  // Fallback to Responses API without web_search if the chosen model/tier doesn't support it
  if (res.status === 400) {
    const fallbackRes = await fetch('https://api.openai.com/v1/responses', {
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
    if (fallbackRes.ok) {
      const json = (await fallbackRes.json()) as Record<string, unknown>;
      const text = extractOpenAiResponseText(json);
      if (!text) throw new Error('OpenAI returned an empty response');
      return extractJson(text);
    }
    const errTxt = await fallbackRes.text();
    throw new Error(`OpenAI API error (${fallbackRes.status}): ${errTxt.slice(0, 180)}`);
  }

  const errTxt = await res.text();
  throw new Error(`OpenAI API error (${res.status}): ${errTxt.slice(0, 180)}`);
}

async function callGemini(apiKey: string, prompt: string): Promise<Record<string, unknown>> {
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

  const json = await res.json();
  const outputs: Array<{ type?: string; text?: string }> = json.outputs || [];
  const text =
    json.output_text ||
    outputs
      .filter((o) => o.type === 'text' && o.text)
      .map((o) => o.text)
      .join('\n');

  if (!text) throw new Error('Gemini returned an empty response');
  return extractJson(text);
}

export async function aiFillEmptyFields(
  section: SectionKey,
  current: Record<string, unknown>,
  syncCfg: SyncConfig,
  browserApiKey: string,
  openAiModel = loadOpenAiModel()
): Promise<{ data: Record<string, unknown>; provider: string }> {
  const prompt = buildPrompt(section, current);
  const key = browserApiKey.trim();

  // Path 1: Browser-stored OpenAI (sk-...) or Gemini (AIza...) key
  if (key) {
    const provider = detectProvider(key);
    if (provider === 'openai') {
      const data = await callOpenAi(key, prompt, openAiModel);
      return { data, provider: `OpenAI (${openAiModel})` };
    }
    const data = await callGemini(key, prompt);
    return { data, provider: 'Gemini' };
  }

  // Path 2: Server-side Apps Script AI Fill (if key is set inside Code.gs)
  if (syncCfg.endpointUrl) {
    const res = await fetch(syncCfg.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'aiFill',
        passcode: syncCfg.passcode || '',
        prompt,
      }),
    });
    const text = await res.text();
    if (res.ok && !text.trimStart().startsWith('<')) {
      const json = JSON.parse(text) as { ok?: boolean; text?: string; error?: string };
      if (json.ok && json.text) {
        return { data: extractJson(String(json.text)), provider: 'AI' };
      }
      throw new Error(json.error || 'NO_KEY');
    }
  }

  throw new Error('NO_KEY');
}
