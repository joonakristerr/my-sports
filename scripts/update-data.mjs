import { build } from 'esbuild';
import { mkdir,writeFile } from 'node:fs/promises';
import { discoverSteelersVideo } from './discover-steelers-video.mjs';
await mkdir('work',{recursive:true});
await mkdir('public/data',{recursive:true});
await build({entryPoints:['src/api.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/update-api.mjs'});
const { fetchMatches } = await import('../work/update-api.mjs');
// All-or-nothing across teams; a failing source never overwrites the last good snapshot.
const snapshots=await Promise.all(['united','steelers'].map(async key=>({key,matches:await fetchMatches(key)})));
const steelers=snapshots.find(s=>s.key==='steelers');
const previous=steelers.matches.filter(m=>m.state==='final'&&Date.parse(m.date)<=Date.now()).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0];
if(previous){const catalog=await discoverSteelersVideo(previous);previous.officialVideo=catalog.find(v=>v.matchId===previous.id&&v.date===previous.date&&v.home===previous.home&&v.away===previous.away);}
for(const {key,matches} of snapshots) {
  await writeFile(`public/data/${key}.json`,JSON.stringify({updated:new Date().toISOString(),source:'snapshot',matches}));
  console.log(`${key}: ${matches.length} ottelua tallennettu`);
}
