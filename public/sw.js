const CACHE = 'zia-runtime-v2-lab-isolated'
const scope = new URL(self.registration.scope)
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('zia-runtime-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  const request = event.request, url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return
  const path = url.pathname.slice(scope.pathname.length)
  if (/^(warrior-asset-lab\/|dungeon-reborn\/|vendor\/|assets\/)/.test(path)) return
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})) }
    return response
  }).catch(async () => (await caches.match(request)) || new Response('目前離線，請重新連線。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
})
