import React, { useState } from 'react';
import { X, Plus, Sparkles, KeyRound, CheckCircle2, AlertCircle, Save, Trash2 } from 'lucide-react';
import type {
  DateIdeaItem,
  HomeItem,
  RestaurantItem,
  SectionKey,
  SyncConfig,
  WinterItem,
} from '../types';
import {
  OPENAI_MODELS,
  aiFillEmptyFields,
  detectProvider,
  loadAiKey,
  loadOpenAiModel,
  saveAiKey,
  saveOpenAiModel,
} from '../utils/aiFill';

export type EditableItem = RestaurantItem | DateIdeaItem | WinterItem | HomeItem;

export interface BackgroundAddDraft {
  name: string;
  category: string;
  subType: string;
  area: string;
  travel: string;
  romance: string;
  budget: string;
  extra1: string;
  extra2: string;
  extra3: string;
  who: string;
  status: string;
  linkUrl: string;
  linkLabel: string;
  notes: string;
  rating: string;
  apiKey: string;
  openAiModel: string;
}

interface Props {
  section: SectionKey;
  syncCfg: SyncConfig;
  initialItem?: EditableItem | null;
  onClose: () => void;
  onSubmit: (section: SectionKey, payload: Record<string, unknown>) => Promise<void>;
  onBackgroundAiAdd: (section: SectionKey, draft: BackgroundAddDraft) => void;
  onDelete?: (section: SectionKey, item: EditableItem) => Promise<void>;
}

const AI_PH = '✨ Leave empty → auto-fill with AI';

function initFields(section: SectionKey, item?: EditableItem | null) {
  if (!item) {
    return {
      name: '',
      category: '',
      subType: '',
      area: '',
      travel: '',
      romance: '',
      budget: '',
      extra1: '',
      extra2: '',
      extra3: '',
      who: section === 'winter' ? 'Kitty' : 'Together',
      status: section === 'winter' ? 'To browse' : 'Idea',
      linkUrl: '',
      linkLabel: '',
      notes: '',
      rating: '',
    };
  }
  if (section === 'restaurants') {
    const r = item as RestaurantItem;
    return {
      name: r.name || '',
      category: r.cuisine || '',
      subType: '',
      area: r.area || '',
      travel: r.travel || '',
      romance: r.romance ? String(r.romance) : '',
      budget: r.budget !== null ? String(r.budget) : '',
      extra1: r.occasion || '',
      extra2: r.booking || '',
      extra3: r.mustTry || '',
      who: 'Together',
      status: r.status || 'Idea',
      linkUrl: r.linkUrl || '',
      linkLabel: r.linkLabel || '',
      notes: r.notes || '',
      rating: r.rating !== null ? String(r.rating) : '',
    };
  }
  if (section === 'dates') {
    const d = item as DateIdeaItem;
    return {
      name: d.name || '',
      category: d.kind || '',
      subType: '',
      area: d.area || '',
      travel: d.travel || '',
      romance: d.romance ? String(d.romance) : '',
      budget: d.budget !== null ? String(d.budget) : '',
      extra1: d.timeNeeded || '',
      extra2: d.setting || '',
      extra3: d.bestMoment || '',
      who: 'Together',
      status: d.status || 'Idea',
      linkUrl: d.linkUrl || '',
      linkLabel: d.linkLabel || '',
      notes: d.notes || '',
      rating: d.rating !== null ? String(d.rating) : '',
    };
  }
  if (section === 'winter') {
    const w = item as WinterItem;
    return {
      name: w.storeOrPiece || '',
      category: w.item || '',
      subType: w.entryType || '',
      area: w.area || '',
      travel: '',
      romance: '',
      budget: w.price !== null ? String(w.price) : '',
      extra1: '',
      extra2: w.priority || '',
      extra3: w.requirements || '',
      who: w.forWho || 'Kitty',
      status: w.status || 'To browse',
      linkUrl: w.linkUrl || '',
      linkLabel: w.linkLabel || '',
      notes: w.notes || '',
      rating: '',
    };
  }
  const h = item as HomeItem;
  return {
    name: h.item || '',
    category: h.room || '',
    subType: h.when || '',
    area: '',
    travel: '',
    romance: '',
    budget: h.budget !== null ? String(h.budget) : '',
    extra1: h.store || '',
    extra2: h.priority || '',
    extra3: h.details || '',
    who: h.who || 'Together',
    status: h.status || 'Idea',
    linkUrl: h.linkUrl || '',
    linkLabel: h.linkLabel || '',
    notes: h.notes || '',
    rating: '',
  };
}

export const AddItemModal: React.FC<Props> = ({
  section,
  syncCfg,
  initialItem,
  onClose,
  onSubmit,
  onBackgroundAiAdd,
  onDelete,
}) => {
  const isEditing = Boolean(initialItem);
  const init = initFields(section, initialItem);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [autoFillOnSave, setAutoFillOnSave] = useState(!isEditing);
  const [apiKey, setApiKey] = useState(() => loadAiKey());
  const [openAiModel, setOpenAiModel] = useState(() => loadOpenAiModel());
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'ok' | 'info' | 'err'; text: string } | null>(null);
  const detectedProvider = detectProvider(apiKey);

  const [name, setName] = useState(init.name);
  const [category, setCategory] = useState(init.category);
  const [subType, setSubType] = useState(init.subType);
  const [area, setArea] = useState(init.area);
  const [travel, setTravel] = useState(init.travel);
  const [romance, setRomance] = useState<string>(init.romance);
  const [budget, setBudget] = useState(init.budget);
  const [extra1, setExtra1] = useState(init.extra1);
  const [extra2, setExtra2] = useState(init.extra2);
  const [extra3, setExtra3] = useState(init.extra3);
  const [who, setWho] = useState(init.who);
  const [status, setStatus] = useState(init.status);
  const [linkUrl, setLinkUrl] = useState(init.linkUrl);
  const [linkLabel, setLinkLabel] = useState(init.linkLabel);
  const [notes, setNotes] = useState(init.notes);
  const [rating, setRating] = useState(init.rating);

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
      const { data: filled, provider } = await aiFillEmptyFields(
        section,
        current,
        syncCfg,
        apiKey,
        openAiModel
      );

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

      setAiStatus({ type: 'ok', text: `Filled empty fields with ${provider} ♡ Review or tweak below!` });
      return filled;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NO_KEY') || msg.includes('No Gemini API key')) {
        setShowKeyBox(true);
        setAiStatus({
          type: 'info',
          text: 'Paste your OpenAI (sk-...) or Gemini (AIza...) API key below for instant AI fill — saved only in this browser.',
        });
      } else {
        setAiStatus({ type: 'err', text: msg });
      }
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  const triggerBackgroundAiAdd = () => {
    if (!name.trim()) {
      setAiStatus({ type: 'err', text: 'Type a name first so AI knows what to look up!' });
      return;
    }
    if (!apiKey.trim() && !syncCfg.endpointUrl) {
      setShowKeyBox(true);
      setAiStatus({
        type: 'info',
        text: 'Paste your OpenAI (sk-...) or Gemini (AIza...) API key above first so AI can fill in the background!',
      });
      return;
    }
    onBackgroundAiAdd(section, {
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
      who,
      status,
      linkUrl,
      linkLabel,
      notes,
      rating,
      apiKey,
      openAiModel,
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const hasEmpty = !category || !area || !budget || !extra3 || !notes;
    if (!isEditing && autoFillOnSave && hasEmpty && apiKey.trim()) {
      triggerBackgroundAiAdd();
      return;
    }
    setSaving(true);
    try {
      const pick = (manual: string, fallback = '') => manual.trim() || fallback;
      const pickNum = (manual: string): number | null =>
        manual.trim() && !Number.isNaN(Number(manual)) ? Number(manual) : null;

      const finalLinkUrl = pick(linkUrl, '');
      const finalLinkLabel = pick(
        linkLabel,
        finalLinkUrl ? (section === 'restaurants' ? `Menu · ${name.trim()}` : name.trim()) : ''
      );

      let payload: Record<string, unknown> = {};
      if (section === 'restaurants') {
        payload = {
          name: name.trim(),
          cuisine: pick(category),
          area: pick(area),
          travel: pick(travel),
          romance: pickNum(romance) ?? 0,
          budget: pickNum(budget),
          occasion: pick(extra1),
          booking: pick(extra2, 'Not checked'),
          mustTry: pick(extra3),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: pick(notes),
          rating: pickNum(rating),
        };
      } else if (section === 'dates') {
        payload = {
          name: name.trim(),
          kind: pick(category, 'Outing'),
          area: pick(area),
          travel: pick(travel),
          romance: pickNum(romance) ?? 0,
          budget: pickNum(budget),
          timeNeeded: pick(extra1),
          setting: pick(extra2, 'Either'),
          bestMoment: pick(extra3),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: pick(notes),
          rating: pickNum(rating),
        };
      } else if (section === 'winter') {
        payload = {
          item: pick(category, 'Winter jacket'),
          entryType: pick(subType, 'Specific item'),
          forWho: who,
          storeOrPiece: name.trim(),
          requirements: pick(extra3),
          price: pickNum(budget),
          area: pick(area),
          priority: pick(extra2, 'Must-have'),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: pick(notes),
        };
      } else {
        payload = {
          item: name.trim(),
          room: pick(category, 'Other'),
          when: pick(subType, 'First week'),
          priority: pick(extra2, 'Soon'),
          budget: pickNum(budget),
          store: pick(extra1),
          who,
          details: pick(extra3),
          status,
          linkLabel: finalLinkLabel,
          linkUrl: finalLinkUrl,
          notes: pick(notes),
        };
      }
      await onSubmit(section, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const titleMap: Record<SectionKey, string> = isEditing
    ? {
        restaurants: 'Edit restaurant ♡',
        dates: 'Edit date idea ♡',
        winter: 'Edit winter wardrobe item ♡',
        home: 'Edit home item ♡',
      }
    : {
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
              {detectedProvider === 'openai'
                ? 'OpenAI key saved ✓'
                : detectedProvider === 'gemini'
                  ? 'Gemini key saved ✓'
                  : 'Set OpenAI / Gemini key'}
            </button>
          </div>

          {showKeyBox && (
            <div className="rounded-2xl bg-[#FFF8FB] border border-[#EBCAD7] p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-[#8E3554]">
                  OpenAI or Gemini API Key (stored only in this browser):
                </p>
                {detectedProvider !== 'none' && (
                  <span className="rounded-full bg-[#E5F6EC] text-[#286B4E] px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    {detectedProvider === 'openai' ? 'OpenAI detected' : 'Gemini detected'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    saveAiKey(e.target.value);
                  }}
                  placeholder="sk-... (OpenAI) or AIza... (Gemini)"
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
              {detectedProvider === 'openai' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-[#8C6272] shrink-0">
                      OpenAI model:
                    </label>
                    <select
                      value={
                        OPENAI_MODELS.some((m) => m.id === openAiModel) ? openAiModel : '__custom__'
                      }
                      onChange={(e) => {
                        const v = e.target.value === '__custom__' ? '' : e.target.value;
                        setOpenAiModel(v);
                        if (v) saveOpenAiModel(v);
                      }}
                      className="flex-1 rounded-lg border border-[#E6C3D0] bg-white px-2.5 py-1 text-xs text-[#4A2C38]"
                    >
                      {OPENAI_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                      <option value="__custom__">Custom model ID…</option>
                    </select>
                  </div>
                  {!OPENAI_MODELS.some((m) => m.id === openAiModel) && (
                    <input
                      value={openAiModel}
                      onChange={(e) => {
                        setOpenAiModel(e.target.value);
                        saveOpenAiModel(e.target.value);
                      }}
                      placeholder="Type any OpenAI model ID, e.g. gpt-6.2-astra"
                      className="w-full rounded-lg border border-[#E6C3D0] bg-white px-2.5 py-1 text-xs text-[#4A2C38]"
                    />
                  )}
                </div>
              )}
              <p className="text-[11px] text-[#8C6272]">
                Paste an{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-[#9E3355]"
                >
                  OpenAI key
                </a>{' '}
                (<code className="bg-white px-1 rounded">sk-...</code> — uses live web search) or a{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold text-[#9E3355]"
                >
                  Gemini key
                </a>{' '}
                (<code className="bg-white px-1 rounded">AIza...</code>).
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
                    : ['Essential', 'Soon', 'Useful', 'Nice to have', 'Not sure']
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                Link label
              </label>
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="e.g. Menu · Dishoom"
                className={inputCls}
              />
            </div>
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

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div>
              {isEditing && initialItem && onDelete && (
                confirmDelete ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await onDelete(section, initialItem);
                          onClose();
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="rounded-full bg-[#C93B5B] hover:bg-[#AD2D4A] px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs font-semibold text-[#8C5366] hover:underline px-1.5 cursor-pointer"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-[#B3435E] hover:bg-[#FDEBF0] transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#8C5366] hover:bg-[#FDEBF0] transition cursor-pointer"
              >
                Cancel
              </button>
              {!isEditing && (
                <button
                  type="button"
                  onClick={triggerBackgroundAiAdd}
                  disabled={saving || aiLoading || !name.trim()}
                  title="Close popup right away, add the entry immediately, and fill all empty fields with AI in the background"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#9669A8] hover:bg-[#7E5290] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Fill with AI &amp; Add
                </button>
              )}
              <button
                type="submit"
                disabled={saving || aiLoading || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C95D7E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B24B6B] transition disabled:opacity-50 cursor-pointer"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add to list'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
