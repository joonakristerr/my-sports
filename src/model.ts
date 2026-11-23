export type TeamKey = 'united' | 'steelers';
export const teams = {
  united: { id: '360', name: 'Manchester United', sport: 'Jalkapallo', logo: 'united.png' },
  steelers: { id: '23', name: 'Pittsburgh Steelers', sport: 'Amerikkalainen jalkapallo · NFL', logo: 'steelers.png' }
} as const;
export interface Match { id: string; date: string; league: string; slug: string; home: string; away: string; homeScore?: string; awayScore?: string; homePenalties?: string; awayPenalties?: string; state: 'final' | 'scheduled' | 'live' | 'other'; timeConfirmed: boolean; video?: string; videoStream?: string; videoDuration?: number; officialVideo?: import('./video-preference').OfficialVideo }
export interface Snapshot { updated: string; matches: Match[]; source?: 'direct' | 'snapshot' }
export type Store = Partial<Record<TeamKey, Snapshot>>;
export const soccerLeagues = ['eng.1', 'eng.fa', 'eng.league_cup', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'eng.charity', 'fifa.cwc', 'uefa.super_cup', 'fifa.intercontinental'];
const record = (x: unknown): Record<string, any> => x && typeof x === 'object' ? x as Record<string, any> : {};
const score = (x: unknown): string | undefined => {
  const s = typeof x === 'object' ? record(x).displayValue : typeof x === 'number' ? String(x) : x;
  return typeof s === 'string' && /^\d{1,3}$/.test(s) ? s : undefined;
};
export function normalize(payload: unknown, key: TeamKey, fallbackSlug?: string): Match[] {
  const data = record(payload);
  if (!Array.isArray(data.events)) throw new Error('Virheellinen otteluvastaus');
  return data.events.flatMap((raw: unknown) => {
    const e = record(raw), c = record(e.competitions?.[0]), competitors = c.competitors;
    if (!Array.isArray(competitors) || !competitors.some(x => String(record(x.team).id ?? x.id) === teams[key].id)) return [];
    const home = competitors.find(x => x.homeAway === 'home'), away = competitors.find(x => x.homeAway === 'away');
    if (!home?.team?.displayName || !away?.team?.displayName || !e.id || !Number.isFinite(Date.parse(c.date ?? e.date))) return [];
    const slug = e.league?.slug ?? fallbackSlug ?? '';
    if (key === 'united' && !soccerLeagues.includes(slug)) return [];
    if (key === 'steelers' && ![2, 3].includes(Number(e.seasonType?.type ?? data.season?.type))) return [];
    const s = record(c.status?.type ?? e.status?.type), name = String(s.name ?? '');
    const final = s.completed === true && s.state === 'post' && /^STATUS_(FINAL|FULL_TIME|FINAL_PEN|FINAL_AET|FINAL_OT|END_OF_EXTRATIME|END_OF_PENALTY_SHOOTOUT|FINAL_OVERTIME)$/.test(name);
    const state = final ? 'final' : name === 'STATUS_SCHEDULED' && s.state === 'pre' ? 'scheduled' : s.state === 'in' ? 'live' : 'other';
    return [{ id: String(e.id), date: new Date(c.date ?? e.date).toISOString(), league: key === 'steelers' ? Number(e.seasonType?.type) === 3 ? 'NFL · Pudotuspelit' : 'NFL · Runkosarja' : String(e.league?.name ?? e.season?.displayName ?? slug), slug, home: String(home.team.displayName), away: String(away.team.displayName), homeScore: final ? score(home.score) : undefined, awayScore: final ? score(away.score) : undefined, homePenalties: final ? score(home.score?.shootoutScore) : undefined, awayPenalties: final ? score(away.score?.shootoutScore) : undefined, state, timeConfirmed: c.timeValid !== false && e.timeValid !== false && c.status?.isTBDFlex !== true } satisfies Match];
  });
}
export function select(matches: Match[], now = Date.now()) {
  const sorted = [...new Map(matches.map(m => [m.id, m])).values()].sort((a,b) => Date.parse(a.date)-Date.parse(b.date));
  return { previous: sorted.filter(m => m.state === 'final' && Date.parse(m.date) <= now).at(-1), next: sorted.find(m => m.state === 'scheduled' && Date.parse(m.date) > now), live: sorted.find(m => m.state === 'live') };
}
export class SpoilerState {
  private revealed = new Map<TeamKey, string>();
  visible(key: TeamKey, id: string) { return this.revealed.get(key) === id; }
  toggle(key: TeamKey, id: string) { if (this.visible(key,id)) this.revealed.delete(key); else this.revealed.set(key,id); }
  sync(key: TeamKey, id?: string) { if (this.revealed.get(key) !== id) this.revealed.delete(key); }
}
export function helsinki(date: string, timeConfirmed = true) {
  const day = new Intl.DateTimeFormat('fi-FI', { timeZone:'Europe/Helsinki', weekday:'short', day:'numeric', month:'long', year:'numeric' }).format(new Date(date));
  const time = new Intl.DateTimeFormat('fi-FI', { timeZone:'Europe/Helsinki', hour:'2-digit', minute:'2-digit' }).format(new Date(date));
  return `${day} · ${timeConfirmed ? 'klo '+time : 'kellonaika vahvistamatta'}`;
}
export function countdown(date: string, now = Date.now()) {
  const minutes = Math.max(0, Math.ceil((Date.parse(date)-now)/60000));
  if (!minutes) return 'Ottelun alkamisaika saavutettu';
  const days = Math.floor(minutes/1440), hours = Math.floor(minutes%1440/60), mins = minutes%60;
  return `${days ? days+' pv ' : ''}${hours} h ${mins} min`;
}
export function safeVideo(url: unknown): string | undefined {
  try { const u = new URL(String(url)); return u.protocol === 'https:' && ['www.espn.com','www.nfl.com','www.manutd.com','www.youtube.com','youtu.be'].includes(u.hostname) ? u.href : undefined; } catch { return undefined; }
}
export function videoLink(m: Match, key: TeamKey) {
  return safeVideo(m.video) ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.home} ${m.away} ${m.date.slice(0,10)} highlights ${key === 'steelers' ? 'NFL official' : 'Manchester United official'}`)}`;
}
