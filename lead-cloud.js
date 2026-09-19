/* HomeINN — lead-cloud laag (Supabase, publieke site).
   Optioneel en fail-silent: de bestaande localStorage-inbox + FormSubmit-e-mail blijven de
   primaire, altijd-werkende paden. Deze laag stuurt elke lead ADDITIONEEL naar de centrale
   'hios_leads'-tabel, zodat hij ook zichtbaar is in het beheerportaal als dat op een ander
   apparaat/browser openstaat. Faalt dit (geen internet, Supabase down), dan verandert er
   niets aan het bestaande gedrag van de site.

   WAAROM EEN KALE FETCH EN GEEN SDK (gewijzigd 19 september 2026)
   De database staat op het gratis plan en gaat in hibernatie. Gemeten: een koud verzoek
   duurt 7,7 s, een warm verzoek 0,4 s. De insert was fire-and-forget zonder tijdslimiet,
   terwijl de e-mailroute al na 1–2 s klaar is en het bevestigingsscherm toont. Klikte de
   bezoeker dan weg, dan brak de browser de nog lopende insert af: de lead stond wél in de
   mailbox, maar niet in het portaal — juist bij de eerste lead na een stille periode.

   `keepalive: true` laat het verzoek doorlopen nadat de pagina is gesloten, waarmee die
   trage koude start niet meer uitmaakt. Daarvoor is de Supabase-SDK niet nodig: invoegen
   was de enige bewerking die deze laag deed. Dat scheelt ~54 kB en een CDN-afhankelijkheid
   op de acht publieke formulierpagina's. De portalen laden de SDK nog wel zelf — die doen
   auth en queries, dus de CSP houdt cdn.jsdelivr.net.

   LET OP bij wijzigen: `Prefer: return=minimal` is VERPLICHT. De anon-rol heeft op
   hios_leads alleen een INSERT-policy en geen SELECT; met return=representation probeert
   PostgREST de ingevoegde rij terug te lezen en faalt de hele insert op RLS. */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC'; // publishable (anon) key — bedoeld voor de browser; RLS bewaakt de tabel
  var ENDPOINT = SUPABASE_URL + '/rest/v1/hios_leads';
  // Een keepalive-verzoek mag samen met andere keepalive-verzoeken niet boven ~64 kB uitkomen.
  // Daarboven laten we keepalive vallen in plaats van het verzoek te laten weigeren.
  var KEEPALIVE_MAX = 60000;

  window.pushLeadToCloud = function (type, data, source) {
    try {
      if (location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return;
      var rij = {
        local_id: data.id || null,
        type: type || 'Contact',
        source: source || location.pathname.replace(/^\//, '') || 'onbekend',
        name: data.name || data.naam || '',
        email: data.email || (/@/.test(data.contact || '') ? data.contact : ''),
        phone: data.phone || (!/@/.test(data.contact || '') ? (data.contact || '') : ''),
        subject: data.subject || '',
        message: data.message || '',
        portfolio: data.portfolio || '',
        handled: false
      };
      var body = JSON.stringify(rij);
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: body.length <= KEEPALIVE_MAX,
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: body
      }).then(function (r) {
        if (!r.ok) {
          r.text().then(function (t) { console.warn('Lead-cloud insert mislukt (' + r.status + '):', t); })
            .catch(function () { console.warn('Lead-cloud insert mislukt (' + r.status + ')'); });
        }
      }).catch(function () { /* offline of geblokkeerd — lokale flow + e-mail blijven werken */ });
    } catch (err) { /* nooit de bezoeker hinderen */ }
  };
})();


/* Tijdslimiet voor e-mailbezorging, inclusief het lezen van het antwoord. */
window.fetchLeadWithTimeout = function (url, options) {
  var controller = new AbortController();
  var timer;
  var timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () {
      controller.abort();
      reject(new Error('Verzenden duurde te lang'));
    }, 15000);
  });
  var request = Promise.resolve().then(function () {
    return fetch(url, Object.assign({}, options, { signal: controller.signal }));
  }).then(function (response) {
    return response.text().then(function (body) {
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    });
  });
  return Promise.race([request, timeout]).finally(function () { clearTimeout(timer); });
};
