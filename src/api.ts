import { normalize, select, soccerLeagues, safeVideo, type Match, type TeamKey } from './model';
import { extractVideo } from './video';
import { preferredOfficial } from './video-preference';
export const API = 'https://site.api.espn.com/apis/site/v2/sports/';
export async function json(url: string): Promise<unknown> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json(); } finally { clearTimeout(timer); }
}
export function scheduleUrls(key: TeamKey, now = new Date()) {
  const year = now.getUTCFullYear(), years = [year-1, year, year+1];
  if (key === 'steelers') return years.flatMap(season => [2,3].map(type => ({url:`${API}football/nfl/teams/23/schedule?season=${season}&seasontype=${type}`, slug:'nfl'})));
  const season = now.getUTCMonth() < 6 ? year-1 : year;
  return [...[season-1,season,season+1].flatMap(y => [false,true].map(fixture => ({url:`${API}soccer/all/teams/360/schedule?season=${y}&fixture=${fixture}`,slug:undefined}))), ...soccerLeagues.slice(0,7).flatMap(slug => [false,true].map(fixture => ({url:`${API}soccer/${slug}/teams/360/schedule?season=${season}&fixture=${fixture}`,slug})))];
}
export async function fetchMatches(key: TeamKey): Promise<Match[]> {
  // Never commit a partial schedule: an omitted competition could change the selected match.
  const groups = await Promise.all(scheduleUrls(key).map(async ({url,slug}) => normalize(await json(url),key,slug)));
  const matches = [...new Map(groups.flat().map(m => [m.id,m])).values()];
  if (!matches.length) throw new Error('Ottelutietoja ei löytynyt');
  const previous = select(matches).previous;
  if (previous) {
    previous.officialVideo = preferredOfficial(previous);
    try {
      const sport = key === 'steelers' ? 'football/nfl' : `soccer/${previous.slug}`;
      const summary: any = await json(`${API}${sport}/summary?event=${encodeURIComponent(previous.id)}`);
      Object.assign(previous,extractVideo(summary));
    } catch { /* A video failure must not discard a complete schedule. */ }
  }
  return matches;
}
