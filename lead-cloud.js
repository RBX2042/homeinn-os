/* HomeINN — lead-cloud laag (Supabase, publieke site).
   Optioneel en fail-silent: de bestaande localStorage-inbox + FormSubmit-e-mail blijven de
   primaire, altijd-werkende paden. Deze laag stuurt elke lead ADDITIONEEL naar de centrale
   'hios_leads'-tabel, zodat hij ook zichtbaar is in het beheerportaal als dat op een ander
   apparaat/browser openstaat. Faalt dit (geen internet, Supabase down, CDN geblokkeerd),
   dan verandert er niets aan het bestaande gedrag van de site. */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';
  var client = null;

  function getClient() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) return null;
    // Geen sessie-persistentie nodig: anonieme bezoekers loggen nooit in op dit kanaal.
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  window.pushLeadToCloud = function (type, data, source) {
    try {
      if (location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return;
      var c = getClient();
      if (!c) return; // CDN nog niet geladen of geblokkeerd — geen probleem, lokale flow blijft werken
      c.from('hios_leads').insert({
        local_id: data.id || null,
        type: type || 'Contact',
        source: source || location.pathname.replace(/^\//, '') || 'onbekend',
        name: data.name || data.naam || '',
        email: data.email || '',
        phone: data.phone || '',
        subject: data.subject || '',
        message: data.message || '',
        portfolio: data.portfolio || ''
      }).then(function (res) {
        if (res && res.error) console.warn('Lead-cloud insert mislukt:', res.error.message);
      });
    } catch (err) { /* nooit de bezoeker hinderen */ }
  };
})();
