import './style.css';
import { countdown, select, SpoilerState, type Store, type TeamKey } from './model';
import { openVideo } from './video';
import { fetchSnapshot } from './data';
import { readCache, saveCache } from './cache';
import { renderTeam } from './ui';
import { initialStore, isStandalone } from './standalone';
const root = document.querySelector<HTMLDivElement>('#app')!;
let store: Store = initialStore(readCache());
const spoilers = new SpoilerState();
let busy = false;
const failures = new Set<TeamKey>();
root.innerHTML = `<main><header class="app-header"><a class="brand" href="./" aria-label="My Sports etusivu"><span class="brand-mark">M<span>↗</span></span>my sports<span class="brand-dot">.</span></a><button id="refresh">↻ Päivitä tiedot</button></header><h1 class="sr-only">Omat joukkueet</h1><p id="status" role="status" aria-live="polite"></p><div id="teams"></div><footer class="app-footer"><span>Ajat Suomen ajassa · ESPN</span><button id="install" hidden>Asenna My Sports</button></footer></main>`;
const cards = document.querySelector<HTMLDivElement>('#teams')!, status = document.querySelector<HTMLParagraphElement>('#status')!, refreshButton = document.querySelector<HTMLButtonElement>('#refresh')!;
if (isStandalone()) {
  document.querySelector<HTMLAnchorElement>('.brand')!.href = location.href;

}
function render() { cards.innerHTML = (['united','steelers'] as TeamKey[]).map(key => renderTeam(key,store,spoilers)).join(''); }
render();
cards.addEventListener('click', event => {
  const videoButton=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-video-team]');
  if(videoButton) {
    const key=videoButton.dataset.videoTeam as TeamKey;
    const match=select(store[key]?.matches ?? []).previous;
    if(match && match.id===videoButton.dataset.videoMatch) openVideo(match,key);
    return;
  }
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-team]');
  if (!button) return;
  const key = button.dataset.team as TeamKey, id = button.dataset.match!;
  spoilers.toggle(key,id); render();
  cards.querySelector<HTMLButtonElement>(`button[data-team="${key}"]`)?.focus();
});
function updateStatus(cacheSaved = true) {
  const stale = Object.values(store).some(s => Date.now()-Date.parse(s.updated)>30*60000);
  const snapshot = Object.values(store).some(s => s.source === 'snapshot');
  status.textContent = !navigator.onLine ? 'Offline · tallennetut tiedot voivat olla vanhentuneita.' : failures.size ? `Päivitys epäonnistui: ${[...failures].map(k => k === 'united' ? 'Manchester United' : 'Pittsburgh Steelers').join(', ')}. Näytetään aiemmat tiedot.` : !cacheSaved ? 'Tiedot päivitetty. Selain ei sallinut tallennusta offline-käyttöön.' : stale ? 'Tiedot voivat olla vanhentuneita · tarkista kortin hakuaika.' : busy ? 'Päivitetään otteluita…' : snapshot ? 'ESPN-tilannekuva · hakuaika korteissa.' : 'Tiedot päivitetty · automaattipäivitys 15 min';
  status.classList.toggle('warning',!navigator.onLine || !!failures.size || stale);
}
async function refresh() {
  if (busy) return;
  busy = true; refreshButton.disabled = true; updateStatus();
  await Promise.all((['united','steelers'] as TeamKey[]).map(async key => {
    try { const snapshot = await fetchSnapshot(key); if (!store[key] || Date.parse(snapshot.updated) >= Date.parse(store[key]!.updated)) store[key] = snapshot; failures.delete(key); } catch { failures.add(key); }
  }));
  const saved = saveCache(store); busy = false; refreshButton.disabled = false; render(); updateStatus(saved);
}
refreshButton.addEventListener('click',refresh);
document.addEventListener('visibilitychange',() => { if (!document.hidden) void refresh(); });
window.addEventListener('online',refresh);
window.addEventListener('offline',() => updateStatus());
setInterval(() => { if (!document.hidden) void refresh(); },15*60000);
setInterval(() => { document.querySelectorAll<HTMLElement>('[data-countdown]').forEach(el => { if(el.dataset.confirmed === 'true') el.textContent = countdown(el.dataset.countdown!); }); if(!busy) updateStatus(); },30000);
let installPrompt: any;
window.addEventListener('beforeinstallprompt',event => { event.preventDefault(); installPrompt = event; document.querySelector<HTMLButtonElement>('#install')!.hidden = false; });
document.querySelector('#install')?.addEventListener('click',async () => { if(installPrompt) { await installPrompt.prompt(); installPrompt = undefined; document.querySelector<HTMLButtonElement>('#install')!.hidden = true; } });
if (!isStandalone() && 'serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load',() => { void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { status.textContent = 'Offline-valmiuden käyttöönotto epäonnistui. Ottelut toimivat verkkoyhteydellä.'; }); });
void refresh();
