import React from 'react';
import { X, Shuffle, ExternalLink, MapPin, Train } from 'lucide-react';
import type { DateIdeaItem, RestaurantItem } from '../types';

interface Props {
  item: RestaurantItem | DateIdeaItem;
  isRestaurant: boolean;
  onReroll: () => void;
  onClose: () => void;
}

export const SurpriseModal: React.FC<Props> = ({ item, isRestaurant, onReroll, onClose }) => {
  const rest = isRestaurant ? (item as RestaurantItem) : null;
  const date = !isRestaurant ? (item as DateIdeaItem) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A1E2B]/45 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#FFFDFD] border-2 border-[#EAB8C9] shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#FDF0F4] via-[#FCE6EE] to-[#FDF0F4] px-6 py-4 flex items-center justify-between border-b border-[#F0CED9]">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#B04569]">
            ✧ Tonight&apos;s Surprise Pick ♡
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#8C5366] hover:bg-white/70 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div>
            <span className="inline-block rounded-full bg-[#FDE8F0] px-3 py-1 text-xs font-bold text-[#A6355C] mb-2">
              {rest ? rest.cuisine : date?.kind}
            </span>
            <h3 className="font-display text-2xl font-bold text-[#6B253E]">{item.name}</h3>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-[#8C5366]">
              <MapPin className="w-3.5 h-3.5" />
              {item.area}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
            {item.budget !== null && (
              <span className="rounded-full bg-[#FFF4E8] text-[#9A5A22] px-3 py-1">
                £{item.budget} for two
              </span>
            )}
            {item.romance > 0 && (
              <span className="rounded-full bg-[#FCE0EB] text-[#9E2952] px-3 py-1">
                {item.romance} ♡ romance
              </span>
            )}
            {item.rating && (
              <span className="rounded-full bg-[#FBF0C9] text-[#8A5810] px-3 py-1">
                {item.rating.toFixed(1)} ★ Google
              </span>
            )}
          </div>

          {item.travel && (
            <div className="rounded-2xl bg-[#F4FAF6] border border-[#D4EBD9] px-4 py-2.5 text-xs text-[#2B6E52] flex items-center justify-center gap-1.5">
              <Train className="w-3.5 h-3.5 shrink-0" />
              <span>{item.travel}</span>
            </div>
          )}

          {(rest?.mustTry || date?.bestMoment) && (
            <p className="text-sm text-[#5C3A47] bg-[#FFF8FA] rounded-2xl p-3 border border-[#F3DCE4]">
              <strong className="text-[#9E3355]">
                {rest ? 'Must-try: ' : 'Best moment: '}
              </strong>
              {rest ? rest.mustTry : date?.bestMoment}
            </p>
          )}

          {item.notes && <p className="text-xs italic text-[#7D5766]">{item.notes}</p>}

          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              onClick={onReroll}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FDEBF0] border border-[#E5B2C3] px-5 py-2.5 text-sm font-bold text-[#9E3355] hover:bg-[#FADBE5] transition"
            >
              <Shuffle className="w-4 h-4" />
              Spin again
            </button>
            {item.linkUrl && (
              <a
                href={item.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C95D7E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B24B6B] transition"
              >
                <ExternalLink className="w-4 h-4" />
                {item.linkLabel || 'Open link'}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
