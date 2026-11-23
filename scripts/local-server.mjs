import { createHash } from 'node:crypto';
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const project = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const identity = createHash('sha256').update(project.toLowerCase()).digest('hex');
const endpoint = '/__my-sports-instance';
const stateFile = resolve(project,'work/local-server.json');
export async function findExisting(ports) {
  if(!ports) {
    ports=Array.from({length:27}, (_,i)=>4173+i);
    try {
      const state=JSON.parse(await readFile(stateFile,'utf8'));
      if(Number.isInteger(state.port) && state.port>0 && state.port<=65535) ports=[state.port,...ports.filter(p=>p!==state.port)];
    } catch { /* A stale or missing record is harmless; probe known ports. */ }
  }
  let builtHtml;
  try { builtHtml = await readFile(resolve(project,'dist/index.html'),'utf8'); } catch {}
  const results = await Promise.all(ports.map(async port=>{
    const url=`http://127.0.0.1:${port}/`;
    try {
      const response=await fetch(new URL(endpoint,url),{signal:AbortSignal.timeout(600),redirect:'error'});
      if(response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const data=await response.json();
        if(data.app==='my-sports' && data.identity===identity) return url;
      }
      // Recognize older previews by the complete built HTML, not just a title.
      if(builtHtml) {
        const page=await fetch(url,{signal:AbortSignal.timeout(600),redirect:'error'});
        if(page.ok && await page.text()===builtHtml) return url;
      }
    } catch { /* Unused port or a different local application. */ }
  }));
  return results.find(Boolean);
}
export async function startServer({open=true,port=4173}={}) {
  const {preview}=await import('vite');
  const server=await preview({root:project,plugins:[{
    name:'my-sports-local-instance',
    configurePreviewServer(server) {
      server.middlewares.use(endpoint,(_request,response)=>{
        response.setHeader('Content-Type','application/json');
        response.setHeader('Cache-Control','no-store');
        response.end(JSON.stringify({app:'my-sports',identity}));
      });
    }
  }],preview:{host:'127.0.0.1',port,strictPort:false,open}});
  const actualPort=Number(new URL(server.resolvedUrls.local[0]).port);
  await mkdir(resolve(project,'work'),{recursive:true});
  await writeFile(stateFile,JSON.stringify({port:actualPort}));
  server.printUrls();
  return server;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--find')) {
    const url=await findExisting();
    if(url) console.log(url);
  } else await startServer({open:!process.argv.includes('--no-open')});
}
