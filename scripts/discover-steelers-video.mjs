import { chromium } from '@playwright/test';
import { readFile,writeFile } from 'node:fs/promises';
// Use the official site's normal player to read duration. Never extract, store
// or replay its authorization tokens or signed playback URLs.
export async function discoverSteelersVideo(match) {
  const file='src/official-videos.json';
  let catalog=JSON.parse(await readFile(file,'utf8'));
  if(catalog.some(v=>v.matchId===match.id && v.date===match.date && v.home===match.home && v.away===match.away))return catalog;
  let browser;
  try {
    const response=await fetch('https://www.steelers.com/video/archive/game-day/',{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('Official archive unavailable');
    const html=await response.text();
    const opponent=match.home==='Pittsburgh Steelers'?match.away:match.home;
    const nickname=opponent.split(' ').at(-1).toLowerCase();
    const paths=[...new Set([...html.matchAll(/href="(\/video\/highlights-week-\d+-vs-[a-z0-9-]+)"/g)].map(m=>m[1]))].filter(path=>path.includes(`-vs-${nickname}`)).slice(0,3);
    const pages=await Promise.all(paths.map(async path=>{const r=await fetch(`https://www.steelers.com${path}`,{signal:AbortSignal.timeout(12000)});return r.ok?await r.text():'';}));
    const configs=pages.flatMap(page=>[...page.matchAll(/<script[^>]*id="video-config-[^"]+"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1]);}catch{return {};}}));
    const entry=configs.flatMap(c=>c.playlist??[]).find(v=>{
      const delta=Date.parse(match.date)-Date.parse(v.contentDate);
      return /^HIGHLIGHTS:\s*Week\s+\d+\s+vs\./i.test(v.title??'') && String(v.description).includes(opponent) && delta>=0 && delta<48*3600000 && /^[a-z0-9-]+$/.test(v.slug??'') && /^\d+$/.test(String(v.mcpID??''));
    });
    if(!entry)throw new Error('No matching official full-game highlight');
    const url=`https://www.steelers.com/video/${entry.slug}`;
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage();
    const metadata=page.waitForResponse(r=>r.url()===`https://api.nfl.com/play/v1/asset/${entry.mcpID}` && r.status()===200,{timeout:25000});
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
    const data=await(await metadata).json();
    const duration=Number(data?.metadata?.event?.duration);
    if(!Number.isFinite(duration)||duration<240||duration>360)throw new Error('No verified 4–6 minute version');
    catalog=[...catalog.filter(v=>v.matchId!==match.id),{matchId:match.id,date:match.date,home:match.home,away:match.away,url,duration,provider:'Steelers'}];
    await writeFile(file,JSON.stringify(catalog,null,2)+'\n');
    console.log(`Steelers: virallinen ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')} kooste varmennettu`);
  } catch {console.log('Steelers: uutta 4–6 minuutin koostetta ei voitu varmentaa; aiemmat ottelukohtaiset viitteet säilytetään.');}
  finally {await browser?.close();}
  return catalog;
}
