import seedDataRaw from '../data/seedData.json';
import type { AppData, SectionKey, SyncConfig } from '../types';

const STORAGE_DATA_KEY = 'kitty_bear_app_data_v2';
const STORAGE_SYNC_KEY = 'kitty_bear_sync_cfg_v1';

export const DEFAULT_SYNC_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzG06F4J8RxmczkqMpzBGL2ApNkFc96llhje-ZG5CcqMZDMxFx354YIMXOTMwQWUJsjuw/exec';

export const SEED_DATA = seedDataRaw as AppData;

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SyncConfig;
      if (parsed && parsed.endpointUrl) return parsed;
    }
  } catch {
    // ignore
  }
  return { endpointUrl: DEFAULT_SYNC_ENDPOINT, passcode: '' };
}

export function saveSyncConfig(cfg: SyncConfig) {
  localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(cfg));
}

export function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.restaurants)) return parsed;
    }
  } catch {
    // ignore
  }
  return SEED_DATA;
}

export function saveLocalData(data: AppData) {
  localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
}

export function resetLocalData(): AppData {
  localStorage.removeItem(STORAGE_DATA_KEY);
  return SEED_DATA;
}

async function parseAppsScriptJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (res.status === 401 || res.status === 403 || text.trimStart().startsWith('<')) {
    throw new Error(
      `Apps Script returned HTTP ${res.status} — in Google Sheets open Extensions → Apps Script → Deploy → Manage deployments → Edit (pencil), set "Who has access" to "Anyone", and click Deploy.`
    );
  }
  if (!res.ok) {
    throw new Error(`Apps Script request failed (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Unexpected response from Apps Script (not JSON).');
  }
}

export async function fetchLiveFromSheet(cfg: SyncConfig): Promise<AppData> {
  if (!cfg.endpointUrl) throw new Error('No Apps Script URL configured');
  const url = new URL(cfg.endpointUrl);
  url.searchParams.set('action', 'readAll');
  if (cfg.passcode) url.searchParams.set('passcode', cfg.passcode);

  const res = await fetch(url.toString(), { method: 'GET' });
  const json = await parseAppsScriptJson(res);
  if (!json.ok) throw new Error(String(json.error || 'Failed to read Google Sheet'));

  const merged: AppData = {
    spreadsheetUrl: SEED_DATA.spreadsheetUrl,
    spreadsheetId: SEED_DATA.spreadsheetId,
    restaurants: (json.restaurants as AppData['restaurants']) || [],
    dates: (json.dates as AppData['dates']) || [],
    winter: (json.winter as AppData['winter']) || [],
    home: (json.home as AppData['home']) || [],
  };
  saveLocalData(merged);
  return merged;
}

export async function pushAddItem(
  cfg: SyncConfig,
  section: SectionKey,
  item: Record<string, unknown>
): Promise<{ synced: boolean; row?: number; error?: string }> {
  if (!cfg.endpointUrl) return { synced: false };
  try {
    const res = await fetch(cfg.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'addItem',
        passcode: cfg.passcode || '',
        section,
        item,
      }),
    });
    const json = await parseAppsScriptJson(res);
    if (!json.ok) return { synced: false, error: String(json.error || 'Sync failed') };
    return { synced: true, row: typeof json.row === 'number' ? json.row : undefined };
  } catch (err) {
    return { synced: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function pushUpdateStatus(
  cfg: SyncConfig,
  section: SectionKey,
  row: number | undefined,
  status: string
): Promise<{ synced: boolean; error?: string }> {
  if (!cfg.endpointUrl || !row) return { synced: false };
  try {
    const res = await fetch(cfg.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateStatus',
        passcode: cfg.passcode || '',
        section,
        row,
        status,
      }),
    });
    const json = await parseAppsScriptJson(res);
    if (!json.ok) return { synced: false, error: String(json.error || 'Sync failed') };
    return { synced: true };
  } catch (err) {
    return { synced: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function pushUpdateRomance(
  cfg: SyncConfig,
  section: 'restaurants' | 'dates',
  row: number | undefined,
  romance: number
): Promise<{ synced: boolean; error?: string }> {
  if (!cfg.endpointUrl || !row) return { synced: false };
  try {
    const res = await fetch(cfg.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateRating',
        passcode: cfg.passcode || '',
        section,
        row,
        romance,
      }),
    });
    const json = await parseAppsScriptJson(res);
    if (!json.ok) return { synced: false, error: String(json.error || 'Sync failed') };
    return { synced: true };
  } catch (err) {
    return { synced: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function parseTravelMeta(travel: string) {
  const s = travel.trim();
  let travelTier: 'tier1' | 'tier2' | 'tier3' | 'tier4' = 'tier1';
  if (s.startsWith('◆') || /elizabeth/i.test(s)) travelTier = 'tier2';
  else if (s.startsWith('●') || /jubilee|central|dlr/i.test(s)) travelTier = 'tier3';
  else if (s.startsWith('○')) travelTier = 'tier4';

  const hm = s.match(/(\d+)h\s*(\d+)?m?/);
  const mm = s.match(/(\d+)\s*(?:–\d+)?\s*min/);
  const travelMins = hm
    ? Number(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0)
    : mm
      ? Number(mm[1])
      : 999;

  return { travelTier, travelMins };
}
