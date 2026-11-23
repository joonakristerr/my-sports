import { safeVideo, videoLink, type Match, type TeamKey } from './model';
import { preferredOfficial } from './video-preference';
export function safeStream(value: unknown): string | undefined {
  try {
    const u = new URL(String(value));
    // Opaque file names keep result-bearing headlines out of DOM attributes too.
    if(u.protocol==='https:' && u.hostname==='espnmedia-cdn.akamaized.net' && /\/[a-f0-9-]{36}\.mp4$/i.test(u.pathname) && !u.search && !u.hash) return u.href;
  } catch { /* Invalid or untrusted URL. */ }
}
export function extractVideo(summary: any): {video?: string; videoStream?: string; videoDuration?: number} {
  if(!Array.isArray(summary?.videos)) return {};
  const candidates=[...summary.videos].sort((a,b)=>{
    const rank=(v:any)=>Number.isFinite(v?.duration) ? v.duration>=240&&v.duration<=360 ? Math.abs(v.duration-300) : 1000+Math.abs(v.duration-300) : 100000;
    return rank(a)-rank(b);
  });
  for(const v of candidates) {
    if(v?.source !== 'espn' || !/^\d+$/.test(String(v?.id ?? '')) || !/\b(game|match|full)\s+highlights\b|\bhighlights\s*:/i.test(String(v?.headline ?? ''))) continue;
    return {video:safeVideo(`https://www.espn.com/video/clip/_/id/${v.id}`),videoStream:safeStream(v.links?.source?.href),...(Number.isFinite(v.duration)&&v.duration>0?{videoDuration:v.duration}:{})};
  }
  return {};
}
export function openVideo(match: Match, key: TeamKey) {
  const dialog=document.createElement('dialog'); dialog.className='video-dialog'; dialog.setAttribute('aria-labelledby','video-dialog-title');
  const heading=document.createElement('h2'); heading.id='video-dialog-title'; heading.textContent='Ottelun videokooste';
  const close=document.createElement('button'); close.textContent='Sulje'; close.className='video-close';
  const content=document.createElement('div');
  dialog.append(heading,close,content);
  const official=preferredOfficial(match,match.officialVideo ? [match.officialVideo] : undefined);
  if(key==='steelers' && official) {
    const section=document.createElement('section');
    const label=document.createElement('h3');label.textContent=`Ensisijainen: virallinen kooste · ${Math.floor(official.duration/60)}:${String(official.duration%60).padStart(2,'0')}`;
    const warning=document.createElement('p');warning.textContent='Steelersin oma videosoitin avautuu uuteen välilehteen. Ulkoisen sivun otsikot ja kuvat voivat paljastaa tuloksen. Sovelluksen tulos pysyy piilotettuna.';
    const link=document.createElement('a');link.className='video';link.textContent='Avaa virallinen pitkä kooste (spoilerivaara)';link.href=official.url;link.target='_blank';link.rel='noopener noreferrer';
    section.append(label,warning,link);content.append(section);
    const alternative=document.createElement('h3');alternative.textContent=match.videoDuration ? `Vaihtoehto: sovelluksen sisällä · ${Math.floor(match.videoDuration/60)}:${String(match.videoDuration%60).padStart(2,'0')}` : 'Vaihtoehto: sovelluksen sisällä';content.append(alternative);
  }
  const stream=safeStream(match.videoStream);
  const external=()=>{
    const note=document.createElement('p'); note.textContent='Jos siirryt ulkoiselle sivulle, sen otsikot ja kuvat voivat paljastaa tuloksen.';
    const link=document.createElement('a');link.className='video';link.textContent=match.video?'Avaa ESPN:n sivu (spoilerivaara)':'Avaa YouTube-haku (spoilerivaara)';link.href=videoLink(match,key);link.target='_blank';link.rel='noopener noreferrer';
    content.append(note,link);
  };
  if(stream) {
    const note=document.createElement('p');note.textContent='Otsikkoa ja esikatselukuvaa ei näytetä. Koosteen oma kuva tai selostus voi paljastaa tuloksen toiston alettua.';
    const play=document.createElement('button');play.className='video';play.textContent='Toista kooste';
    content.append(note,play);
    play.addEventListener('click',()=>{
      play.remove();const player=document.createElement('video');player.controls=true;player.playsInline=true;player.preload='none';player.setAttribute('aria-label','Ottelun videokooste');player.src=stream;content.append(player);
      player.addEventListener('error',()=>{player.remove();const message=document.createElement('p');message.textContent='Videota ei voitu toistaa. Palvelun saatavuus tai aluerajoitus voi estää toiston.';content.append(message);external();},{once:true});
      void player.play().catch(()=>{ /* Native play control stays available. */ });
    },{once:true});
  } else {
    const note=document.createElement('p');note.textContent='Tälle ottelulle ei löytynyt suoraan sovelluksessa toistettavaa, varmennettua koostetta. Hakutuloksia tai videokuvia ei näytetä automaattisesti.';content.append(note);external();
  }
  const cleanup=()=>{dialog.querySelector('video')?.pause();dialog.remove();};
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',cleanup,{once:true});
  document.body.append(dialog);dialog.showModal();
}
