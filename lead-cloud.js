/* HomeINN — lead-cloud laag (Supabase, publieke site).
   Deze laag stuurt elke lead naar de centrale 'hios_leads'-tabel (alert, bevestigingsmail en
   admin-inbox hangen daaraan), naast de localStorage-inbox + FormSubmit-e-mail. Hij hindert de
   bezoeker nooit: fouten worden niet gegooid.

   SINDS 1 oktober 2026: pushLeadToCloud() geeft een Promise<boolean> terug (true = insert
   gelukt). window.hiLeadOk(cloud, mail) bepaalt het resultaat van een formulier: geslaagd
   zodra de cloud-insert óf de e-mail lukt. Zo ziet een bezoeker geen foutmelding (en verstuurt
   hij geen dubbele lead) als alleen FormSubmit hapert, en blijft een geweigerde insert niet
   meer onzichtbaar als ook de e-mail faalt.

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

  /* VELDEN EN GRENZEN (3 oktober 2026, beveiligingsronde)
     - De rij bevat precies deze tien kolommen. De geplande database-migratie (kolomgrant)
       geeft anon alleen INSERT op dezelfde tien; stuur hier dus nooit een extra kolom mee,
       anders weigert PostgREST de hele insert.
     - local_id komt in het portaal in de Aanvragen-inbox terecht. Alleen ons eigen formaat
       ('lead' + base36, zie saveLead) gaat mee; een afwijkende waarde wordt null en de
       database valt dan terug op de uuid. Een CHECK-constraint met exact dit patroon staat in
       dezelfde geplande migratie; pas LOCAL_ID_RE en die constraint altijd samen aan.
     - Tekstvelden worden op de lengtegrenzen van de geplande CHECK-constraint ingekort (in
       tekens, net als length() in Postgres; MAX hieronder mag nooit ruimer zijn dan die
       constraint), zodat een heel lang bericht de cloud-lead niet laat weigeren.
       De e-mail via FormSubmit krijgt het volledige bericht. NUL-tekens en losse
       surrogaathelften, die Postgres in JSON weigert, worden weggepoetst. */
  var LOCAL_ID_RE = /^lead[a-z0-9]{4,24}$/;
  var MAX = { type: 60, source: 200, name: 200, email: 254, phone: 100, subject: 300, message: 5000, portfolio: 300 };

  function schoon(v, max) {
    var s = (v == null ? '' : String(v)).replace(/\u0000/g, '');
    var tekens = Array.from(s, function (c) {
      var n = c.charCodeAt(0);
      return (c.length === 1 && n >= 0xD800 && n <= 0xDFFF) ? '\uFFFD' : c;
    });
    if (tekens.length > max) tekens = tekens.slice(0, max - 1).concat('\u2026');
    return tekens.join('');
  }

  window.pushLeadToCloud = function (type, data, source) {
    try {
      if (location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return Promise.resolve(false);
      if (!data) return Promise.resolve(false);
      var contact = String(data.contact || '');
      var rij = {
        local_id: LOCAL_ID_RE.test(String(data.id || '')) ? String(data.id) : null,
        type: schoon(type || 'Contact', MAX.type),
        source: schoon(source || location.pathname.replace(/^\//, '') || 'onbekend', MAX.source),
        name: schoon(data.name || data.naam || '', MAX.name),
        email: schoon(data.email || (/@/.test(contact) ? contact : ''), MAX.email),
        phone: schoon(data.phone || (!/@/.test(contact) ? contact : ''), MAX.phone),
        subject: schoon(data.subject || '', MAX.subject),
        message: schoon(data.message || '', MAX.message),
        portfolio: schoon(data.portfolio || '', MAX.portfolio),
        handled: false
      };
      var body = JSON.stringify(rij);
      // De keepalive-grens telt bytes, niet JS-tekens (een emoji = 4 bytes, maar .length 2).
      var bytes = body.length;
      try { if (window.TextEncoder) bytes = new TextEncoder().encode(body).length; } catch (e) { bytes = body.length * 3; }
      return fetch(ENDPOINT, {
        method: 'POST',
        keepalive: bytes <= KEEPALIVE_MAX,
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
        return r.ok;
      }).catch(function () { return false; /* offline of geblokkeerd — lokale flow + e-mail blijven werken */ });
    } catch (err) { return Promise.resolve(false); /* nooit de bezoeker hinderen */ }
  };
})();

/* Resultaat van een formulier: resolve(true) zodra de cloud-insert met true slaagt óf de
   e-mailbelofte vervult (welke waarde ook — geef dus een mail-promise mee die bij mislukken
   REJECT). Reject pas als beide zijn mislukt, of na 25 s zonder enig succes. */
window.hiLeadOk = function (cloud, mail) {
  return new Promise(function (resolve, reject) {
    var klaar = false, mislukt = 0;
    var timer = setTimeout(function () {
      if (!klaar) { klaar = true; reject(new Error('Lead-bezorging duurde te lang')); }
    }, 25000);
    function gelukt() {
      if (klaar) return;
      klaar = true; clearTimeout(timer); resolve(true);
    }
    function fout(err) {
      if (klaar || ++mislukt < 2) return;
      klaar = true; clearTimeout(timer); reject(err instanceof Error ? err : new Error('Lead niet bezorgd'));
    }
    Promise.resolve(cloud).then(function (v) { if (v === true) gelukt(); else fout(); }, fout);
    Promise.resolve(mail).then(gelukt, fout);
  });
};


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
