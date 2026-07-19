// Neon Dash — service worker : jeu jouable hors-ligne après la première visite.
// La page (index.html) est servie réseau-d'abord pour que les mises à jour arrivent
// dès la visite suivante ; les gros assets (musique, icône) restent cache-first.
const CACHE = 'neon-dash-v2';
const ASSETS = ['./', './index.html', './neon-dash-music.wav', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' ||
    new URL(e.request.url).pathname.replace(/\/index\.html$/, '/').endsWith('/');
  if (isPage) {
    // réseau d'abord : version fraîche si en ligne, cache sinon
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
