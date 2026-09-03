/* HomeINN — lead-cloud laag (Supabase, publieke site).
   Optioneel en fail-silent: de bestaande localStorage-inbox + FormSubmit-e-mail blijven de
   primaire, altijd-werkende paden. Deze laag stuurt elke lead ADDITIONEEL naar de centrale
   'hios_leads'-tabel, zodat hij ook zichtbaar is in het beheerportaal als dat op een ander
   apparaat/browser openstaat. Faalt dit (geen internet, Supabase down, CDN geblokkeerd),
   dan verandert er niets aan het bestaande gedrag van de site.

   De Supabase-SDK (~54 kB gzip) wordt NIET meer op elke paginaweergave geladen, maar pas
   zodra een bezoeker een formulierveld aanraakt — en anders pas bij het versturen. Gepind
   op een exacte versie met integriteitscontrole (SRI), zodat een CDN-wijziging nooit stil
   ander code kan laden. */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC'; // publishable (anon) key — bedoeld voor de browser; RLS bewaakt de tabel
  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.114.0/dist/umd/supabase.min.js';
  var SDK_SRI = 'sha384-0UK+HVlz5Y7F//atDpPysyocv/PjGXQoBX+XSaL/eEotARW8rPFh+lL5sO0Ljzfi';
  var client = null;
  var sdkPromise = null;

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SDK_URL;
      s.integrity = SDK_SRI;
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { sdkPromise = null; reject(new Error('Supabase-SDK niet geladen')); };
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  function getClient() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) return null;
    // Geen sessie-persistentie nodig: anonieme bezoekers loggen nooit in op dit kanaal.
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  // Warm de SDK op zodra iemand een formulierveld aanraakt — de latentie valt dan in de tijd
  // die de bezoeker toch nodig heeft om het formulier in te vullen.
  function warm(e) {
    var t = e.target;
    if (!(t && t.form)) return;
    document.removeEventListener('focusin', warm, true);
    loadSdk().catch(function () { /* stil: bij verzenden wordt het opnieuw geprobeerd */ });
  }
  document.addEventListener('focusin', warm, true);

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
        portfolio: data.portfolio || ''
      };
      loadSdk().then(function () {
        var c = getClient();
        if (!c) return;
        return c.from('hios_leads').insert(rij).then(function (res) {
          if (res && res.error) console.warn('Lead-cloud insert mislukt:', res.error.message);
        });
      }).catch(function () { /* CDN geblokkeerd of offline — lokale flow + e-mail blijven werken */ });
    } catch (err) { /* nooit de bezoeker hinderen */ }
  };
})();
