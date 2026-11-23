import { fetchMatches, json } from './api';
import { validateStore } from './cache';
import type { Snapshot, TeamKey } from './model';
import { isStandalone } from './standalone';
export async function fetchSnapshot(key: TeamKey): Promise<Snapshot> {
  try { return {matches:await fetchMatches(key),updated:new Date().toISOString(),source:'direct'}; }
  catch {
    if (isStandalone()) throw new Error('Suora otteluhaku epäonnistui');
    const payload = await json(`${import.meta.env.BASE_URL}data/${key}.json?t=${Math.floor(Date.now()/900000)}`);
    const snapshot = validateStore({[key]:payload})[key];
    if(!snapshot || !snapshot.matches.length) throw new Error('Virheellinen tilannekuva');
    return {...snapshot,source:'snapshot'};
  }
}
