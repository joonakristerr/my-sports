import type { Store, TeamKey } from './model';
const CACHE = 'my-sports-data-v1';
export function validateStore(data: any): Store {
    const result: Store = {};
    for (const key of ['united','steelers'] as TeamKey[]) {
      const s = data?.[key];
      if (!s || !Number.isFinite(Date.parse(s.updated)) || !Array.isArray(s.matches)) continue;
      if (s.matches.every((m: any) => m && typeof m.id === 'string' && Number.isFinite(Date.parse(m.date)) && typeof m.home === 'string' && typeof m.away === 'string' && typeof m.league === 'string' && typeof m.slug === 'string' && ['final','scheduled','live','other'].includes(m.state) && typeof m.timeConfirmed === 'boolean' && [m.homeScore,m.awayScore,m.homePenalties,m.awayPenalties].every(x => x === undefined || typeof x === 'string' && /^\d{1,3}$/.test(x)))) result[key] = {updated:s.updated,matches:s.matches,source:s.source === 'snapshot' ? 'snapshot' : 'direct'};
    }
    return result;
}
export function readCache(storage?: Pick<Storage,'getItem'>): Store {
  try {
    return validateStore(JSON.parse((storage ?? localStorage).getItem(CACHE) ?? '{}'));
  } catch { return {}; }
}
export function saveCache(store: Store, storage?: Pick<Storage,'setItem'>) {
  try { (storage ?? localStorage).setItem(CACHE,JSON.stringify(store)); return true; } catch { return false; }
}
