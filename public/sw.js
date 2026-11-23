const CACHE = 'my-sports-shell-__BUILD_VERSION__';
const base = new URL('./', self.location.href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch(base.href, {cache:'reload'});
    if (!response.ok) throw new Error('Shell unavailable');
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map(m => new URL(m[1],base).href);
    await cache.put(base.href,response);
    await cache.addAll([...assets, new URL('manifest.webmanifest',base).href, ...['icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','logos/united.png','logos/steelers.png'].map(x => new URL(x,base).href)]);
  })());
});
self.addEventListener('activate', event => { event.waitUntil((async () => { for (const key of await caches.keys()) if (key.startsWith('my-sports-shell-') && key !== CACHE) await caches.delete(key); await self.clients.claim(); })()); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // API JSON is managed by the application: only complete successful snapshots are persisted.
  if (event.request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  if (url.pathname.startsWith(new URL('data/',base).pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(CACHE)).match(base.href)));
  } else {
    event.respondWith((async () => { const cache = await caches.open(CACHE); const hit = await cache.match(event.request); if(hit) return hit; const response = await fetch(event.request); if(response.ok) await cache.put(event.request,response.clone()); return response; })());
  }
});
