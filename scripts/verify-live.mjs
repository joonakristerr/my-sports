import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work',{recursive:true});
await build({entryPoints:['src/api.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/api.mjs'});
await build({entryPoints:['src/model.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/model.mjs'});
const { fetchMatches, scheduleUrls } = await import('../work/api.mjs');
const { select } = await import('../work/model.mjs');
const report = { checkedAt:new Date().toISOString(), teams:{} };
for (const key of ['united','steelers']) {
  const matches=await fetchMatches(key), {previous,next}=select(matches);
  if(!previous || !next) throw new Error(`${key}: previous or next missing`);
  const urls=scheduleUrls(key);
  const probe=await fetch(urls[0].url,{headers:{Origin:'http://localhost:5173'}});
  report.teams[key]={matches:matches.length,competitions:[...new Set(matches.map(m=>m.slug))],cors:probe.headers.get('access-control-allow-origin'),previous:{id:previous.id,date:previous.date,home:previous.home,away:previous.away,league:previous.league},next:{id:next.id,date:next.date,home:next.home,away:next.away,league:next.league}};
  console.log(key,JSON.stringify(report.teams[key],null,2));
}
await writeFile('work/live-verification.json',JSON.stringify(report,null,2));
