import catalog from './official-videos.json';
import type { Match } from './model';
export interface OfficialVideo {matchId:string;date:string;home:string;away:string;url:string;duration:number;provider:'Steelers'}
export function preferredOfficial(match:Match, entries:unknown = catalog): OfficialVideo | undefined {
  if(!Array.isArray(entries)) return;
  return entries.filter((v:any)=>{
    if(v?.matchId!==match.id || v.date!==match.date || v.home!==match.home || v.away!==match.away || v.provider!=='Steelers' || !Number.isFinite(v.duration) || v.duration<240 || v.duration>360) return false;
    try {const u=new URL(v.url);return u.protocol==='https:' && u.hostname==='www.steelers.com' && /^\/video\/[a-z0-9-]+$/.test(u.pathname) && !u.search && !u.hash;}catch{return false;}
  }).sort((a,b)=>Math.abs(a.duration-300)-Math.abs(b.duration-300))[0];
}
