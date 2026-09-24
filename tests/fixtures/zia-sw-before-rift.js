// Preserve Workspace caching while isolating the independent game and asset pipeline.
const CACHE = 'zia-runtime-workspace-2-lab'
const scope = self.registration.scope
const core = ['./', './index.html', './manifest.webmanifest', './icons/zia-icon.svg'].map(path => new URL(path, scope).href)
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(core)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('zia-runtime-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return
  const path = new URL(request.url).pathname.slice(new URL(scope).pathname.length)
  // Mutable GLBs, manifests and decoder files must not be restored from old caches.
  if (/^(dungeon-reborn|warrior-asset-lab|assets\/characters|vendor)\//.test(path)) return
  const getNetwork = async () => {
    const response = await fetch(request)
    if (response.ok && response.type !== 'opaque') {
      const cache = await caches.open(CACHE)
      try { await cache.put(request, response.clone()) } catch { /* Keep successful network responses usable when cache is full. */ }
    }
    return response
  }
  if (request.mode === 'navigate') {
    event.respondWith(getNetwork().catch(async () => (await caches.match(request)) || (await caches.match(new URL('./index.html', scope).href)) || new Response('目前離線，請連線後重新開啟 Zia。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    return
  }
  event.respondWith(caches.match(request).then(cached => cached || getNetwork().catch(() => new Response('', { status: 503 }))))
})
