// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalize, select, SpoilerState, helsinki, videoLink, countdown, safeVideo, type Match, type Store } from '../src/model';
import { renderTeam } from '../src/ui';
import { readCache, saveCache } from '../src/cache';
import { json, scheduleUrls } from '../src/api';
import { fetchSnapshot } from '../src/data';
const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/${name}.json`,'utf8'));
const raw = fixture('soccer_all_teams_360_schedule_season_2026');
const future = fixture('soccer_all_teams_360_schedule_season_2026_fixture_true');
const nfl = fixture('football_nfl_teams_23_schedule_season_2026_seasontype_2');
const past = normalize(raw,'united');
const upcoming = normalize(future,'united');
const now = Date.parse('2026-11-23T06:00:00Z');
const match = (id: string, date: string, state: Match['state'] = 'final'): Match => ({ id,date,state,slug:'eng.1',league:'Valioliiga',home:'Manchester United',away:'Vastustaja',homeScore:'3',awayScore:'2',timeConfirmed:true });
const store: Store = { united:{updated:new Date(now).toISOString(),matches:[...past,...upcoming]}, steelers:{updated:new Date(now).toISOString(),matches:normalize(nfl,'steelers')} };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });
describe('Otteluiden valinta ja normalisointi',() => {
  it('valitsee todellisista esimerkkivastauksista viimeisimmän päättyneen',() => expect(select(past,now).previous?.id).toBe('401878755'));
  it('valitsee lähimmän tulevan kaikista kilpailuista',() => expect(select([...past,...upcoming],now).next?.id).toBe('401915373'));
  it('ei käsittele käynnissä olevaa päättyneenä',() => { const d=structuredClone(raw); d.events[0].competitions[0].status.type={completed:false,state:'in',name:'STATUS_IN_PROGRESS'}; expect(normalize(d,'united')[0].state).toBe('live'); expect(select(normalize(d,'united'),now).previous?.id).not.toBe(d.events[0].id); });
  it.each(['STATUS_POSTPONED','STATUS_CANCELED','STATUS_SUSPENDED','STATUS_ABANDONED'])('ei tulkitse tilaa %s pelatuksi edes completed-virheellä',name => { const d=structuredClone(raw); d.events[0].competitions[0].status.type={completed:true,state:'post',name}; expect(normalize(d,'united')[0].state).toBe('other'); });
  it('järjestää Valioliigan, cupin ja euro-ottelut alkamisajan mukaan ja poistaa duplikaatit',() => {
    const a=match('a','2026-10-10T10:00Z'), b={...match('b','2026-10-12T10:00Z'),slug:'eng.fa'}, c={...match('c','2026-10-14T10:00Z'),slug:'uefa.champions'};
    expect(select([c,a,b,b],Date.parse('2026-10-13')).previous?.id).toBe('b');
    expect(select([{...c,state:'scheduled'},a,b],Date.parse('2026-10-13')).next?.id).toBe('c');
  });
  it('suodattaa ystävyysottelut ja hyväksyy FA Cupin',() => { const d=structuredClone(raw); d.events[0].league.slug='club.friendly'; expect(normalize(d,'united')).toHaveLength(1); d.events[0].league.slug='eng.fa'; expect(normalize(d,'united')).toHaveLength(2); });
  it('tunnistaa rangaistuspotkuilla päättyneen cup-ottelun ja suojaa myös rangaistuspotkutuloksen',()=>{
    const d=structuredClone(raw); d.events=[d.events[0]]; d.events[0].competitions[0].status.type={completed:true,state:'post',name:'STATUS_FINAL_PEN'};
    d.events[0].competitions[0].competitors.forEach((c:any)=>{c.score.shootoutScore=c.homeAway==='home'?12:11;});
    const matches=normalize(d,'united'); expect(matches[0].state).toBe('final'); expect(matches[0].homePenalties).toBe('12');
    const data={united:{updated:new Date(now).toISOString(),matches}}; const state=new SpoilerState();
    expect(renderTeam('united',data,state)).not.toContain('12 – 11'); state.toggle('united',matches[0].id); expect(renderTeam('united',data,state)).toContain('Rangaistuspotkut 12 – 11');
  });
  it('jättää NFL-harjoitusottelut pois, hyväksyy pudotuspelit',() => { const d=structuredClone(nfl); d.events.forEach((e:any) => e.seasonType.type=1); expect(normalize(d,'steelers')).toEqual([]); d.events[0].seasonType.type=3; expect(normalize(d,'steelers')).toHaveLength(1); });
  it('käsittelee NFL offseasonin ja vapaaviikon',() => { const m=normalize(nfl,'steelers'); expect(select(m,Date.parse('2027-04-01')).next).toBeUndefined(); expect(select(m,Date.parse('2027-04-01')).previous).toBeDefined(); expect(select([],now)).toEqual({previous:undefined,next:undefined,live:undefined}); });
  it('hakee NFL:n viereiset kaudet runkosarjana ja pudotuspeleinä',() => { const urls=scheduleUrls('steelers',new Date('2027-01-05')); expect(urls).toHaveLength(6); expect(urls.some(x => x.url.includes('season=2026&seasontype=3'))).toBe(true); expect(urls.every(x => !x.url.includes('seasontype=1'))).toBe(true); });
  it('hakee jalkapallon sekä tulokset että fixture-ottelut ja cupit',() => { const urls=scheduleUrls('united',new Date(now)); expect(urls.some(x=>x.url.includes('fixture=true'))).toBe(true); expect(urls.some(x=>x.url.includes('eng.fa/'))).toBe(true); expect(urls.some(x=>x.url.includes('eng.league_cup/'))).toBe(true); });
  it('torjuu virheellisen API-vastauksen ja rikkinäiset ottelut',() => { expect(()=>normalize({},'united')).toThrow(); expect(()=>normalize(null,'united')).toThrow(); expect(normalize({events:[null,{}, {id:'x',date:'bad',competitions:[]}]},'united')).toEqual([]); });
  it('ei näytä tulevaisuuteen merkittyä päättynyttä ottelua',() => expect(select([match('x','2030-01-01')],now).previous).toBeUndefined());
});
describe('Spoilerisuoja ja käyttöliittymä',() => {
  it('ei lisää piilotettua tulosta DOMiin, attribuutteihin tai saavutettavuusteksteihin',() => {
    const s: Store={united:{updated:new Date(now).toISOString(),matches:[match('secret','2026-10-01')]}};
    const html=renderTeam('united',s,new SpoilerState()); document.body.innerHTML=html;
    expect(document.body.textContent).toContain('Tulos piilotettu'); expect(html).not.toContain('3 – 2'); expect(html).not.toMatch(/winner|loser|thumbnail|voitti/i); expect(document.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
  });
  it('näyttää tuloksen vasta pyynnöstä ja piilottaa uudestaan',() => { const state=new SpoilerState(); const id=select(past).previous!.id; expect(state.visible('united',id)).toBe(false); state.toggle('united',id); expect(renderTeam('united',store,state)).toContain('Piilota tulos'); state.toggle('united',id); expect(renderTeam('united',store,state)).toContain('Tulos piilotettu'); });
  it('sivun uudelleenlataus palauttaa oletussuojan',() => { const s=new SpoilerState(); s.toggle('united','old'); expect(new SpoilerState().visible('united','old')).toBe(false); });
  it('uusi ottelu on piilotettu ja myös paluu vanhaan pysyy piilotettuna',() => { const s=new SpoilerState(); s.toggle('united','old'); s.sync('united','new'); expect(s.visible('united','new')).toBe(false); s.sync('united','old'); expect(s.visible('united','old')).toBe(false); });
  it('joukkueiden suojat toimivat itsenäisesti',() => { const s=new SpoilerState(); s.toggle('united','a'); expect(s.visible('steelers','a')).toBe(false); s.toggle('steelers','b'); s.toggle('united','a'); expect(s.visible('steelers','b')).toBe(true); });
  it('välimuisti ei tallenna paljastustilaa',() => { const s=new SpoilerState(); s.toggle('united',past[0].id); saveCache(store); const restored=readCache(); expect(renderTeam('united',restored,new SpoilerState())).toContain('Tulos piilotettu'); expect(localStorage.getItem('my-sports-data-v1')).not.toContain('revealed'); });
  it('torjuu rikkinäisen välimuistin ja tallennusvirheen',() => { localStorage.setItem('my-sports-data-v1','broken'); expect(readCache()).toEqual({}); expect(saveCache(store,{setItem(){throw new Error('quota');}})).toBe(false); });
  it('escapaa API-tekstin ja estää suoritettavan videolinkin',() => { const s: Store={united:{updated:new Date(now).toISOString(),matches:[{...match('x','2026-10-01'),home:'<img src=x onerror=alert(1)>',video:'javascript:alert(1)'}]}}; const html=renderTeam('united',s,new SpoilerState()); expect(html).toContain('&lt;img'); expect(html).not.toContain('href="javascript:'); expect(html).toContain('data-video-team'); });
});
describe('Aika ja videokoosteet',() => {
  it('huomioi Suomen kesäajan alkamisen',() => { expect(helsinki('2026-03-29T00:30Z')).toContain('02.30'); expect(helsinki('2026-03-29T01:30Z')).toContain('04.30'); });
  it('huomioi Suomen talviajan alkamisen',() => { expect(helsinki('2026-10-25T00:30Z')).toContain('03.30'); expect(helsinki('2026-10-25T01:30Z')).toContain('03.30'); expect(helsinki('2026-10-25T02:30Z')).toContain('04.30'); });
  it('ei esitä vahvistamatonta kellonaikaa tarkkana',() => expect(helsinki('2026-10-01T12:00Z',false)).toContain('kellonaika vahvistamatta'));
  it('laskee päivät, tunnit ja minuutit',() => expect(countdown('2026-11-24T07:30Z',now)).toBe('1 pv 1 h 30 min'));
  it('videopainikkeen hakulinkki sisältää oikeat joukkueet ja päivämäärän',() => { const m=past[0], q=new URL(videoLink(m,'united')).searchParams.get('search_query')!; expect(q).toContain(m.home); expect(q).toContain(m.away); expect(q).toContain(m.date.slice(0,10)); expect(q).toContain('highlights'); });
  it('käyttää vain sallittuja HTTPS-videolinkkejä',() => { expect(safeVideo('https://www.espn.com/video/clip/_/id/123')).toBeDefined(); expect(safeVideo('https://www.espn.com.evil.test/a')).toBeUndefined(); expect(safeVideo('http://www.espn.com/a')).toBeUndefined(); });
});
describe('Verkkovirheet',() => {
  it('käyttää eston jälkeen samalta sivustolta haettavaa tilannekuvaa ja säilyttää oikean hakuajan',async()=>{
    const updated='2026-11-20T10:00:00Z';
    vi.stubGlobal('fetch',vi.fn((url:string)=>url.includes('site.api.espn.com') ? Promise.reject(new Error('CORS')) : Promise.resolve({ok:true,json:async()=>({updated,matches:past})})));
    const snapshot=await fetchSnapshot('united'); expect(snapshot.updated).toBe(updated); expect(snapshot.source).toBe('snapshot'); expect(snapshot.matches).toHaveLength(2);
  });
  it('torjuu virheellisen varatilannekuvan',async()=>{vi.stubGlobal('fetch',vi.fn((url:string)=>url.includes('site.api.espn.com') ? Promise.reject(new Error('CORS')) : Promise.resolve({ok:true,json:async()=>({updated:'bad',matches:[]})}))); await expect(fetchSnapshot('united')).rejects.toThrow('tilannekuva');});
  it('käsittelee HTTP-virheen',async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503})); await expect(json('https://example.test')).rejects.toThrow('503'); });
  it('käsittelee virheellisen JSONin',async () => { vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:()=>Promise.reject(new Error('JSON'))})); await expect(json('https://example.test')).rejects.toThrow('JSON'); });
  it('keskeyttää aikakatkaistun pyynnön',async () => { vi.useFakeTimers(); vi.stubGlobal('fetch',vi.fn((_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))))); const result=expect(json('https://example.test')).rejects.toThrow('aborted'); await vi.advanceTimersByTimeAsync(12001); await result; });
});
