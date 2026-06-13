/* HomeINN OS — service worker: app installeerbaar + offline bruikbaar.
   Bump CACHE bij elke release zodat oude bestanden worden vervangen. */
const CACHE = 'homeinn-os-v36';
const CORE = [
  'portaal.html', 'app.js', 'cloud.js', 'styles.css',
  'homeinn-public.html', 'homeinn-public.js', 'homeinn-public.css',
  'investeerders.html', 'investeerders.js', 'huurders.html', 'huurders.js',
  'inloggen.html', 'inloggen.js', 'kopers.html', 'kopers.js', 'verkoper.html', 'verkoper.js',
  'manifest.webmanifest', 'fonts/fonts.css',
  'assets/logo-light.png', 'assets/logo-dark.png', 'assets/favicon-512.png', 'assets/favicon-maskable-512.png'
];

self.addEventListener('install', e => {
  // Precache de kern; ontbrekende bestanden mogen de installatie niet breken.
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // externe requests (kaarten, fonts-cdn) ongemoeid

  // aanbod.json altijd vers proberen op te halen, val terug op cache (offline).
  if (url.pathname.endsWith('aanbod.json')) {
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req)));
    return;
  }

  // Navigaties (HTML): netwerk eerst zodat updates verschijnen, anders cache.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req).then(m => m || caches.match('portaal.html'))));
    return;
  }

  // Code (JS/CSS): netwerk eerst + revalideren (no-cache), zodat nieuwe code altijd direct laadt;
  // cache alleen als offline-fallback.
  if (req.destination === 'script' || req.destination === 'style' || /\.(js|css)$/.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req)));
    return;
  }

  // Overige assets (afbeeldingen, fonts): cache eerst, anders netwerk (en bijwerken in cache).
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => m)));
});
