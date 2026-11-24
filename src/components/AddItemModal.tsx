import React, { useState } from 'react';
import { X, Plus, Sparkles, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SectionKey, SyncConfig } from '../types';
import { aiFillEmptyFields, loadGeminiKey, saveGeminiKey } from '../utils/aiFill';

interface Props {
  section: SectionKey;
  syncCfg: SyncConfig;
  onClose: () => void;
  onSubmit: (section: SectionKey, payload: Record<string, unknown>) => Promise<void>;
}

const AI_PH = '✨ Leave empty → auto-fill with AI';

export const AddItemModal: React.FC<Props> = ({ section, syncCfg, onClose, onSubmit }) => {
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [autoFillOnSave, setAutoFillOnSave] = useState(true);
  const [geminiKey, setGeminiKey] = useState(() => loadGeminiKey());
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'ok' | 'info' | 'err'; text: string } | null>(null);

  // Fields (intentionally blank by default so AI auto-fill knows what's empty!)
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subType, setSubType] = useState('');
  const [area, setArea] = useState('');
  const [travel, setTravel] = useState('');
  const [romance, setRomance] = useState<string>('');
  const [budget, setBudget] = useState('');
  const [extra1, setExtra1] = useState(''); // Occasion / Time needed / Store
  const [extra2, setExtra2] = useState(''); // Booking / Setting / Priority
  const [extra3, setExtra3] = useState(''); // Must-try / Best moment / Requirements / Details
  const [who, setWho] = useState(section === 'winter' ? 'Kitty' : 'Together');
  const [status, setStatus] = useState(section === 'winter' ? 'To browse' : 'Idea');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState('');

  const runAiFill = async (): Promise<Record<string, unknown> | null> => {
    if (!name.trim()) {
      setAiStatus({ type: 'err', text: 'Type a name first so AI knows what to look up!' });
      return null;
    }
    setAiLoading(true);
    setAiStatus(null);
    try {
      const current = {
        name: name.trim(),
        category,
        subType,
        area,
        travel,
        romance,
        budget,
        extra1,
        extra2,
        extra3,
        linkUrl,
        notes,
      };
      const filled = await aiFillEmptyFields(section, current, syncCfg, geminiKey);

      // Apply ONLY to currently empty fields (never overwrite user input!)
      if (section === 'restaurants') {
        if (!category && filled.cuisine) setCategory(String(filled.cuisine));
        if (!area && filled.area) setArea(String(filled.area));
        if (!travel && filled.travel) setTravel(String(filled.travel));
        if (!romance && filled.romance) setRomance(String(filled.romance));
        if (!budget && filled.budget != null) setBudget(String(filled.budget));
        if (!extra1 && filled.occasion) setExtra1(String(filled.occasion));
        if (!extra2 && filled.booking) setExtra2(String(filled.booking));
        if (!extra3 && filled.mustTry) setExtra3(String(filled.mustTry));
        if (!linkUrl && filled.linkUrl) setLinkUrl(String(filled.linkUrl));
        if (!linkLabel && filled.linkLabel) setLinkLabel(String(filled.linkLabel));
        if (!notes && filled.notes) setNotes(String(filled.notes));
        if (!rating && filled.rating != null) setRating(String(filled.rating));
      } else if (section === 'dates') {
        if (!category && filled.kind) setCategory(String(filled.kind));
        if (!area && filled.area) setArea(String(filled.area));
        if (!travel && filled.travel) setTravel(String(filled.travel));
        if (!romance && filled.romance) setRomance(String(filled.romance));
        if (!budget && filled.budget != null) setBudget(String(filled.budget));
        if (!extra1 && filled.timeNeeded) setExtra1(String(filled.timeNeeded));
        if (!extra2 && filled.setting) setExtra2(String(filled.setting));
        if (!extra3 && filled.bestMoment) setExtra3(String(filled.bestMoment));
        if (!linkUrl && filled.linkUrl) setLinkUrl(String(filled.linkUrl));
        if (!linkLabel && filled.linkLabel) setLinkLabel(String(filled.linkLabel));
        if (!notes && filled.notes) setNotes(String(filled.notes));
      } else if (section === 'winter') {
        if (!category && filled.item) setCategory(String(filled.item));
        if (!subType && filled.entryType) setSubType(String(filled.entryType));
        if (!extra3 && filled.requirements) setExtra3(String(filled.requirements));
        if (!budget && filled.price != null) setBudget(String(filled.price));
        if (!area && filled.area) setArea(String(filled.area));
        if (!extra2 && filled.priority) setExtra2(String(filled.priority));
        if (!linkUrl && filled.linkUrl) setLinkUrl(String(filled.linkUrl));
        if (!linkLabel && filled.linkLabel) setLinkLabel(String(filled.linkLabel));
        if (!notes && filled.notes) setNotes(String(filled.notes));
      } else {
        if (!category && filled.room) setCategory(String(filled.room));
        if (!subType && filled.when) setSubType(String(filled.when));
        if (!extra2 && filled.priority) setExtra2(String(filled.priority));
        if (!budget && filled.budget != null) setBudget(String(filled.budget));
        if (!extra1 && filled.store) setExtra1(String(filled.store));
        if (!extra3 && filled.details) setExtra3(String(filled.details));
        if (!linkUrl && filled.linkUrl) setLinkUrl(String(filled.linkUrl));
        if (!linkLabel && filled.linkLabel) setLinkLabel(String(filled.linkLabel));
        if (!notes && filled.notes) setNotes(String(filled.notes));
      }

      setAiStatus({ type: 'ok', text: 'Filled empty fields with Gemini AI ♡ Review or tweak below!' });
      return filled;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NO_KEY') || msg.includes('No Gemini API key')) {
        setShowKeyBox(true);
        setAiStatus({
          type: 'info',
          text: 'Add a free Gemini API key below for instant AI fill—or just hit Add and we’ll tag it “✨ Pending AI fill” for your assistant!',
        });
      } else {
        setAiStatus({ type: 'err', text: msg });
      }
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Check if any key fields are empty and auto-fill with AI if enabled & key present
      const hasEmpty = !category || !area || !budget || !extra3 || !notes;
      let ai: Record<string, unknown> = {};
      let pendingTag = '';

      if (autoFillOnSave && hasEmpty) {
        if (geminiKey.trim()) {
          const filled = await runAiFill();
          if (filled) ai = filled;
        } else {
          // Try Apps Script server-side AI fill silently; if not configured, tag pending
          try {
            ai = await aiFillEmptyFields(
              section,
              { name: name.trim(), category, area, travel, budget, extra3, notes },
              syncCfg,
              ''
            );
          } catch {
            pendingTag = '✨ Pending AI fill';
          }
        }
      }

      const pick = (manual: string, aiVal: unknown, fallback = '') =>
        manual.trim() || (aiVal != null && String(aiVal).trim() ? String(aiVal).trim() : fallback);
      const pickNum = (manual: string, aiVal: unknown): number | null => {
        if (manual.trim()) return Number(manual);
        if (aiVal != null && !Number.isNaN(Number(aiVal))) return Number(aiVal);
        return null;
      };

      const finalNotes = pick(notes, ai.notes, pendingTag);
      const finalLinkUrl = pick(linkUrl, ai.linkUrl, '');
      const finalLinkLabel = pick(
        linkLabel,
        ai.linkLabel,
        finalLinkUrl ? (section === 'restaurants' ? `Menu · ${name.trim()}` : name.trim()) : ''
      );

      let payload: Record<string, unknown> = {};
      if (section === 'restaurants') {
        payload = {
          name: name.trim(),
          cuisine: pick(category, ai.cuisine),
          area: pick(area, ai.area),
          travel: pick(travel, ai.travel),
          romance: pickNum(romance, ai.romance) ?? 0,
          budget: pickNum(budget, ai.budget),
          occasion: pick(extra1, ai.occasion),
          booking: pick(extra2, ai.booking, 'Not checked'),
          mustTry: pick(extra3, ai.mustTry),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: finalNotes,
          rating: pickNum(rating, ai.rating),
        };
      } else if (section === 'dates') {
        payload = {
          name: name.trim(),
          kind: pick(category, ai.kind, 'Outing'),
          area: pick(area, ai.area),
          travel: pick(travel, ai.travel),
          romance: pickNum(romance, ai.romance) ?? 0,
          budget: pickNum(budget, ai.budget),
          timeNeeded: pick(extra1, ai.timeNeeded),
          setting: pick(extra2, ai.setting, 'Either'),
          bestMoment: pick(extra3, ai.bestMoment),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: finalNotes,
          rating: pickNum(rating, ai.rating),
        };
      } else if (section === 'winter') {
        payload = {
          item: pick(category, ai.item, 'Winter jacket'),
          entryType: pick(subType, ai.entryType, 'Specific item'),
          forWho: who,
          storeOrPiece: name.trim(),
          requirements: pick(extra3, ai.requirements),
          price: pickNum(budget, ai.price),
          area: pick(area, ai.area),
          priority: pick(extra2, ai.priority, 'Must-have'),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: finalNotes,
        };
      } else {
        payload = {
          item: name.trim(),
          room: pick(category, ai.room, 'Other'),
          when: pick(subType, ai.when, 'First week'),
          priority: pick(extra2, ai.priority, 'Soon'),
          budget: pickNum(budget, ai.budget),
          store: pick(extra1, ai.store),
          who,
          details: pick(extra3, ai.details),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: finalNotes,
        };
      }
      await onSubmit(section, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const titleMap: Record<SectionKey, string> = {
    restaurants: 'Add a restaurant ♡',
    dates: 'Add a date idea ♡',
    winter: 'Add winter wardrobe item ♡',
    home: 'Add home item ♡',
  };

  const inputCls =
    'w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2 text-sm text-[#4A2C38] placeholder:italic placeholder:text-[#B395A1] focus:outline-none focus:ring-2 focus:ring-[#D87B97]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A1E2B]/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FFFDFD] border border-[#ECC6D3] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#FDF0F4] px-6 py-4 border-b border-[#ECC6D3]">
          <h2 className="font-display text-xl font-bold text-[#9E3355]">{titleMap[section]}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8C5366] hover:bg-[#F7DCE5] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {/* AI Auto-fill tip bar */}
          <div className="rounded-2xl bg-[#FAF4FA] border border-[#E6D4EE] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-[#6E3E85] cursor-pointer">
              <input
                type="checkbox"
                checked={autoFillOnSave}
                onChange={(e) => setAutoFillOnSave(e.target.checked)}
                className="accent-[#9669A8] rounded cursor-pointer"
              />
              <span>✨ Auto-fill empty fields with AI</span>
            </label>
            <button
              type="button"
              onClick={() => setShowKeyBox((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8E5AA6] hover:underline cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              {geminiKey ? 'AI key saved ✓' : 'Set Gemini API key'}
            </button>
          </div>

          {showKeyBox && (
            <div className="rounded-2xl bg-[#FFF8FB] border border-[#EBCAD7] p-3.5 space-y-2 text-xs">
              <p className="font-bold text-[#8E3554]">
                Gemini API Key (saved only in this browser for instant ✨ AI fill):
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    saveGeminiKey(e.target.value);
                  }}
                  placeholder="AIza..."
                  className="flex-1 rounded-xl border border-[#E6C3D0] bg-white px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyBox(false)}
                  className="rounded-xl bg-[#C95D7E] text-white px-3 py-1.5 font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
              <p className="text-[11px] text-[#8C6272]">
                Free key from{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-[#9E3355]"
                >
                  Google AI Studio
                </a>{' '}
                (or add <code className="bg-white px-1 rounded">GEMINI_API_KEY</code> inside your
                Google Apps Script so both phones share it!).
              </p>
            </div>
          )}

          {/* Required Name + Instant Fill with AI button */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
              {section === 'restaurants'
                ? 'Restaurant name *'
                : section === 'dates'
                  ? 'Date idea *'
                  : section === 'winter'
                    ? 'Store or piece name *'
                    : 'Home item *'}
            </label>
            <div className="flex gap-2">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  section === 'restaurants'
                    ? 'Just type a name, e.g. Dishoom Shoreditch'
                    : section === 'dates'
                      ? 'Just type an idea, e.g. Barbican Conservatory'
                      : section === 'winter'
                        ? 'e.g. Patagonia Down With It Parka'
                        : 'e.g. Zojirushi mini rice cooker'
                }
                className="flex-1 rounded-xl border border-[#E6C3D0] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
              />
              <button
                type="button"
                onClick={runAiFill}
                disabled={aiLoading || !name.trim()}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#9669A8] hover:bg-[#7E5290] text-white px-3.5 py-2 text-xs font-bold shadow-xs transition disabled:opacity-45 cursor-pointer"
                title="Fill all empty fields automatically with AI"
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                {aiLoading ? 'Filling…' : 'Fill with AI'}
              </button>
            </div>
          </div>

          {aiStatus && (
            <div
              className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                aiStatus.type === 'ok'
                  ? 'bg-[#E5F6EC] text-[#286B4E]'
                  : aiStatus.type === 'info'
                    ? 'bg-[#F6F0FA] text-[#6B3E80]'
                    : 'bg-[#FDE8EC] text-[#A82D50]'
              }`}
            >
              {aiStatus.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{aiStatus.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                {section === 'restaurants'
                  ? 'Cuisine'
                  : section === 'dates'
                    ? 'Kind'
                    : section === 'winter'
                      ? 'Item category'
                      : 'Room'}
              </label>
              {section === 'restaurants' ? (
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={AI_PH}
                  className={inputCls}
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputCls} ${!category ? 'italic text-[#B395A1]' : ''}`}
                >
                  <option value="">✨ Auto-fill with AI</option>
                  {section === 'dates' &&
                    ['At home', 'Outing', 'Experience', 'Day trip', 'Other'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  {section === 'winter' &&
                    [
                      'Winter jacket',
                      'Winter shoes',
                      'Leggings / tights',
                      'Knitwear & layers',
                      'Accessories',
                      'Other',
                    ].map((o) => <option key={o}>{o}</option>)}
                  {section === 'home' &&
                    [
                      'Kitchen',
                      'Bedroom',
                      'Bathroom',
                      'Living room',
                      'Hallway / storage',
                      'Whole flat',
                      'Other',
                    ].map((o) => <option key={o}>{o}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                {section === 'winter'
                  ? 'Entry type'
                  : section === 'home'
                    ? 'When'
                    : 'Area / neighbourhood'}
              </label>
              {section === 'winter' ? (
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className={`${inputCls} ${!subType ? 'italic text-[#B395A1]' : ''}`}
                >
                  <option value="">✨ Auto-fill with AI</option>
                  {['Specific item', 'Physical store', 'Online store'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : section === 'home' ? (
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className={`${inputCls} ${!subType ? 'italic text-[#B395A1]' : ''}`}
                >
                  <option value="">✨ Auto-fill with AI</option>
                  {['Before move-in', 'First week', 'First month', 'Later'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={AI_PH}
                  className={inputCls}
                />
              )}
            </div>
          </div>

          {(section === 'restaurants' || section === 'dates') && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                  Travel from home
                </label>
                <input
                  value={travel}
                  onChange={(e) => setTravel(e.target.value)}
                  placeholder="✨ Leave empty → AI estimates route from Stratford"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                    Budget (£)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="✨ AI fills £"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                    Romance (1–5)
                  </label>
                  <select
                    value={romance}
                    onChange={(e) => setRomance(e.target.value)}
                    className={`${inputCls} ${!romance ? 'italic text-[#B395A1]' : ''}`}
                  >
                    <option value="">✨ AI fills ♡</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} ♡
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                    Google ★
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="✨ AI fills ★"
                    className={inputCls}
                  />
                </div>
              </div>
            </>
          )}

          {(section === 'winter' || section === 'home') && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                  Est. price (£)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="✨ AI fills £"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                  {section === 'winter' ? 'For' : 'Who'}
                </label>
                <select value={who} onChange={(e) => setWho(e.target.value)} className={inputCls}>
                  {(section === 'winter' ? ['Kitty', 'Bear', 'Both'] : ['Together', 'Kitty', 'Bear']).map(
                    (o) => (
                      <option key={o}>{o}</option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                  Priority
                </label>
                <select
                  value={extra2}
                  onChange={(e) => setExtra2(e.target.value)}
                  className={`${inputCls} ${!extra2 ? 'italic text-[#B395A1]' : ''}`}
                >
                  <option value="">✨ AI fills</option>
                  {(section === 'winter'
                    ? ['Must-have', 'Nice to have', 'Maybe']
                    : ['Essential', 'Soon', 'Cosy extra']
                  ).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                {section === 'restaurants'
                  ? 'Booking'
                  : section === 'dates'
                    ? 'Setting'
                    : section === 'winter'
                      ? 'Area / delivery'
                      : 'Store / where'}
              </label>
              {section === 'restaurants' ? (
                <select
                  value={extra2}
                  onChange={(e) => setExtra2(e.target.value)}
                  className={`${inputCls} ${!extra2 ? 'italic text-[#B395A1]' : ''}`}
                >
                  <option value="">✨ Auto-fill with AI</option>
                  {['Walk-in', 'Reserve', 'Booked', 'Not checked'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : section === 'dates' ? (
                <select
                  value={extra2}
                  onChange={(e) => setExtra2(e.target.value)}
                  className={`${inputCls} ${!extra2 ? 'italic text-[#B395A1]' : ''}`}
                >
                  <option value="">✨ Auto-fill with AI</option>
                  {['Indoor', 'Outdoor', 'Either'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={section === 'winter' ? area : extra1}
                  onChange={(e) => (section === 'winter' ? setArea(e.target.value) : setExtra1(e.target.value))}
                  placeholder={AI_PH}
                  className={inputCls}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                Status
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {(section === 'restaurants'
                  ? ['Idea', 'Shortlist', 'Planned', 'Tried']
                  : section === 'dates'
                    ? ['Idea', 'Shortlist', 'Planned', 'Done']
                    : section === 'winter'
                      ? ['To browse', 'To try on', 'Shortlist', 'Bought']
                      : ['Idea', 'Shortlist', 'Ordered', 'Got it']
                ).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          {(section === 'restaurants' || section === 'dates') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                {section === 'restaurants' ? 'Occasion' : 'Time needed'}
              </label>
              <input
                value={extra1}
                onChange={(e) => setExtra1(e.target.value)}
                placeholder={AI_PH}
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
              {section === 'restaurants'
                ? 'Must-try dishes'
                : section === 'dates'
                  ? 'Best moment'
                  : section === 'winter'
                    ? 'Requirements / material'
                    : 'Size / specs'}
            </label>
            <input
              value={extra3}
              onChange={(e) => setExtra3(e.target.value)}
              placeholder={AI_PH}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
              Website / menu / Google Maps link
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="✨ Leave empty → AI finds official menu / site"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={AI_PH}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#8C5366] hover:bg-[#FDEBF0] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || aiLoading}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C95D7E] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B24B6B] transition disabled:opacity-60 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Saving…' : 'Add to list'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
