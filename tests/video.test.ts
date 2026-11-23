// @vitest-environment jsdom
import { it,expect,vi,afterEach } from 'vitest';
import { extractVideo,openVideo,safeStream } from '../src/video';
import type { Match } from '../src/model';
import { preferredOfficial } from '../src/video-preference';
const stream='https://espnmedia-cdn.akamaized.net/espn/media/16x9/wsc/2026/1122/a64030ba-32d6-4958-a7a8-19757868d95a/a64030ba-32d6-4958-a7a8-19757868d95a.mp4';
const match:Match={id:'game',date:'2026-11-22T18:00Z',slug:'nfl',league:'NFL',home:'Pittsburgh Steelers',away:'Opponent',state:'final',timeConfirmed:true,homeScore:'99',awayScore:'88'};
function setup(){
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new Event('close'));};
  vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
}
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
it('poimii virallisen game highlights -videon ilman otsikkoa tai kuvaa',()=>{
  const result=extractVideo({videos:[{id:123,source:'espn',headline:'Game Highlights: team wins 99–88',thumbnail:'spoiler.jpg',links:{source:{href:stream}}}]});
  expect(result).toEqual({video:'https://www.espn.com/video/clip/_/id/123',videoStream:stream});expect(JSON.stringify(result)).not.toMatch(/wins|99|thumbnail/);
});
it('ei hyväksy analyysiä tai epävirallista videota koosteen sijaan',()=>{expect(extractVideo({videos:[{id:123,source:'espn',headline:'Team wins 99–88 analysis'},{id:456,source:'other',headline:'Game highlights'}]})).toEqual({});});
it('hylkää tulosotsikon sisältävän tiedostonimen ja vieraan verkkotunnuksen',()=>{expect(safeStream('https://espnmedia-cdn.akamaized.net/team-wins-99-88.mp4')).toBeUndefined();expect(safeStream(stream.replace('espnmedia-cdn.akamaized.net','evil.test'))).toBeUndefined();});
it('ei luo videota, esikatselukuvaa tai tulostekstiä katseluikkunaa avattaessa',()=>{setup();openVideo({...match,videoStream:stream},'steelers');expect(document.querySelector('video,img,iframe')).toBeNull();expect(document.body.innerHTML).not.toMatch(/99|88|poster=|thumbnail/);expect(document.body.textContent).toContain('Toista kooste');});
it('lataa videon vasta toistopainikkeesta eikä näytä palvelun otsikkoa',()=>{setup();openVideo({...match,videoStream:stream},'steelers');[...document.querySelectorAll('button')].find(b=>b.textContent==='Toista kooste')!.click();const player=document.querySelector('video')!;expect(player.src).toBe(stream);expect(player.hasAttribute('poster')).toBe(false);expect(player.hasAttribute('autoplay')).toBe(false);expect(player.preload).toBe('none');expect(player.getAttribute('aria-label')).toBe('Ottelun videokooste');});
it('ulkoinen haku vaatii erillisen valinnan ja varoittaa spoilereista',()=>{setup();openVideo(match,'steelers');expect(document.querySelector('video,iframe,img')).toBeNull();const link=document.querySelector('a')!;expect(link.textContent).toContain('spoilerivaara');expect(link.href).toContain('youtube.com/results');expect(link.rel).toBe('noopener noreferrer');expect(document.body.textContent).not.toMatch(/99|88/);});
it('sulkeminen poistaa katseluikkunan ja pysäyttää videon',()=>{setup();openVideo({...match,videoStream:stream},'steelers');[...document.querySelectorAll('button')].find(b=>b.textContent==='Toista kooste')!.click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Sulje')!.click();expect(document.querySelector('dialog')).toBeNull();expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();});
const official={matchId:match.id,date:match.date,home:match.home,away:match.away,url:'https://www.steelers.com/video/highlights-week-11-vs-eagles',duration:340,provider:'Steelers' as const};
it('suosii ESPN:n virallisista koosteista 4–6 minuutin versiota ja lähintä viittä minuuttia',()=>{
  const item=(id:number,duration:number)=>({id,duration,source:'espn',headline:'Game Highlights',links:{source:{href:stream}}});
  expect(extractVideo({videos:[item(1,52),item(2,340),item(3,298),item(4,700)]})).toMatchObject({video:'https://www.espn.com/video/clip/_/id/3',videoDuration:298});
});
it('pitkä kooste hyväksytään vain täsmälleen oikealle ottelulle',()=>{
  expect(preferredOfficial(match,[official])).toEqual(official);
  for(const change of [{id:'new'},{date:'2027-01-01'},{home:'Other team'},{away:'Other team'}])expect(preferredOfficial({...match,...change},[official])).toBeUndefined();
});
it('ei väitä lyhyttä tai liian pitkää tai vahvistamatonta videota viiden minuutin koosteeksi',()=>{
  for(const duration of [52,239,361,NaN,undefined])expect(preferredOfficial(match,[{...official,duration}])).toBeUndefined();
  expect(preferredOfficial(match,[{...official,url:'https://www.steelers.com.evil.test/video/test'}])).toBeUndefined();
});
it('näyttää pitkän virallisen koosteen ensin, mutta ei lataa ulkoista sivua tai videota automaattisesti',()=>{
  setup();openVideo({...match,officialVideo:official,videoStream:stream,videoDuration:52},'steelers');
  expect(document.querySelector('h3')?.textContent).toContain('5:40');
  const link=document.querySelector('a')!;expect(link.href).toBe(official.url);expect(link.textContent).toContain('spoilerivaara');
  expect(document.body.textContent).toContain('0:52');expect(document.querySelector('iframe,img,video')).toBeNull();expect(document.body.textContent).not.toMatch(/99|88/);
});
