import type { SectionKey, SyncConfig } from '../types';

const STORAGE_GEMINI_KEY = 'kitty_bear_gemini_key_v1';

export function loadGeminiKey(): string {
  try {
    return localStorage.getItem(STORAGE_GEMINI_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGeminiKey(key: string) {
  const clean = key.trim();
  if (clean) localStorage.setItem(STORAGE_GEMINI_KEY, clean);
  else localStorage.removeItem(STORAGE_GEMINI_KEY);
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
  "priority": "one of: Essential | Soon | Cosy extra",
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

export async function aiFillEmptyFields(
  section: SectionKey,
  current: Record<string, unknown>,
  syncCfg: SyncConfig,
  browserApiKey: string
): Promise<Record<string, unknown>> {
  const prompt = buildPrompt(section, current);

  // Path 1: Browser-stored Gemini API key (Gemini 3.8 Flash + Google Search grounding)
  if (browserApiKey.trim()) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': browserApiKey.trim(),
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        tools: [{ type: 'google_search' }],
        input: prompt,
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errTxt.slice(0, 160)}`);
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

  // Path 2: Server-side Apps Script AI Fill (if GEMINI_API_KEY is set inside Code.gs)
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
    const json = await res.json();
    if (json.ok && json.text) {
      return extractJson(String(json.text));
    }
    throw new Error(json.error || 'No Gemini API key configured');
  }

  throw new Error('NO_KEY');
}
