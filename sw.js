/* HomeINN — service worker: installeerbaar + offline bruikbaar.
   Bump CACHE bij elke release zodat oude bestanden worden vervangen.

   Precache bewust LICHT: alleen wat elke publieke pagina nodig heeft. Portaalcode
   (app.js ~320 kB, cloud.js, styles.css) wordt pas gecachet als iemand het portaal
   daadwerkelijk bezoekt — een bezoeker van de landingspagina hoort die niet te
   downloaden. HTML-pagina's worden bij bezoek gecachet (netwerk eerst). */
const CACHE = 'homeinn-os-v126';
const CORE = [
  'homeinn-public.html', 'homeinn-public.js', 'homeinn-public.css', 'site-nav.js', 'lead-cloud.js',
  'lightbox.js', 'tokens.css', 'fonts/fonts.css', 'manifest.webmanifest', 'aanbod.json',
  'assets/logo-light.webp'
];
const PORTAAL = /\/(portaal|inloggen|huurders|kopers|verkoper|investeerders)\.html$/;

self.addEventListener('install', e => {
  // Precache de kern; ontbrekende bestanden mogen de installatie niet breken.
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // Navigation preload: het HTML-verzoek start al terwijl de service worker nog opstart.
  e.waitUntil(
    Promise.all([
      self.registration.navigationPreload ? self.registration.navigationPreload.enable().catch(() => {}) : null,
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    ]).then(() => self.clients.claim())
  );
});

// Alleen geslaagde antwoorden bewaren — nooit een 404 of 500 in de cache laten belanden.
function bewaar(req, r) {
  if (r && r.ok && r.type === 'basic') caches.open(CACHE).then(c => c.put(req, r.clone())).catch(() => {});
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // externe requests (CDN, kaarten) ongemoeid

  // Data-JSON (aanbod.json, portefeuille.json, …) en de manifesten altijd vers proberen op te halen,
  // val terug op cache (offline). Een JSON- of manifestwijziging bumpt geen CACHE.
  if (/\.(json|webmanifest)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(r => bewaar(req, r)).catch(() => caches.match(req)));
    return;
  }

  // Navigaties (HTML): netwerk eerst zodat updates verschijnen, anders cache.
  // Offline-terugval: portaalpagina's → portaal, al het andere → de publieke site.
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.resolve(e.preloadResponse).then(p => p || fetch(req)).then(r => bewaar(req, r)).catch(() =>
        caches.match(req)
          .then(m => m || caches.match(PORTAAL.test(url.pathname) ? 'portaal.html' : 'homeinn-public.html'))
          // Portaal nog nooit bezocht = portaal.html niet gecachet: val dan terug op de (voorgecachete) publieke site.
          .then(m => m || caches.match('homeinn-public.html'))
      )
    );
    return;
  }

  // Code (JS/CSS). Met ?v=-token: cache eerst — elke wijziging krijgt een nieuwe ?v= (en dus een
  // nieuwe URL), dus een treffer is altijd de juiste versie en kost geen extra rondgang.
  // Zonder token (portaalcode): netwerk eerst + revalideren (no-cache); cache alleen als offline-fallback.
  if (req.destination === 'script' || req.destination === 'style' || /\.(js|css)$/.test(url.pathname)) {
    if (url.searchParams.has('v')) {
      e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => bewaar(req, r))).catch(() => caches.match(req, { ignoreSearch: true })));
      return;
    }
    // Pagina's vragen code op mét ?v=-token, de precache staat er zónder: bij een misser
    // ook zonder querystring zoeken, anders is de precache offline waardeloos.
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => bewaar(req, r)).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // Overige assets (afbeeldingen, fonts): cache eerst (exacte URL, dus een nieuwe ?v= haalt het
  // nieuwe bestand), anders netwerk (en bewaren); offline ook zonder querystring zoeken.
  e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => bewaar(req, r)).catch(() => caches.match(req, { ignoreSearch: true }))));
});
