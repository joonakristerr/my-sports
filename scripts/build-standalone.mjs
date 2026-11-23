import { build } from 'esbuild';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
const result=await build({entryPoints:['src/main.ts'],bundle:true,format:'iife',target:'es2022',minify:true,write:false,outdir:'work/standalone',define:{'import.meta.env.BASE_URL':'"./"','import.meta.env.PROD':'false'},plugins:[{
  name:'standalone-local-styles',
  setup(builder) {
    builder.onLoad({filter:/\.css$/},async ({path})=>({
      // Remove the complete source import before minification. Font URLs contain
      // semicolons, so matching only up to the first semicolon corrupts CSS.
      contents:(await readFile(path,'utf8')).replace(/^\s*@import\s+url\([^\r\n]*\);\s*$/gm,''),loader:'css'
    }));
  }
}]});
const js=result.outputFiles.find(x=>x.path.endsWith('.js')).text;
const css=result.outputFiles.find(x=>x.path.endsWith('.css')).text;
if(css.includes('@import') || !css.includes(':root')) throw new Error('Standalone CSS validation failed');
const store={},logos={};
for(const key of ['united','steelers']) {
  store[key]=JSON.parse(await readFile(`public/data/${key}.json`,'utf8'));
  logos[`${key}.png`]=`data:image/png;base64,${(await readFile(`public/logos/${key}.png`)).toString('base64')}`;
}
const icon=`data:image/png;base64,${(await readFile('public/icons/icon-192.png')).toString('base64')}`;
const embedded=JSON.stringify({store,logos}).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const html=`<!doctype html><html lang="fi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101315"><title>My Sports</title><link rel="icon" href="${icon}"><style>${css}</style></head><body><div id="app"></div><script>window.MY_SPORTS_EMBEDDED=${embedded};</script><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
await writeFile('My Sports.html',html);
console.log(`My Sports.html luotu (${Math.round(Buffer.byteLength(html)/1024)} kt). Ei tarvitse palvelinta tai Node.js:ää käyttämiseen.`);
