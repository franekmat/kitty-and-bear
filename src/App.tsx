import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Shuffle,
  RefreshCw,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Train,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  Snowflake,
  Home as HomeIcon,
  X,
  Check,
} from 'lucide-react';
import type {
  AppData,
  DateIdeaItem,
  HomeItem,
  RestaurantItem,
  SectionKey,
  SyncConfig,
  TravelTier,
  WinterItem,
} from './types';
import {
  fetchLiveFromSheet,
  loadLocalData,
  loadSyncConfig,
  parseTravelMeta,
  pushAddItem,
  pushUpdateRomance,
  pushUpdateStatus,
  resetLocalData,
  saveLocalData,
  saveSyncConfig,
} from './utils/sheetSync';
import { AddItemModal } from './components/AddItemModal';
import { SyncModal } from './components/SyncModal';
import { SurpriseModal } from './components/SurpriseModal';

type SortField = 'budget' | 'romance' | 'rating' | 'travel' | 'name' | 'priority' | 'status';

const SECTION_THEMES: Record<
  SectionKey,
  {
    label: string;
    subtitle: string;
    accent: string;
    accentHover: string;
    softBg: string;
    softBorder: string;
    pillActiveBg: string;
    pillActiveText: string;
    icon: React.ReactNode;
  }
> = {
  restaurants: {
    label: 'Restaurants',
    subtitle: 'Places to share around London',
    accent: '#C46572',
    accentHover: '#A94F5C',
    softBg: '#FDF1EC',
    softBorder: '#E9C4B9',
    pillActiveBg: '#C46572',
    pillActiveText: '#FFFFFF',
    icon: <Utensils className="w-4 h-4" />,
  },
  dates: {
    label: 'Date ideas',
    subtitle: 'Outings, cosy nights & escapes',
    accent: '#C95D7E',
    accentHover: '#AE4968',
    softBg: '#FDF0F4',
    softBorder: '#EAC0CE',
    pillActiveBg: '#C95D7E',
    pillActiveText: '#FFFFFF',
    icon: <Sparkles className="w-4 h-4" />,
  },
  winter: {
    label: 'Winter wardrobe',
    subtitle: 'Physical stores, online shops & pieces',
    accent: '#9669A8',
    accentHover: '#7D538F',
    softBg: '#F6F0FA',
    softBorder: '#D9C2E5',
    pillActiveBg: '#9669A8',
    pillActiveText: '#FFFFFF',
    icon: <Snowflake className="w-4 h-4" />,
  },
  home: {
    label: 'Our home',
    subtitle: 'Remaining move-in essentials & cosy extras',
    accent: '#6B947C',
    accentHover: '#557A65',
    softBg: '#F0F7F2',
    softBorder: '#C4DDCD',
    pillActiveBg: '#6B947C',
    pillActiveText: '#FFFFFF',
    icon: <HomeIcon className="w-4 h-4" />,
  },
};

const TIER_META: Record<
  TravelTier,
  { symbol: string; label: string; bg: string; text: string; border: string }
> = {
  tier1: {
    symbol: '★',
    label: 'Walk / Surface Rail',
    bg: 'bg-[#EBF6EE]',
    text: 'text-[#2B6E52]',
    border: 'border-[#C4E3CD]',
  },
  tier2: {
    symbol: '◆',
    label: 'Elizabeth Line',
    bg: 'bg-[#F3ECFA]',
    text: 'text-[#5F3E8E]',
    border: 'border-[#D9C6EE]',
  },
  tier3: {
    symbol: '●',
    label: 'Direct Tube / DLR',
    bg: 'bg-[#FDF4E6]',
    text: 'text-[#8A5A22]',
    border: 'border-[#EED8B4]',
  },
  tier4: {
    symbol: '○',
    label: 'Change / Day Trip',
    bg: 'bg-[#F8EFF2]',
    text: 'text-[#7D5866]',
    border: 'border-[#E6CFD7]',
  },
};

const STATUS_CYCLE: Record<SectionKey, string[]> = {
  restaurants: ['Idea', 'Shortlist', 'Planned', 'Tried'],
  dates: ['Idea', 'Shortlist', 'Planned', 'Done'],
  winter: ['To browse', 'To try on', 'Shortlist', 'Bought'],
  home: ['Idea', 'Shortlist', 'Ordered', 'Got it'],
};

function statusBadgeStyle(status: string): string {
  switch (status) {
    case 'Shortlist':
      return 'bg-[#FFEEDB] text-[#A85824] border-[#F3D1AE]';
    case 'Planned':
    case 'To try on':
      return 'bg-[#FCDCE8] text-[#AE2C5B] border-[#F0B4CA]';
    case 'Ordered':
      return 'bg-[#E6F0FC] text-[#356099] border-[#C1D8F5]';
    case 'Tried':
    case 'Done':
    case 'Bought':
    case 'Got it':
      return 'bg-[#E2F5EB] text-[#2B6E52] border-[#B6E2CA]';
    default:
      return 'bg-[#F3EAFF] text-[#6E44A3] border-[#DFC9FA]';
  }
}

function priorityRank(p: string): number {
  const s = p.toLowerCase();
  if (s.includes('must') || s.includes('essential')) return 1;
  if (s.includes('soon')) return 2;
  if (s.includes('useful')) return 3;
  if (s.includes('nice') || s.includes('cosy')) return 4;
  if (s.includes('not sure')) return 5;
  return 6;
}

function priorityBadgeStyle(p: string): string {
  const s = p.toLowerCase();
  if (s.includes('must') || s.includes('essential')) return 'bg-[#FADCE6] text-[#9E2952]';
  if (s.includes('soon')) return 'bg-[#FDEFE2] text-[#9E5A28]';
  if (s.includes('useful')) return 'bg-[#E6F1FC] text-[#2F5D8C]';
  if (s.includes('nice') || s.includes('cosy')) return 'bg-[#E6F6EC] text-[#2D6A4F]';
  if (s.includes('not sure')) return 'bg-[#F1ECFA] text-[#664C8C]';
  return 'bg-[#F5EEF0] text-[#6E4B57]';
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadLocalData());
  const [syncCfg, setSyncCfg] = useState<SyncConfig>(() => loadSyncConfig());
  const [section, setSection] = useState<SectionKey>('restaurants');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<TravelTier[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedBookingOrSetting, setSelectedBookingOrSetting] = useState<string>('All');
  const [maxBudget, setMaxBudget] = useState<number>(250);
  const [minRomance, setMinRomance] = useState<number>(0);

  // Sort
  const [sortField, setSortField] = useState<SortField>('budget');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [surpriseItem, setSurpriseItem] = useState<RestaurantItem | DateIdeaItem | null>(null);

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast((cur) => (cur === text ? null : cur)), 3200);
  };

  // Auto-fetch live data on boot if Apps Script endpoint is configured
  useEffect(() => {
    if (!syncCfg.endpointUrl) return;
    setSyncing(true);
    fetchLiveFromSheet(syncCfg)
      .then((fresh) => {
        setData(fresh);
        setSyncState('ok');
        setSyncError(null);
      })
      .catch((err) => {
        setSyncState('error');
        setSyncError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setSyncing(false));
  }, []);

  // Reset section-specific filters on tab switch
  const switchSection = (next: SectionKey) => {
    setSection(next);
    setSelectedCats([]);
    setSelectedTiers([]);
    setSelectedStatuses([]);
    setSelectedBookingOrSetting('All');
    setMaxBudget(next === 'home' ? 1200 : next === 'winter' ? 500 : 250);
    setMinRomance(0);
    setSearch('');
    setSortField(next === 'restaurants' || next === 'dates' ? 'budget' : 'priority');
    setSortDir('asc');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'romance' || field === 'rating' ? 'desc' : 'asc');
    }
  };

  const toggleChip = <T,>(arr: T[], val: T, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCats([]);
    setSelectedTiers([]);
    setSelectedStatuses([]);
    setSelectedBookingOrSetting('All');
    setMaxBudget(section === 'home' ? 1200 : section === 'winter' ? 500 : 250);
    setMinRomance(0);
  };

  // Dynamic category chip lists per tab
  const categoryOptions = useMemo(() => {
    if (section === 'restaurants') {
      return Array.from(new Set(data.restaurants.map((r) => r.cuisine).filter(Boolean))).sort();
    }
    if (section === 'dates') {
      return Array.from(new Set(data.dates.map((d) => d.kind).filter(Boolean))).sort();
    }
    if (section === 'winter') {
      return Array.from(new Set(data.winter.map((w) => w.item).filter(Boolean))).sort();
    }
    return Array.from(new Set(data.home.map((h) => h.room).filter(Boolean))).sort();
  }, [section, data]);

  const budgetCap = section === 'home' ? 1200 : section === 'winter' ? 500 : 250;

  // Filtered & sorted arrays
  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.restaurants.filter((r) => {
      if (selectedCats.length && !selectedCats.includes(r.cuisine)) return false;
      if (selectedTiers.length && !selectedTiers.includes(r.travelTier)) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(r.status)) return false;
      if (selectedBookingOrSetting !== 'All' && r.booking !== selectedBookingOrSetting) return false;
      if (minRomance > 0 && r.romance < minRomance) return false;
      if (maxBudget < budgetCap && r.budget !== null && r.budget > maxBudget) return false;
      if (q) {
        const hay = `${r.name} ${r.cuisine} ${r.area} ${r.travel} ${r.mustTry} ${r.occasion} ${r.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'budget') return ((a.budget ?? 9999) - (b.budget ?? 9999)) * m;
      if (sortField === 'romance') return (a.romance - b.romance) * m;
      if (sortField === 'rating') return ((a.rating ?? 0) - (b.rating ?? 0)) * m;
      if (sortField === 'travel') return (a.travelMins - b.travelMins) * m;
      return a.name.localeCompare(b.name) * m;
    });
  }, [data.restaurants, selectedCats, selectedTiers, selectedStatuses, selectedBookingOrSetting, minRomance, maxBudget, budgetCap, search, sortField, sortDir]);

  const filteredDates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.dates.filter((d) => {
      if (selectedCats.length && !selectedCats.includes(d.kind)) return false;
      if (selectedTiers.length && !selectedTiers.includes(d.travelTier)) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(d.status)) return false;
      if (selectedBookingOrSetting !== 'All' && d.setting !== selectedBookingOrSetting) return false;
      if (minRomance > 0 && d.romance < minRomance) return false;
      if (maxBudget < budgetCap && d.budget !== null && d.budget > maxBudget) return false;
      if (q) {
        const hay = `${d.name} ${d.kind} ${d.area} ${d.travel} ${d.bestMoment} ${d.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'budget') return ((a.budget ?? 9999) - (b.budget ?? 9999)) * m;
      if (sortField === 'romance') return (a.romance - b.romance) * m;
      if (sortField === 'rating') return ((a.rating ?? 0) - (b.rating ?? 0)) * m;
      if (sortField === 'travel') return (a.travelMins - b.travelMins) * m;
      return a.name.localeCompare(b.name) * m;
    });
  }, [data.dates, selectedCats, selectedTiers, selectedStatuses, selectedBookingOrSetting, minRomance, maxBudget, budgetCap, search, sortField, sortDir]);

  const filteredWinter = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.winter.filter((w) => {
      if (selectedCats.length && !selectedCats.includes(w.item)) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(w.status)) return false;
      if (selectedBookingOrSetting !== 'All' && w.entryType !== selectedBookingOrSetting) return false;
      if (maxBudget < budgetCap && w.price !== null && w.price > maxBudget) return false;
      if (q) {
        const hay = `${w.item} ${w.entryType} ${w.forWho} ${w.storeOrPiece} ${w.requirements} ${w.area} ${w.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'budget') return ((a.price ?? 9999) - (b.price ?? 9999)) * m;
      if (sortField === 'priority') return (priorityRank(a.priority) - priorityRank(b.priority)) * m;
      if (sortField === 'status') return a.status.localeCompare(b.status) * m;
      return a.storeOrPiece.localeCompare(b.storeOrPiece) * m;
    });
  }, [data.winter, selectedCats, selectedStatuses, selectedBookingOrSetting, maxBudget, budgetCap, search, sortField, sortDir]);

  const filteredHome = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.home.filter((h) => {
      if (selectedCats.length && !selectedCats.includes(h.room)) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(h.status)) return false;
      if (selectedBookingOrSetting !== 'All' && h.when !== selectedBookingOrSetting) return false;
      if (maxBudget < budgetCap && h.budget !== null && h.budget > maxBudget) return false;
      if (q) {
        const hay = `${h.item} ${h.room} ${h.when} ${h.priority} ${h.store} ${h.details} ${h.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'budget') return ((a.budget ?? 99999) - (b.budget ?? 99999)) * m;
      if (sortField === 'priority') return (priorityRank(a.priority) - priorityRank(b.priority)) * m;
      if (sortField === 'status') return a.status.localeCompare(b.status) * m;
      return a.item.localeCompare(b.item) * m;
    });
  }, [data.home, selectedCats, selectedStatuses, selectedBookingOrSetting, maxBudget, budgetCap, search, sortField, sortDir]);

  const activeCount =
    section === 'restaurants'
      ? filteredRestaurants.length
      : section === 'dates'
        ? filteredDates.length
        : section === 'winter'
          ? filteredWinter.length
          : filteredHome.length;

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedCats.length > 0 ||
    selectedTiers.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedBookingOrSetting !== 'All' ||
    maxBudget < budgetCap ||
    minRomance > 0;

  // Cycle status with 1 tap + sync to Google Sheet if connected
  const handleCycleStatus = async (sec: SectionKey, id: string, currentStatus: string, row?: number) => {
    const cycle = STATUS_CYCLE[sec];
    const next = cycle[(cycle.indexOf(currentStatus) + 1) % cycle.length];

    const updated: AppData = {
      ...data,
      [sec]: (data[sec] as Array<{ id: string; status: string }>).map((item) =>
        item.id === id ? { ...item, status: next } : item
      ),
    } as AppData;
    setData(updated);
    saveLocalData(updated);

    if (syncCfg.endpointUrl && row) {
      const res = await pushUpdateStatus(syncCfg, sec, row, next);
      notify(res.synced ? `Marked “${next}” & synced to Sheet ♡` : `Updated locally (“${next}”)`);
    } else {
      notify(`Status → ${next}`);
    }
  };

  // Clickable romance hearts
  const handleSetRomance = async (
    sec: 'restaurants' | 'dates',
    id: string,
    newVal: number,
    row?: number
  ) => {
    const updated: AppData = {
      ...data,
      [sec]: data[sec].map((item) => (item.id === id ? { ...item, romance: newVal } : item)),
    } as AppData;
    setData(updated);
    saveLocalData(updated);
    if (syncCfg.endpointUrl && row) {
      await pushUpdateRomance(syncCfg, sec, row, newVal);
    }
  };

  // Manual add handler
  const handleAddItem = async (sec: SectionKey, payload: Record<string, unknown>) => {
    const res = await pushAddItem(syncCfg, sec, payload);
    const id = `${sec}-local-${Date.now()}`;
    const nextRow = res.row;

    let updated = { ...data };
    if (sec === 'restaurants') {
      const meta = parseTravelMeta(String(payload.travel || ''));
      const item: RestaurantItem = {
        id,
        row: nextRow,
        name: String(payload.name || ''),
        cuisine: String(payload.cuisine || ''),
        area: String(payload.area || ''),
        travel: String(payload.travel || ''),
        travelMins: meta.travelMins,
        travelTier: meta.travelTier,
        romance: Number(payload.romance || 0),
        budget: (payload.budget as number | null) ?? null,
        occasion: String(payload.occasion || ''),
        booking: String(payload.booking || ''),
        mustTry: String(payload.mustTry || ''),
        status: String(payload.status || 'Idea'),
        linkLabel: String(payload.linkLabel || ''),
        linkUrl: String(payload.linkUrl || ''),
        notes: String(payload.notes || ''),
        rating: (payload.rating as number | null) ?? null,
      };
      updated = { ...data, restaurants: [item, ...data.restaurants] };
    } else if (sec === 'dates') {
      const meta = parseTravelMeta(String(payload.travel || ''));
      const item: DateIdeaItem = {
        id,
        row: nextRow,
        name: String(payload.name || ''),
        kind: String(payload.kind || ''),
        area: String(payload.area || ''),
        travel: String(payload.travel || ''),
        travelMins: meta.travelMins,
        travelTier: meta.travelTier,
        romance: Number(payload.romance || 0),
        budget: (payload.budget as number | null) ?? null,
        timeNeeded: String(payload.timeNeeded || ''),
        setting: String(payload.setting || ''),
        bestMoment: String(payload.bestMoment || ''),
        status: String(payload.status || 'Idea'),
        linkLabel: String(payload.linkLabel || ''),
        linkUrl: String(payload.linkUrl || ''),
        notes: String(payload.notes || ''),
        rating: (payload.rating as number | null) ?? null,
      };
      updated = { ...data, dates: [item, ...data.dates] };
    } else if (sec === 'winter') {
      const item: WinterItem = {
        id,
        row: nextRow,
        item: String(payload.item || ''),
        entryType: String(payload.entryType || ''),
        forWho: String(payload.forWho || 'Kitty'),
        storeOrPiece: String(payload.storeOrPiece || ''),
        requirements: String(payload.requirements || ''),
        price: (payload.price as number | null) ?? null,
        area: String(payload.area || ''),
        priority: String(payload.priority || 'Must-have'),
        status: String(payload.status || 'To browse'),
        linkLabel: String(payload.linkLabel || ''),
        linkUrl: String(payload.linkUrl || ''),
        notes: String(payload.notes || ''),
      };
      updated = { ...data, winter: [item, ...data.winter] };
    } else {
      const item: HomeItem = {
        id,
        row: nextRow,
        item: String(payload.item || ''),
        room: String(payload.room || ''),
        when: String(payload.when || ''),
        priority: String(payload.priority || ''),
        budget: (payload.budget as number | null) ?? null,
        store: String(payload.store || ''),
        who: String(payload.who || 'Together'),
        details: String(payload.details || ''),
        status: String(payload.status || 'Idea'),
        linkLabel: String(payload.linkLabel || ''),
        linkUrl: String(payload.linkUrl || ''),
        notes: String(payload.notes || ''),
      };
      updated = { ...data, home: [item, ...data.home] };
    }

    setData(updated);
    saveLocalData(updated);
    notify(res.synced ? 'Added & synced straight to Google Sheet ♡' : 'Added locally (connect Sync to push to Sheet)');
  };

  const handleSurprise = () => {
    const pool = section === 'dates' ? filteredDates : filteredRestaurants;
    if (!pool.length) {
      notify('No matching items to spin — try loosening a filter!');
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSurpriseItem(pick);
  };

  const handleManualRefresh = async () => {
    if (!syncCfg.endpointUrl) {
      setShowSync(true);
      return;
    }
    setSyncing(true);
    try {
      const fresh = await fetchLiveFromSheet(syncCfg);
      setData(fresh);
      setSyncState('ok');
      setSyncError(null);
      notify('Pulled latest updates from Google Sheet ♡');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSyncState('error');
      setSyncError(message);
      notify(`Sync failed — click “Sync needs access” for fix`);
    } finally {
      setSyncing(false);
    }
  };

  const theme = SECTION_THEMES[section];

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-55" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const isCompact = viewMode === 'table';

  const romanceCellBg = (n: number) => {
    if (n >= 5) return 'bg-[#F8C8DA] text-[#8E1F47] font-extrabold';
    if (n === 4) return 'bg-[#FDE0EB] text-[#A8325B] font-extrabold';
    if (n === 3) return 'bg-[#FDECF2] text-[#8E3856] font-bold';
    if (n === 2) return 'bg-[#FFF4F0] text-[#7D4E5D]';
    if (n === 1) return 'bg-[#FDF3E9] text-[#78574E]';
    return '';
  };

  const starCellBg = (r: number | null) => {
    if (!r) return '';
    if (r >= 4.7) return 'bg-[#FBF0C9] text-[#8A5810] font-extrabold';
    if (r >= 4.5) return 'bg-[#FDF6DF] text-[#96661E] font-bold';
    return 'bg-[#FAF5F2] text-[#7D635B]';
  };

  return (
    <div className="min-h-screen bg-[#FFF9FA] pb-20">
      {/* Top stationery ribbon */}
      <div className="h-2 w-full" style={{ backgroundColor: theme.accent }} />

      {/* Storybook Hero Header (automatically slims down in Compact Sheet view!) */}
      <header className={`${isCompact ? 'max-w-[1440px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 pt-4 transition-all`}>
        {isCompact ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FDF0F4] border border-[#ECC6D3] px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-3">
              <img
                src="./kitty-and-bear.jpg"
                alt="Kitty & Bear"
                className="w-20 h-14 object-contain rounded-xl mix-blend-multiply"
              />
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#8E2B4B] leading-tight">
                  Kitty &amp; Bear <span className="text-[#D46A8A]">♡</span>
                </h1>
                <p className="font-editorial italic text-xs text-[#7E4D5E]">
                  {theme.subtitle}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-white border-2 border-[#DFAAC0] p-0.5 text-xs font-extrabold shadow-2xs">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition cursor-pointer ${
                    !isCompact ? 'bg-[#C95D7E] text-white shadow-2xs' : 'text-[#8C5366] hover:text-[#6B253E]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards View</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition cursor-pointer ${
                    isCompact ? 'bg-[#C95D7E] text-white shadow-2xs' : 'text-[#8C5366] hover:text-[#6B253E]'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Compact Sheet</span>
                </button>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer"
                style={{ backgroundColor: theme.accent }}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
              {(section === 'restaurants' || section === 'dates') && (
                <button
                  onClick={handleSurprise}
                  className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E5B4C5] px-3 py-1.5 text-xs font-bold text-[#9E3355] hover:bg-[#FFF5F8] transition cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" /> Surprise
                </button>
              )}
              <button
                onClick={() => setShowSync(true)}
                title={syncError || 'Configure Google Sheet live sync'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  syncState === 'error'
                    ? 'bg-[#FFF5E6] border-[#F0C28A] text-[#9A5316] hover:bg-[#FFEDD6]'
                    : 'bg-white/90 border-[#E8C0CE] text-[#7E4D5E] hover:bg-white'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncState === 'ok'
                      ? 'bg-[#34A86B]'
                      : syncState === 'error'
                        ? 'bg-[#E5922E]'
                        : 'bg-[#D99AB0]'
                  }`}
                />
                {syncState === 'ok'
                  ? 'Live Sync'
                  : syncState === 'error'
                    ? 'Sync needs access'
                    : syncCfg.endpointUrl
                      ? 'Connecting…'
                      : 'Sheet Sync'}
              </button>
              {syncCfg.endpointUrl && (
                <button
                  onClick={handleManualRefresh}
                  className="rounded-full bg-white/90 border border-[#E8C0CE] p-1.5 text-[#7E4D5E] hover:bg-white transition cursor-pointer"
                  title="Refresh from Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              )}
              <a
                href={data.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#9E4968] hover:underline px-1.5"
              >
                Sheet <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
        <div className="relative overflow-hidden rounded-3xl bg-[#FDF0F4] border border-[#ECC6D3] shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            <div className="md:col-span-7 p-6 sm:p-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-[#EBC5D3] px-3.5 py-1 text-xs font-bold text-[#9E3355]">
                <span>Stratford, London</span>
                <span className="opacity-40">·</span>
                <span>Our shared guide ♡</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#8E2B4B]">
                Kitty &amp; Bear <span className="text-[#D46A8A]">♡</span>
              </h1>
              <p className="font-editorial italic text-sm sm:text-base text-[#7E4D5E] max-w-xl">
                Pick tonight&apos;s dinner, plan a cosy London outing, compare winter coats, or tick off our new home list.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  onClick={() => setShowAdd(true)}
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm transition cursor-pointer"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Plus className="w-4 h-4" />
                  Add {section === 'restaurants' ? 'restaurant' : section === 'dates' ? 'date idea' : section === 'winter' ? 'wardrobe item' : 'home item'}
                </button>

                {(section === 'restaurants' || section === 'dates') && (
                  <button
                    onClick={handleSurprise}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E5B4C5] px-4 py-2.5 text-sm font-bold text-[#9E3355] hover:bg-[#FFF5F8] transition cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4" />
                    Surprise us!
                  </button>
                )}

                <div className="inline-flex rounded-full bg-white border-2 border-[#DFAAC0] p-1 text-xs sm:text-sm font-extrabold shadow-2xs">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition cursor-pointer ${
                      !isCompact ? 'bg-[#C95D7E] text-white shadow-2xs' : 'text-[#8C5366] hover:text-[#6B253E]'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Cards View</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition cursor-pointer ${
                      isCompact ? 'bg-[#C95D7E] text-white shadow-2xs' : 'text-[#8C5366] hover:text-[#6B253E]'
                    }`}
                  >
                    <TableIcon className="w-4 h-4" />
                    <span>Compact Sheet</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowSync(true)}
                  title={syncError || 'Configure Google Sheet live sync'}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    syncState === 'error'
                      ? 'bg-[#FFF5E6] border-[#F0C28A] text-[#9A5316] hover:bg-[#FFEDD6]'
                      : 'bg-white/85 border-[#E8C0CE] text-[#7E4D5E] hover:bg-white'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncState === 'ok'
                        ? 'bg-[#34A86B]'
                        : syncState === 'error'
                          ? 'bg-[#E5922E]'
                          : 'bg-[#D99AB0]'
                    }`}
                  />
                  {syncState === 'ok'
                    ? 'Live Sheet Sync'
                    : syncState === 'error'
                      ? 'Sync needs access'
                      : syncCfg.endpointUrl
                        ? 'Connecting…'
                        : 'Connect Sheet Sync'}
                </button>

                {syncCfg.endpointUrl && (
                  <button
                    onClick={handleManualRefresh}
                    className="rounded-full bg-white/85 border border-[#E8C0CE] p-2.5 text-[#7E4D5E] hover:bg-white transition cursor-pointer"
                    title="Refresh from Google Sheet"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  </button>
                )}

                <a
                  href={data.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#9E4968] hover:underline px-2 py-1"
                >
                  Google Sheet <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Custom Polar Bear + White Kitty Storybook Illustration */}
            <div className="md:col-span-5 flex items-center justify-center bg-[#FDF0F4] px-4 pb-4 md:pb-0">
              <img
                src="./kitty-and-bear.jpg"
                alt="Fluffy white polar bear wearing a red scarf sitting beside a tiny white kitten with a pink bow"
                className="w-full max-w-[340px] md:max-w-[380px] h-auto object-contain rounded-2xl mix-blend-multiply"
              />
            </div>
          </div>
        </div>
        )}

        {/* 4 Section Tabs */}
        <nav className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(Object.keys(SECTION_THEMES) as SectionKey[]).map((key) => {
            const t = SECTION_THEMES[key];
            const active = section === key;
            const count =
              key === 'restaurants'
                ? data.restaurants.length
                : key === 'dates'
                  ? data.dates.length
                  : key === 'winter'
                    ? data.winter.length
                    : data.home.length;

            return (
              <button
                key={key}
                onClick={() => switchSection(key)}
                className={`flex items-center justify-between gap-1.5 rounded-2xl px-3 sm:px-4 py-3 text-left border transition cursor-pointer ${
                  active
                    ? 'shadow-sm text-white border-transparent'
                    : 'bg-white border-[#EFE0E6] text-[#5C3A47] hover:border-[#DFC2CD]'
                }`}
                style={active ? { backgroundColor: t.accent } : undefined}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  {t.icon}
                  <span className="font-bold text-xs sm:text-sm whitespace-nowrap">{t.label}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                    active ? 'bg-white/25 text-white' : 'bg-[#FDF0F4] text-[#9E3355]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className={`${isCompact ? 'max-w-[1440px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 mt-4 space-y-4 transition-all`}>
        {/* Boutique Storefront Filter & 1-Click Sort Bar */}
        <section
          className={`rounded-3xl border ${isCompact ? 'p-3.5 sm:p-4 space-y-2.5' : 'p-4 sm:p-5 space-y-4'} shadow-xs`}
          style={{ backgroundColor: theme.softBg, borderColor: theme.softBorder }}
        >
          {/* Row 1: Search + 1-Click Sort Buttons + View Toggle */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#A06B7D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  section === 'restaurants'
                    ? 'Search dish, area, Greater Anglia, oysters, dim sum...'
                    : section === 'dates'
                      ? 'Search area, Overground, indoor, Kew, sunset...'
                      : section === 'winter'
                        ? 'Search down coat, Westfield, Arket, merino...'
                        : 'Search room, rice cooker, desk, mirror...'
                }
                className="w-full rounded-full bg-white border border-[#E5C5D1] pl-10 pr-9 py-2.5 text-sm text-[#4A2C38] placeholder:text-[#AE8795] focus:outline-none focus:ring-2 focus:ring-[#D4839E]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A06B7D] hover:text-[#6B253E]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 1-Click Sort Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A6C] mr-1 inline-flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
              </span>
              {(section === 'restaurants'
                ? ([
                    ['budget', '£ Price'],
                    ['romance', '♡ Romance'],
                    ['rating', '★ Google'],
                    ['travel', '🚆 Travel'],
                    ['name', 'A–Z'],
                  ] as [SortField, string][])
                : section === 'dates'
                  ? ([
                      ['budget', '£ Price'],
                      ['romance', '♡ Romance'],
                      ['travel', '🚆 Travel'],
                      ['name', 'A–Z'],
                    ] as [SortField, string][])
                  : ([
                      ['priority', 'Priority'],
                      ['budget', '£ Price'],
                      ['status', 'Status'],
                      ['name', 'A–Z'],
                    ] as [SortField, string][])
              ).map(([field, label]) => {
                const active = sortField === field;
                return (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                      active
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-white text-[#5C3A47] border-[#E4C7D2] hover:bg-[#FFF9FB]'
                    }`}
                    style={active ? { backgroundColor: theme.accent } : undefined}
                  >
                    <span>{label}</span>
                    {renderSortIcon(field)}
                  </button>
                );
              })}

              {/* Prominent Card vs Compact Sheet View Switcher */}
              <div className="ml-1 inline-flex rounded-full bg-white border border-[#E4C7D2] p-0.5 text-xs font-bold">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition cursor-pointer ${
                    viewMode === 'cards' ? 'bg-[#FDF0F4] text-[#9E3355] shadow-2xs' : 'text-[#8C6A77] hover:text-[#6B253E]'
                  }`}
                  title="Card view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition cursor-pointer ${
                    viewMode === 'table' ? 'bg-[#FDF0F4] text-[#9E3355] shadow-2xs' : 'text-[#8C6A77] hover:text-[#6B253E]'
                  }`}
                  title="Compact spreadsheet view"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Compact sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Multi-Select Category Chips */}
          {categoryOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A6C] mr-1">
                {section === 'restaurants'
                  ? 'Cuisine:'
                  : section === 'dates'
                    ? 'Kind:'
                    : section === 'winter'
                      ? 'Item:'
                      : 'Room:'}
              </span>
              {categoryOptions.map((cat) => {
                const active = selectedCats.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleChip(selectedCats, cat, setSelectedCats)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition cursor-pointer ${
                      active
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-white/90 text-[#5C3A47] border-[#E6CBD5] hover:bg-white'
                    }`}
                    style={active ? { backgroundColor: theme.accent } : undefined}
                  >
                    {active && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          {/* Row 3: Transport Tiers + Budget Slider + Min Romance + Sub-filters */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1 border-t border-black/5">
            {(section === 'restaurants' || section === 'dates') && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A6C]">
                  Commute:
                </span>
                {(['tier1', 'tier2', 'tier3', 'tier4'] as TravelTier[]).map((tier) => {
                  const tm = TIER_META[tier];
                  const active = selectedTiers.includes(tier);
                  return (
                    <button
                      key={tier}
                      onClick={() => toggleChip(selectedTiers, tier, setSelectedTiers)}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold border transition cursor-pointer ${
                        active
                          ? `${tm.bg} ${tm.text} ${tm.border} ring-2 ring-offset-1 ring-[#D4839E]`
                          : 'bg-white/90 text-[#6B4A57] border-[#E6CBD5] hover:bg-white'
                      }`}
                    >
                      {tm.symbol} {tm.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Budget Slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A6C]">
                Max £:
              </span>
              <input
                type="range"
                min={section === 'home' ? 20 : 25}
                max={budgetCap}
                step={section === 'home' ? 20 : 5}
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-28 accent-[#C95D7E] cursor-pointer"
              />
              <span className="text-xs font-extrabold text-[#6B253E] min-w-[46px]">
                {maxBudget >= budgetCap ? 'Any' : `≤ £${maxBudget}`}
              </span>
            </div>

            {/* Min Romance Hearts */}
            {(section === 'restaurants' || section === 'dates') && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A6C] mr-1">
                  Romance:
                </span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMinRomance(minRomance === n ? 0 : n)}
                    className={`rounded-full px-2 py-0.5 text-xs font-bold border transition cursor-pointer ${
                      minRomance === n
                        ? 'bg-[#FCE0EB] text-[#9E2952] border-[#E092AE]'
                        : 'bg-white/90 text-[#8C5A6C] border-[#E6CBD5] hover:bg-white'
                    }`}
                  >
                    {n}♡+
                  </button>
                ))}
              </div>
            )}

            {/* Booking / Setting / EntryType / When quick select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#8C5A6C]">
                {section === 'restaurants'
                  ? 'Booking:'
                  : section === 'dates'
                    ? 'Setting:'
                    : section === 'winter'
                      ? 'Type:'
                      : 'When:'}
              </span>
              <select
                value={selectedBookingOrSetting}
                onChange={(e) => setSelectedBookingOrSetting(e.target.value)}
                className="rounded-full bg-white border border-[#E4C7D2] px-3 py-1 text-xs font-bold text-[#5C3A47] focus:outline-none"
              >
                <option value="All">Any</option>
                {(section === 'restaurants'
                  ? ['Walk-in', 'Reserve', 'Booked', 'Not checked']
                  : section === 'dates'
                    ? ['Indoor', 'Outdoor', 'Either']
                    : section === 'winter'
                      ? ['Specific item', 'Physical store', 'Online store']
                      : ['Before move-in', 'First week', 'First month', 'Later']
                ).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap items-center gap-1">
              {STATUS_CYCLE[section].map((st) => {
                const active = selectedStatuses.includes(st);
                return (
                  <button
                    key={st}
                    onClick={() => toggleChip(selectedStatuses, st, setSelectedStatuses)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold border transition cursor-pointer ${
                      active
                        ? `${statusBadgeStyle(st)} ring-2 ring-offset-1 ring-[#D4839E]`
                        : 'bg-white/80 text-[#7A5966] border-[#E6CBD5] hover:bg-white'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results summary bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C5A6C] pt-1">
            <span>
              Showing <strong className="text-[#6B253E]">{activeCount}</strong>{' '}
              {activeCount === 1 ? 'entry' : 'entries'}
              {section === 'restaurants' && filteredRestaurants.length > 0 && (
                <>
                  {' '}
                  · avg{' '}
                  <strong className="text-[#6B253E]">
                    £
                    {Math.round(
                      filteredRestaurants.reduce((s, x) => s + (x.budget ?? 0), 0) /
                        Math.max(1, filteredRestaurants.filter((x) => x.budget !== null).length)
                    )}
                  </strong>{' '}
                  for two
                </>
              )}
              <span className="hidden sm:inline opacity-75"> · Tap any status pill to update!</span>
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#9E3355] border border-[#E5B8C8] hover:bg-[#FFF5F8] transition cursor-pointer"
              >
                <X className="w-3 h-3" /> Reset filters
              </button>
            )}
          </div>
        </section>

        {/* Empty state */}
        {activeCount === 0 && (
          <div className="rounded-3xl bg-white border border-[#F0D5DF] p-12 text-center space-y-3">
            <p className="font-display text-xl font-bold text-[#9E3355]">
              No matching spots yet ♡
            </p>
            <p className="text-sm text-[#8C5A6C]">
              Try widening your budget slider, clearing a cuisine chip, or adding a brand-new pick!
            </p>
            <button
              onClick={clearFilters}
              className="rounded-full bg-[#FDEBF0] px-5 py-2 text-sm font-bold text-[#9E3355] hover:bg-[#FADBE5] transition cursor-pointer"
            >
              Show everything
            </button>
          </div>
        )}

        {/* RESTAURANTS — CARDS OR TABLE */}
        {section === 'restaurants' && activeCount > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRestaurants.map((r) => {
              const tm = TIER_META[r.travelTier];
              return (
                <article
                  key={r.id}
                  className="group flex flex-col justify-between rounded-3xl bg-white border border-[#F0D9D2] p-5 shadow-2xs hover:shadow-md hover:border-[#E2B4A8] transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="rounded-full bg-[#FDF1EC] text-[#993A48] px-2.5 py-0.5 text-[11px] font-bold">
                            {r.cuisine}
                          </span>
                          {r.occasion && (
                            <span className="rounded-full bg-[#FAF4F6] text-[#7D5866] px-2.5 py-0.5 text-[11px] font-semibold">
                              {r.occasion}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold text-[#6E2C36] leading-snug">
                          {r.name}
                        </h3>
                        <p className="text-xs text-[#8A585C] inline-flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {r.area}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCycleStatus('restaurants', r.id, r.status, r.row)}
                        title="Click to cycle status"
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition hover:scale-105 cursor-pointer ${statusBadgeStyle(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </button>
                    </div>

                    {/* Key metrics row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      {r.budget !== null && (
                        <span className="rounded-full bg-[#FFF4EC] text-[#8F4D2A] px-2.5 py-1">
                          £{r.budget} / 2
                        </span>
                      )}
                      {r.rating && (
                        <span className="rounded-full bg-[#FBF0C9] text-[#8A5810] px-2.5 py-1">
                          {r.rating.toFixed(1)} ★
                        </span>
                      )}
                      {r.booking && (
                        <span
                          className={`rounded-full px-2.5 py-1 ${
                            r.booking === 'Reserve'
                              ? 'bg-[#FDECE4] text-[#A84A32]'
                              : 'bg-[#FDF6E3] text-[#8C6A22]'
                          }`}
                        >
                          {r.booking}
                        </span>
                      )}
                      {/* Clickable Romance Hearts */}
                      <div className="inline-flex items-center gap-0.5 ml-auto" title="Click to set romance">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => handleSetRomance('restaurants', r.id, n, r.row)}
                            className={`text-sm leading-none transition hover:scale-125 cursor-pointer ${
                              n <= r.romance ? 'text-[#D64F7B]' : 'text-[#EBD0D9]'
                            }`}
                          >
                            ♥
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transport from home */}
                    {r.travel && (
                      <div
                        className={`rounded-2xl border px-3 py-2 text-xs font-semibold flex items-start gap-1.5 ${tm.bg} ${tm.text} ${tm.border}`}
                      >
                        <Train className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{r.travel}</span>
                      </div>
                    )}

                    {/* Must-try */}
                    {r.mustTry && (
                      <p className="text-xs text-[#59353B] bg-[#FFF9F6] rounded-xl px-3 py-2 border border-[#F5E2DB]">
                        <strong className="text-[#993A48]">Must-try: </strong>
                        {r.mustTry}
                      </p>
                    )}

                    {r.notes && <p className="text-xs text-[#7D5B60] leading-relaxed">{r.notes}</p>}
                  </div>

                  {r.linkUrl && (
                    <div className="pt-3 mt-3 border-t border-[#F7E7E2] flex justify-end">
                      <a
                        href={r.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF1EC] hover:bg-[#F9DFD6] text-[#993A48] px-3.5 py-1.5 text-xs font-bold transition"
                      >
                        {r.linkLabel || 'Open link'}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* DATES — CARDS */}
        {section === 'dates' && activeCount > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDates.map((d) => {
              const tm = TIER_META[d.travelTier];
              return (
                <article
                  key={d.id}
                  className="flex flex-col justify-between rounded-3xl bg-white border border-[#F2D5DF] p-5 shadow-2xs hover:shadow-md hover:border-[#E2AEBF] transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="rounded-full bg-[#FDF0F4] text-[#9E3355] px-2.5 py-0.5 text-[11px] font-bold">
                            {d.kind}
                          </span>
                          {d.setting && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                d.setting === 'Outdoor'
                                  ? 'bg-[#EBF6EE] text-[#3B6E4C]'
                                  : d.setting === 'Indoor'
                                    ? 'bg-[#FDF2E9] text-[#9A5A32]'
                                    : 'bg-[#F2ECFA] text-[#654B8C]'
                              }`}
                            >
                              {d.setting}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold text-[#6B253E] leading-snug">
                          {d.name}
                        </h3>
                        <p className="text-xs text-[#8C5366] inline-flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {d.area}
                          {d.timeNeeded && <span className="opacity-70"> · {d.timeNeeded}</span>}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCycleStatus('dates', d.id, d.status, d.row)}
                        title="Click to cycle status"
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition hover:scale-105 cursor-pointer ${statusBadgeStyle(
                          d.status
                        )}`}
                      >
                        {d.status}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      {d.budget !== null && (
                        <span className="rounded-full bg-[#FFF4F8] text-[#9E3355] px-2.5 py-1">
                          £{d.budget} / 2
                        </span>
                      )}
                      {d.bestMoment && (
                        <span className="rounded-full bg-[#FAF4F7] text-[#7D5364] px-2.5 py-1 font-semibold">
                          {d.bestMoment}
                        </span>
                      )}
                      <div className="inline-flex items-center gap-0.5 ml-auto" title="Click to set romance">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => handleSetRomance('dates', d.id, n, d.row)}
                            className={`text-sm leading-none transition hover:scale-125 cursor-pointer ${
                              n <= d.romance ? 'text-[#D64F7B]' : 'text-[#EBD0D9]'
                            }`}
                          >
                            ♥
                          </button>
                        ))}
                      </div>
                    </div>

                    {d.travel && (
                      <div
                        className={`rounded-2xl border px-3 py-2 text-xs font-semibold flex items-start gap-1.5 ${tm.bg} ${tm.text} ${tm.border}`}
                      >
                        <Train className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{d.travel}</span>
                      </div>
                    )}

                    {d.notes && <p className="text-xs text-[#704E5C] leading-relaxed">{d.notes}</p>}
                  </div>

                  {d.linkUrl && (
                    <div className="pt-3 mt-3 border-t border-[#F7E6EC] flex justify-end">
                      <a
                        href={d.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF0F4] hover:bg-[#FADCE6] text-[#9E3355] px-3.5 py-1.5 text-xs font-bold transition"
                      >
                        {d.linkLabel || 'Explore'}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* WINTER WARDROBE — CARDS */}
        {section === 'winter' && activeCount > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWinter.map((w) => (
              <article
                key={w.id}
                className="flex flex-col justify-between rounded-3xl bg-white border border-[#E5D4EE] p-5 shadow-2xs hover:shadow-md hover:border-[#CDB0DF] transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="rounded-full bg-[#F6F0FA] text-[#6B3E80] px-2.5 py-0.5 text-[11px] font-bold">
                          {w.item}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            w.entryType === 'Physical store'
                              ? 'bg-[#FDEEE2] text-[#A65826]'
                              : w.entryType === 'Online store'
                                ? 'bg-[#ECE8FF] text-[#5B45A3]'
                                : 'bg-[#FCE2EC] text-[#A62E5A]'
                          }`}
                        >
                          {w.entryType}
                        </span>
                        {w.forWho && (
                          <span className="rounded-full bg-[#FDE8F0] text-[#A83B66] px-2 py-0.5 text-[11px] font-bold">
                            {w.forWho}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#59326B] leading-snug">
                        {w.storeOrPiece}
                      </h3>
                      {w.area && (
                        <p className="text-xs text-[#765A85] inline-flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {w.area}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCycleStatus('winter', w.id, w.status, w.row)}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition hover:scale-105 cursor-pointer ${statusBadgeStyle(
                        w.status
                      )}`}
                    >
                      {w.status}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {w.price !== null && (
                      <span className="rounded-full bg-[#F6F0FA] text-[#6B3E80] px-2.5 py-1">
                        ~£{w.price}
                      </span>
                    )}
                    {w.priority && (
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          w.priority === 'Must-have'
                            ? 'bg-[#FADCE6] text-[#9E2952]'
                            : 'bg-[#FDF4E2] text-[#8F6422]'
                        }`}
                      >
                        {w.priority}
                      </span>
                    )}
                  </div>

                  {w.requirements && (
                    <p className="text-xs text-[#4C3659] bg-[#FAF6FC] rounded-xl px-3 py-2 border border-[#EBDCF3]">
                      {w.requirements}
                    </p>
                  )}
                  {w.notes && <p className="text-xs text-[#6B5478] leading-relaxed">{w.notes}</p>}
                </div>

                {w.linkUrl && (
                  <div className="pt-3 mt-3 border-t border-[#F0E4F7] flex justify-end">
                    <a
                      href={w.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F0FA] hover:bg-[#EADBF4] text-[#6B3E80] px-3.5 py-1.5 text-xs font-bold transition"
                    >
                      {w.linkLabel || 'Browse'}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* OUR HOME — CARDS */}
        {section === 'home' && activeCount > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredHome.map((h) => (
              <article
                key={h.id}
                className="flex flex-col justify-between rounded-3xl bg-white border border-[#D4E6DA] p-5 shadow-2xs hover:shadow-md hover:border-[#B2D2BE] transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {h.room && (
                          <span className="rounded-full bg-[#F0F7F2] text-[#3A664C] px-2.5 py-0.5 text-[11px] font-bold">
                            {h.room}
                          </span>
                        )}
                        {h.when && (
                          <span className="rounded-full bg-[#FFEEDB] text-[#A65824] px-2.5 py-0.5 text-[11px] font-bold">
                            {h.when}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#2F5940] leading-snug">
                        {h.item}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleCycleStatus('home', h.id, h.status, h.row)}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition hover:scale-105 cursor-pointer ${statusBadgeStyle(
                        h.status
                      )}`}
                    >
                      {h.status}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {h.budget !== null && (
                      <span className="rounded-full bg-[#F0F7F2] text-[#3A664C] px-2.5 py-1">
                        ~£{h.budget}
                      </span>
                    )}
                    {h.priority && (
                      <span className={`rounded-full px-2.5 py-1 ${priorityBadgeStyle(h.priority)}`}>
                        {h.priority}
                      </span>
                    )}
                    {h.who && (
                      <span className="rounded-full bg-[#FDE8F0] text-[#A83B66] px-2.5 py-1">
                        {h.who}
                      </span>
                    )}
                  </div>

                  {h.details && (
                    <p className="text-xs text-[#385242] bg-[#F5FAF7] rounded-xl px-3 py-2 border border-[#DCECE2]">
                      {h.details}
                    </p>
                  )}
                  {h.notes && <p className="text-xs text-[#546E5E] leading-relaxed">{h.notes}</p>}
                </div>

                {h.linkUrl && (
                  <div className="pt-3 mt-3 border-t border-[#E6F1EA] flex justify-end">
                    <a
                      href={h.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F7F2] hover:bg-[#DFEFE5] text-[#3A664C] px-3.5 py-1.5 text-xs font-bold transition"
                    >
                      {h.linkLabel || 'View'}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* COMPACT SPREADSHEET-STYLE VIEW (full columns, pastel zebra stripes, 1-click sorting!) */}
        {activeCount > 0 && viewMode === 'table' && (
          <div className="overflow-x-auto rounded-2xl bg-white border shadow-xs" style={{ borderColor: theme.softBorder }}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: theme.accent }}>
                  <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 cursor-pointer">
                      {section === 'restaurants' ? 'Restaurant' : section === 'dates' ? 'Idea' : section === 'winter' ? 'Store / piece' : 'Item'}{' '}
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                    {section === 'restaurants' ? 'Cuisine' : section === 'dates' ? 'Kind' : section === 'winter' ? 'Item & Type' : 'Room'}
                  </th>
                  {(section === 'restaurants' || section === 'dates') && (
                    <>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Area</th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                        <button onClick={() => toggleSort('travel')} className="inline-flex items-center gap-1 cursor-pointer">
                          Travel from home {renderSortIcon('travel')}
                        </button>
                      </th>
                      <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">
                        <button onClick={() => toggleSort('romance')} className="inline-flex items-center gap-1 cursor-pointer">
                          Romance {renderSortIcon('romance')}
                        </button>
                      </th>
                    </>
                  )}
                  {section === 'winter' && <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">For</th>}
                  {section === 'home' && <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">When</th>}
                  {(section === 'winter' || section === 'home') && (
                    <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">
                      <button onClick={() => toggleSort('priority')} className="inline-flex items-center gap-1 cursor-pointer">
                        Priority {renderSortIcon('priority')}
                      </button>
                    </th>
                  )}
                  <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">
                    <button onClick={() => toggleSort('budget')} className="inline-flex items-center gap-1 cursor-pointer">
                      {section === 'winter' ? 'Price (£)' : 'Budget (£)'} {renderSortIcon('budget')}
                    </button>
                  </th>
                  {(section === 'restaurants' || section === 'dates') && (
                    <>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                        {section === 'restaurants' ? 'Occasion' : 'Time'}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">
                        {section === 'restaurants' ? 'Booking' : 'Setting'}
                      </th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                        {section === 'restaurants' ? 'Must-try' : 'Best moment'}
                      </th>
                    </>
                  )}
                  {(section === 'winter' || section === 'home') && (
                    <>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                        {section === 'winter' ? 'Requirements / material' : 'Size / details'}
                      </th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                        {section === 'winter' ? 'Area / delivery' : 'Store / who'}
                      </th>
                    </>
                  )}
                  <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 cursor-pointer">
                      Status {renderSortIcon('status')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Link</th>
                  <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Notes</th>
                  {section === 'restaurants' && (
                    <th className="py-2.5 px-2 font-bold text-center whitespace-nowrap">
                      <button onClick={() => toggleSort('rating')} className="inline-flex items-center gap-1 cursor-pointer">
                        Google ★ {renderSortIcon('rating')}
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4DDE5]">
                {section === 'restaurants' &&
                  filteredRestaurants.map((r, idx) => {
                    const tm = TIER_META[r.travelTier];
                    return (
                      <tr key={r.id} className={`${idx % 2 === 1 ? 'bg-[#FFF5F1]' : 'bg-white'} hover:bg-[#FDEEE8]/70 transition`}>
                        <td className="py-2 px-3 font-bold text-[#6E2C36] whitespace-nowrap">{r.name}</td>
                        <td className="py-2 px-2.5 whitespace-nowrap text-[#5C3A40]">{r.cuisine}</td>
                        <td className="py-2 px-2.5 whitespace-nowrap text-[#7D5B60]">{r.area}</td>
                        <td className={`py-2 px-2.5 text-[11px] leading-snug min-w-[220px] max-w-[260px] ${tm.bg} ${tm.text}`}>
                          {r.travel}
                        </td>
                        <td className={`py-2 px-2 text-center whitespace-nowrap ${romanceCellBg(r.romance)}`}>
                          <button
                            onClick={() => handleSetRomance('restaurants', r.id, (r.romance % 5) + 1, r.row)}
                            title="Click to cycle romance 1–5"
                            className="cursor-pointer hover:underline"
                          >
                            {r.romance} ♡
                          </button>
                        </td>
                        <td className="py-2 px-2 text-center font-bold whitespace-nowrap">
                          {r.budget !== null ? `£${r.budget}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-[#6D4D52] whitespace-nowrap">{r.occasion || '—'}</td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {r.booking && (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                r.booking === 'Reserve' ? 'bg-[#FDECE4] text-[#A84A32]' : 'bg-[#FDF6E3] text-[#8C6A22]'
                              }`}
                            >
                              {r.booking}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[#59353B] min-w-[160px] max-w-[210px] leading-snug">{r.mustTry}</td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleCycleStatus('restaurants', r.id, r.status, r.row)}
                            title="Click to cycle status"
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold cursor-pointer ${statusBadgeStyle(r.status)}`}
                          >
                            {r.status}
                          </button>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {r.linkUrl && (
                            <a href={r.linkUrl} target="_blank" rel="noreferrer" className="text-[#B54F5E] font-bold underline">
                              {r.linkLabel || 'Open'}
                            </a>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-[#7A5960] min-w-[200px] max-w-[260px] leading-snug">
                          {r.notes}
                        </td>
                        <td className={`py-2 px-2 text-center whitespace-nowrap ${starCellBg(r.rating)}`}>
                          {r.rating ? `${r.rating.toFixed(1)} ★` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                {section === 'dates' &&
                  filteredDates.map((d, idx) => {
                    const tm = TIER_META[d.travelTier];
                    return (
                      <tr key={d.id} className={`${idx % 2 === 1 ? 'bg-[#FFF4F8]' : 'bg-white'} hover:bg-[#FDECF2]/70 transition`}>
                        <td className="py-2 px-3 font-bold text-[#6B253E] min-w-[170px]">{d.name}</td>
                        <td className="py-2 px-2.5 whitespace-nowrap">{d.kind}</td>
                        <td className="py-2 px-2.5 whitespace-nowrap text-[#7D5B66]">{d.area}</td>
                        <td className={`py-2 px-2.5 text-[11px] leading-snug min-w-[220px] max-w-[260px] ${tm.bg} ${tm.text}`}>
                          {d.travel}
                        </td>
                        <td className={`py-2 px-2 text-center whitespace-nowrap ${romanceCellBg(d.romance)}`}>
                          <button
                            onClick={() => handleSetRomance('dates', d.id, (d.romance % 5) + 1, d.row)}
                            title="Click to cycle romance 1–5"
                            className="cursor-pointer hover:underline"
                          >
                            {d.romance} ♡
                          </button>
                        </td>
                        <td className="py-2 px-2 text-center font-bold whitespace-nowrap">
                          {d.budget !== null ? `£${d.budget}` : '—'}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap text-[#6D4D58]">{d.timeNeeded || '—'}</td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {d.setting && (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                d.setting === 'Outdoor'
                                  ? 'bg-[#EBF6EE] text-[#3B6E4C]'
                                  : d.setting === 'Indoor'
                                    ? 'bg-[#FDF2E9] text-[#9A5A32]'
                                    : 'bg-[#F2ECFA] text-[#654B8C]'
                              }`}
                            >
                              {d.setting}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[#5C3A47] min-w-[140px]">{d.bestMoment}</td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleCycleStatus('dates', d.id, d.status, d.row)}
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold cursor-pointer ${statusBadgeStyle(d.status)}`}
                          >
                            {d.status}
                          </button>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {d.linkUrl && (
                            <a href={d.linkUrl} target="_blank" rel="noreferrer" className="text-[#B84A6E] font-bold underline">
                              {d.linkLabel || 'Open'}
                            </a>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-[#7A5966] min-w-[200px] max-w-[260px] leading-snug">
                          {d.notes}
                        </td>
                      </tr>
                    );
                  })}
                {section === 'winter' &&
                  filteredWinter.map((w, idx) => (
                    <tr key={w.id} className={`${idx % 2 === 1 ? 'bg-[#FAF6FC]' : 'bg-white'} hover:bg-[#F3EAF8]/70 transition`}>
                      <td className="py-2 px-3 font-bold text-[#59326B] min-w-[160px]">{w.storeOrPiece}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="font-bold text-[#59326B]">{w.item}</span>
                        <span className="text-[#886E96]"> · {w.entryType}</span>
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap font-bold text-[#A83B66]">{w.forWho}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${w.priority === 'Must-have' ? 'bg-[#FADCE6] text-[#9E2952]' : 'bg-[#FDF4E2] text-[#8F6422]'}`}>
                          {w.priority}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold whitespace-nowrap">{w.price !== null ? `£${w.price}` : '—'}</td>
                      <td className="py-2 px-2.5 min-w-[190px] max-w-[240px] leading-snug">{w.requirements}</td>
                      <td className="py-2 px-2.5 text-[#765A85] min-w-[120px]">{w.area}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleCycleStatus('winter', w.id, w.status, w.row)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold cursor-pointer ${statusBadgeStyle(w.status)}`}
                        >
                          {w.status}
                        </button>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {w.linkUrl && (
                          <a href={w.linkUrl} target="_blank" rel="noreferrer" className="text-[#8E4B9E] font-bold underline">
                            {w.linkLabel || 'Open'}
                          </a>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-[#6B5478] min-w-[200px] max-w-[260px] leading-snug">{w.notes}</td>
                    </tr>
                  ))}
                {section === 'home' &&
                  filteredHome.map((h, idx) => (
                    <tr key={h.id} className={`${idx % 2 === 1 ? 'bg-[#F5FAF7]' : 'bg-white'} hover:bg-[#EAF4EE]/70 transition`}>
                      <td className="py-2 px-3 font-bold text-[#2F5940] min-w-[170px]">{h.item}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap">{h.room || '—'}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap text-[#9A5A28] font-semibold">{h.when || '—'}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {h.priority && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityBadgeStyle(h.priority)}`}>
                            {h.priority}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-bold whitespace-nowrap">{h.budget !== null ? `£${h.budget}` : '—'}</td>
                      <td className="py-2 px-2.5 min-w-[180px] max-w-[230px] leading-snug">{h.details}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-[#51665A]">{[h.store, h.who].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleCycleStatus('home', h.id, h.status, h.row)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold cursor-pointer ${statusBadgeStyle(h.status)}`}
                        >
                          {h.status}
                        </button>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {h.linkUrl && (
                          <a href={h.linkUrl} target="_blank" rel="noreferrer" className="text-[#4C8263] font-bold underline">
                            {h.linkLabel || 'Open'}
                          </a>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-[#546E5E] min-w-[200px] max-w-[260px] leading-snug">{h.notes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdd && (
        <AddItemModal
          section={section}
          syncCfg={syncCfg}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAddItem}
        />
      )}

      {showSync && (
        <SyncModal
          config={syncCfg}
          spreadsheetUrl={data.spreadsheetUrl}
          syncError={syncError}
          onSaveAndSync={async (cfg) => {
            saveSyncConfig(cfg);
            setSyncCfg(cfg);
            try {
              const fresh = await fetchLiveFromSheet(cfg);
              setData(fresh);
              setSyncState('ok');
              setSyncError(null);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              setSyncState('error');
              setSyncError(message);
              throw err;
            }
          }}
          onResetLocal={() => {
            setData(resetLocalData());
          }}
          onClose={() => setShowSync(false)}
        />
      )}

      {surpriseItem && (
        <SurpriseModal
          item={surpriseItem}
          isRestaurant={section === 'restaurants'}
          onReroll={handleSurprise}
          onClose={() => setSurpriseItem(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-full bg-[#6B253E] text-white px-5 py-2.5 text-xs font-bold shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
