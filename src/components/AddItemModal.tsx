import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { SectionKey } from '../types';

interface Props {
  section: SectionKey;
  onClose: () => void;
  onSubmit: (section: SectionKey, payload: Record<string, unknown>) => Promise<void>;
}

export const AddItemModal: React.FC<Props> = ({ section, onClose, onSubmit }) => {
  const [saving, setSaving] = useState(false);

  // Shared / section-specific fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState(
    section === 'restaurants'
      ? 'Chinese, Dim Sum'
      : section === 'dates'
        ? 'Outing'
        : section === 'winter'
          ? 'Winter jacket'
          : 'Kitchen'
  );
  const [subType, setSubType] = useState(
    section === 'winter' ? 'Physical store' : section === 'home' ? 'First week' : ''
  );
  const [area, setArea] = useState('');
  const [travel, setTravel] = useState('');
  const [romance, setRomance] = useState<number>(3);
  const [budget, setBudget] = useState('');
  const [extra1, setExtra1] = useState(''); // Occasion / Time needed / Store / For
  const [extra2, setExtra2] = useState(
    section === 'restaurants'
      ? 'Reserve'
      : section === 'dates'
        ? 'Indoor'
        : section === 'winter'
          ? 'Must-have'
          : 'Soon'
  );
  const [extra3, setExtra3] = useState(''); // Must-try / Best moment / Requirements / Details
  const [who, setWho] = useState(section === 'winter' ? 'Kitty' : 'Together');
  const [status, setStatus] = useState(section === 'winter' ? 'To browse' : 'Idea');
  const [linkUrl, setLinkUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      let payload: Record<string, unknown> = {};
      if (section === 'restaurants') {
        payload = {
          name: name.trim(),
          cuisine: category.trim(),
          area: area.trim(),
          travel: travel.trim(),
          romance,
          budget: budget ? Number(budget) : null,
          occasion: extra1.trim(),
          booking: extra2,
          mustTry: extra3.trim(),
          status,
          linkLabel: linkUrl ? `Menu · ${name.trim()}` : '',
          linkUrl: linkUrl.trim(),
          notes: notes.trim(),
          rating: rating ? Number(rating) : null,
        };
      } else if (section === 'dates') {
        payload = {
          name: name.trim(),
          kind: category,
          area: area.trim(),
          travel: travel.trim(),
          romance,
          budget: budget ? Number(budget) : null,
          timeNeeded: extra1.trim(),
          setting: extra2,
          bestMoment: extra3.trim(),
          status,
          linkLabel: linkUrl ? name.trim() : '',
          linkUrl: linkUrl.trim(),
          notes: notes.trim(),
          rating: rating ? Number(rating) : null,
        };
      } else if (section === 'winter') {
        payload = {
          item: category,
          entryType: subType,
          forWho: who,
          storeOrPiece: name.trim(),
          requirements: extra3.trim(),
          price: budget ? Number(budget) : null,
          area: area.trim(),
          priority: extra2,
          status,
          linkLabel: linkUrl ? name.trim() : '',
          linkUrl: linkUrl.trim(),
          notes: notes.trim(),
        };
      } else {
        payload = {
          item: name.trim(),
          room: category,
          when: subType,
          priority: extra2,
          budget: budget ? Number(budget) : null,
          store: extra1.trim(),
          who,
          details: extra3.trim(),
          status,
          linkLabel: linkUrl ? name.trim() : '',
          linkUrl: linkUrl.trim(),
          notes: notes.trim(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A1E2B]/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FFFDFD] border border-[#ECC6D3] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#FDF0F4] px-6 py-4 border-b border-[#ECC6D3]">
          <h2 className="font-display text-xl font-bold text-[#9E3355]">{titleMap[section]}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8C5366] hover:bg-[#F7DCE5] transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
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
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                section === 'restaurants'
                  ? 'e.g. Royal China, Three Uncles...'
                  : section === 'dates'
                    ? 'e.g. Sunset walk along Regent’s Canal'
                    : section === 'winter'
                      ? 'e.g. Uniqlo Seamless Down Coat'
                      : 'e.g. Compact rice cooker'
              }
              className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
            />
          </div>

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
                  placeholder="Malaysian, Chinese, Dim Sum..."
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
                >
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
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                >
                  {['Specific item', 'Physical store', 'Online store'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : section === 'home' ? (
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                >
                  {['Before move-in', 'First week', 'First month', 'Later'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Soho, Shoreditch, Stratford"
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
                />
              )}
            </div>
          </div>

          {(section === 'restaurants' || section === 'dates') && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                  Travel from home (prefix ★ / ◆ / ● / ○)
                </label>
                <input
                  value={travel}
                  onChange={(e) => setTravel(e.target.value)}
                  placeholder="e.g. ★ ~20 min · 6m walk + 7m Greater Anglia + 7m walk"
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
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
                    placeholder="55"
                    className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                    Romance (1–5)
                  </label>
                  <select
                    value={romance}
                    onChange={(e) => setRomance(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
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
                    placeholder="4.6"
                    className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
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
                  placeholder="80"
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                  {section === 'winter' ? 'For' : 'Who'}
                </label>
                <select
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                >
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
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                >
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
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                >
                  {['Walk-in', 'Reserve', 'Booked', 'Not checked'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : section === 'dates' ? (
                <select
                  value={extra2}
                  onChange={(e) => setExtra2(e.target.value)}
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                >
                  {['Indoor', 'Outdoor', 'Either'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={section === 'winter' ? area : extra1}
                  onChange={(e) => (section === 'winter' ? setArea(e.target.value) : setExtra1(e.target.value))}
                  placeholder={section === 'winter' ? 'Westfield Stratford / Online' : 'IKEA / John Lewis / Amazon'}
                  className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
              >
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
                placeholder={section === 'restaurants' ? 'Casual / Date night / Celebration' : '2–3 hours / Half day'}
                className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
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
              placeholder={
                section === 'restaurants'
                  ? 'e.g. Chicken feet, custard buns, smooth congee'
                  : section === 'dates'
                    ? 'e.g. Sunset / Friday evening'
                    : section === 'winter'
                      ? 'e.g. Light-coloured, genuine down, warm'
                      : 'e.g. Max 60×50 cm'
              }
              className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
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
              placeholder="https://..."
              className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
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
              placeholder="Any helpful tips or details..."
              className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#8C5366] hover:bg-[#FDEBF0] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#C95D7E] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B24B6B] transition disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Saving...' : 'Add to list'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
