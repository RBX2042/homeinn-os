/* HomeINN — interactieve tools op investeren.html en invest-en.html (19 september 2026;
   2 oktober 2026 in lijn gebracht met de modelovereenkomst van achtergestelde geldlening).
   Vier onderdelen, alle gevoed door portefeuille.json:
     1. projectkiezer met de feitelijke gegevens per pand (zelfde bron als de homepage-kaarten)
     2. schematische kaart van de elf panden (geen externe kaartdienst, geen tracking)
     3. fase-tracker per pand (fase komt uit portefeuille.json; standaard 2 tot de eigenaar het bijwerkt)
     4. pand delen: alleen het gekozen pand in de URL-hash (#pand=…), nooit een bedrag
   Vervallen op 2 oktober 2026 en niet opnieuw aanzetten: het rekenvoorbeeld (7% × jaren als zeker
   totaal, terwijl een langere looptijd per project wordt geprijsd) en de vergelijker "zelf kopen of
   meedoen" (vergeleek eigendom van een pand met een achtergestelde vordering zonder zekerheid). */
(function () {
  'use strict';
  var EN = (document.documentElement.lang || 'nl').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    kiezerEyebrow: 'Choose a project', kiezerKop: 'Which property would you like to <em>look at?</em>',
    kiezerLede: 'Eleven properties, one standard. Select a property to see its phase and its homes after subdivision; you receive the figures in the project file. Your loan is earmarked for one project, but your claim is on HomeINN B.V. as a whole.',
    kaartNote: 'Schematic map — positions are indicative. Open a location in Google Maps via the property panel.',
    units: 'Homes after subdivision', fase: 'Phase', status: 'Status',
    fasen: ['Purchase completed', 'Planning & permits', 'Refurbishment with Lageweg Services B.V.', 'Sale or letting'],
    ctaInfo: 'Request the project information', ctaMaps: 'Open in Google Maps',
    scenarioKop: 'Share this property', scenarioLede: 'Your chosen property in one link — handy for a partner or adviser. We only see it if you send us the form.',
    kopieer: 'Copy link', gekopieerd: 'Link copied', scenarioLead: 'Scenario', pand: 'property'
  } : {
    kiezerEyebrow: 'Kies een project', kiezerKop: 'Welk pand wilt u <em>bekijken?</em>',
    kiezerLede: 'Elf panden, één standaard. Kies een pand en zie de fase waarin het zit en de woningen na splitsing; de cijfers ontvangt u in het projectdossier. Uw lening is bestemd voor één project, maar uw vordering is op HomeINN B.V. als geheel.',
    kaartNote: 'Schematische kaart — posities zijn indicatief. Open een locatie in Google Maps via het pandpaneel.',
    units: 'Woningen na splitsing', fase: 'Fase', status: 'Status',
    fasen: ['Aankoop afgerond', 'Planvorming & vergunning', 'Renovatie met Lageweg Services B.V.', 'Verkoop of verhuur'],
    ctaInfo: 'Vraag de projectinformatie aan', ctaMaps: 'Open in Google Maps',
    scenarioKop: 'Deel dit pand', scenarioLede: 'Uw gekozen pand in één link — handig voor een partner of adviseur. Wij zien het alleen als u het formulier verstuurt.',
    kopieer: 'Kopieer link', gekopieerd: 'Link gekopieerd', scenarioLead: 'Scenario', pand: 'pand'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var kiezer = $('iv-kiezer'), kaart = $('iv-kaart'), calc = $('hoe-vastgelegd');
  if (!kiezer) return;
  var DATA = null, actief = null, pins = {}, pandGekozen = false;

  /* ── gedeelde link: alleen het pand (#pand=pand-id), nooit een bedrag ─────
        Oude links in de vorm #scenario=bedrag,jaren,pand-id blijven werken, maar
        alleen het pand wordt nog gelezen; de bedragen worden genegeerd. */
  function leesScenario() {
    var kortePandLink = /pand=([^&]+)/.exec(location.hash || '');
    if (kortePandLink) return { pand: decodeURIComponent(kortePandLink[1]) };
    var m = /scenario=([^&]+)/.exec(location.hash || '');
    if (!m) return null;
    var d = decodeURIComponent(m[1]).split(',');
    return { pand: d[2] || '' };
  }
  /* Deelbare basis-URL: de canonical van de pagina, zodat een link vanaf localhost of
     een preview-omgeving tóch naar de echte site wijst. Geen canonical? Dan de eigen URL,
     inclusief een bestaande ?project=… zodat die niet verloren gaat. */
  function deelBasis() {
    var c = document.querySelector('link[rel="canonical"]');
    var href = c && c.href ? c.href : (location.origin + location.pathname + location.search);
    return href.split('#')[0];
  }
  function schrijfScenario() {
    // pand alleen meesturen als de bezoeker er zelf een koos — anders deelt hij stilzwijgend het eerste pand
    var pandId = pandGekozen && actief ? actief.id : '';
    var url = deelBasis() + (pandId ? '#pand=' + encodeURIComponent(pandId) : '');
    var veld = $('ivs-url'); if (veld) veld.value = url;
    return url;
  }
  function scenarioTekst() {
    return pandGekozen && actief ? actief.kort : '';
  }

  /* ── 1 + 3. projectkiezer en fase-tracker ────────────────────────────── */
  function L(p, k) { return (EN && p.en && p.en[k] != null) ? p.en[k] : p[k]; }
  function toonPand(p, scrollNaar, doorBezoeker) {
    actief = p;
    if (doorBezoeker) pandGekozen = true;
    kiezer.querySelectorAll('.ivk-chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-id') === p.id ? 'true' : 'false'); });
    Object.keys(pins).forEach(function (id) { pins[id].classList.toggle('on', id === p.id); });
    var fase = Math.max(1, Math.min(T.fasen.length, +p.fase || 1));
    var fasen = T.fasen.map(function (naam, i) {
      var n = i + 1, st = n < fase ? 'af' : n === fase ? 'nu' : '';
      return '<li class="' + st + '"><span class="ivk-fase-n">' + (n < 10 ? '0' + n : n) + '</span><span>' + esc(naam) + '</span></li>';
    }).join('');
    var units = (L(p,'units') || []).map(function (u) {
      return '<li><span class="pfx-u-id">' + esc(u[0]) + '</span><span class="pfx-u-lay">' + esc(u[1]) + '</span><span class="pfx-u-m2">' + esc(u[2]) + '</span>' + (u[3] ? '<span class="pfx-u-val">' + esc(u[3]) + '</span>' : '') + '</li>';
    }).join('');
    var fin = Object.keys(L(p,'fin') || {}).map(function (k) { return '<div><dt>' + esc(k) + '</dt><dd>' + esc(L(p,'fin')[k]) + '</dd></div>'; }).join('');
    var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.maps);
    var infoUrl = '#meedoen';
    $('ivk-paneel').innerHTML =
      '<div class="ivk-head"><div><span class="t-eyebrow">' + esc(p.gebied) + '</span><h3>' + esc(L(p,'titel')) + '</h3><p class="aanbod-kenmerken">' + esc(L(p,'kenmerken')) + '</p></div><span class="pfx-badge">' + esc(L(p,'badge')) + '</span></div>' +
      '<p class="pfx-desc">' + esc(L(p,'desc')) + '</p>' +
      '<div class="ivk-fase"><span class="ivk-k">' + esc(T.fase) + ' · ' + esc(L(p,'status')) + '</span><ol class="ivk-fasen">' + fasen + '</ol></div>' +
      '<dl class="pfx-fin">' + fin + '</dl>' +
      '<p class="pfx-units-head">' + esc(T.units) + '</p><ul class="pfx-units">' + units + '</ul>' +
      '<div class="ivk-acties"><a class="btn btn-primary" href="' + infoUrl + '" data-pand="' + esc(p.id) + '">' + esc(T.ctaInfo) + ' <span class="arr">→</span></a>' +
      '<a class="pillar-cta" target="_blank" rel="noopener" href="' + mapsUrl + '">' + esc(T.ctaMaps) + ' <span class="arr">→</span></a></div>';
    // formulier voorselecteren op het gekozen pand
    // alleen als de bezoeker zelf een pand koos — anders blijft 'Geen voorkeur' staan
    var sel = $('iv-project');
    if (sel && doorBezoeker) for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text.trim().replace(' and ', ' en ') === p.formOptie) { sel.selectedIndex = i; break; }
    // korte melding voor schermlezers, alleen bij een eigen keuze (niet bij het laden)
    var st = $('ivk-status'); if (st && doorBezoeker) st.textContent = L(p, 'titel');
    schrijfScenario();
    if (scrollNaar) { var pnl = $('ivk-paneel'); if (pnl && pnl.scrollIntoView) pnl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  function bouwKiezer() {
    var chips = DATA.panden.map(function (p) {
      return '<button type="button" class="ivk-chip" data-id="' + esc(p.id) + '" aria-pressed="false"><span>' + esc(p.kort) + '</span><small>' + esc(p.gebied) + ' · ' + esc(L(p,'badge')) + '</small></button>';
    }).join('');
    kiezer.innerHTML =
      '<div class="proc-head"><span class="t-eyebrow">' + esc(T.kiezerEyebrow) + '</span><h2>' + T.kiezerKop + '</h2><p class="proc-lede">' + esc(T.kiezerLede) + '</p></div>' +
      '<div class="ivk-grid"><div class="ivk-lijst">' + chips + '</div><div class="ivk-paneel" id="ivk-paneel"></div></div>' +
      '<p id="ivk-status" class="sr-only" aria-live="polite"></p>';
    kiezer.querySelectorAll('.ivk-chip').forEach(function (c) {
      c.addEventListener('click', function () { var p = DATA.panden.filter(function (x) { return x.id === c.getAttribute('data-id'); })[0]; if (p) toonPand(p, window.innerWidth < 900, true); });
    });
  }

  /* ── 2. schematische kaart ───────────────────────────────────────────── */
  function bouwKaart() {
    if (!kaart) return;
    var W = 800, H = 400, lon0 = 4.315, lon1 = 4.545, lat0 = 51.925, lat1 = 51.862;
    function X(lon) { return ((lon - lon0) / (lon1 - lon0)) * W; }
    function Y(lat) { return ((lat0 - lat) / (lat0 - lat1)) * H; }
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', EN ? 'Schematic map of the eleven HomeINN properties in Rotterdam and Vlaardingen' : 'Schematische kaart van de elf HomeINN-panden in Rotterdam en Vlaardingen');
    // Nieuwe Maas, gestileerd (west → oost)
    var maas = document.createElementNS(NS, 'path');
    maas.setAttribute('d', 'M0 ' + Y(51.902) + ' C ' + X(4.40) + ' ' + Y(51.90) + ', ' + X(4.45) + ' ' + Y(51.912) + ', ' + X(4.48) + ' ' + Y(51.905) + ' S ' + X(4.53) + ' ' + Y(51.912) + ', ' + W + ' ' + Y(51.915));
    maas.setAttribute('class', 'ivm-maas'); svg.appendChild(maas);
    [['Vlaardingen', 4.34, 51.918], ['Rotterdam-West', 4.455, 51.9235], ['Kralingen', 4.52, 51.9235], ['Rotterdam-Zuid', 4.49, 51.882]].forEach(function (l) {
      var t = document.createElementNS(NS, 'text'); t.setAttribute('x', X(l[1])); t.setAttribute('y', Y(l[2])); t.setAttribute('class', 'ivm-lbl'); t.textContent = l[0]; svg.appendChild(t);
    });
    DATA.panden.forEach(function (p, i) {
      var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'ivm-pin'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('aria-label', p.kort + ' — ' + p.gebied);
      var x = X(p.lon), y = Y(p.lat);
      // dubbele panden (26/28, 105/107, 88/90) iets uit elkaar leggen
      x += (i % 2) * 9;
      var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 7); g.appendChild(c);
      var r = document.createElementNS(NS, 'circle'); r.setAttribute('cx', x); r.setAttribute('cy', y); r.setAttribute('r', 14); r.setAttribute('class', 'ivm-ring'); g.appendChild(r);
      var t = document.createElementNS(NS, 'text'); t.setAttribute('x', x + 12); t.setAttribute('y', y + 4); t.setAttribute('class', 'ivm-pin-lbl'); t.textContent = p.kort; g.appendChild(t);
      function kies() { toonPand(p, true, true); }
      g.addEventListener('click', kies); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kies(); } });
      pins[p.id] = g; svg.appendChild(g);
    });
    kaart.innerHTML = ''; kaart.appendChild(svg);
    var n = document.createElement('p'); n.className = 'ivm-note'; n.textContent = T.kaartNote; kaart.appendChild(n);
  }

  /* ── 4. pand delen ────────────────────────────────────────────────────── */
  function bouwScenario() {
    if (!calc) return;
    var box = document.createElement('div'); box.className = 'ivs';
    box.innerHTML = '<span class="iv-calc-k">' + esc(T.scenarioKop) + '</span><p>' + esc(T.scenarioLede) + '</p>' +
      '<div class="ivs-row"><input id="ivs-url" type="text" readonly aria-label="' + esc(T.scenarioKop) + '"><button type="button" class="ivs-btn" id="ivs-copy">' + esc(T.kopieer) + '</button></div>';
    var body = calc.querySelector('.iv-calc-body') || calc; body.appendChild(box);
    $('ivs-copy').addEventListener('click', function () {
      var url = schrijfScenario(), b = this;
      function klaar() { b.textContent = T.gekopieerd; setTimeout(function () { b.textContent = T.kopieer; }, 2200); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(klaar, function () { $('ivs-url').select(); klaar(); });
      else { $('ivs-url').select(); try { document.execCommand('copy'); } catch (e) {} klaar(); }
    });
    schrijfScenario();
    // scenario meeschrijven in de aanvraag: vóór de eigen submit-handler van de pagina (capture)
    var form = $('iv-form');
    if (form) form.addEventListener('submit', function () {
      var ta = $('iv-message'); if (!ta) return;
      var s = scenarioTekst();
      // een eerdere scenario-regel (bv. na een mislukte verzending) overschrijven, niet stapelen;
      // zonder gekozen pand geen lege 'Scenario: '-regel toevoegen
      var rest = ta.value.split('\n').filter(function (r) { return r.indexOf(T.scenarioLead + ':') !== 0; }).join('\n').replace(/\n+$/, '');
      ta.value = s ? (rest ? rest + '\n' : '') + T.scenarioLead + ': ' + s : rest;
    }, true);
  }

  function pasScenarioToe() {
    var s = leesScenario(); if (!s) return;
    var p = DATA.panden.filter(function (x) { return x.id === s.pand; })[0];
    if (p) toonPand(p, false, true);
  }

  fetch('portefeuille.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.panden || !d.panden.length) throw new Error('leeg');
    DATA = d;
    bouwKiezer(); bouwKaart(); bouwScenario();
    // hero-/homepagelinks met ?project=<adres> → dat pand tonen
    var gevraagd = new URLSearchParams(location.search).get('project');
    var start = DATA.panden.filter(function (p) { return gevraagd && (p.kort === gevraagd.trim() || p.titel === gevraagd.trim()); })[0];
    toonPand(start || DATA.panden[0], false, !!start);
    pasScenarioToe();
    // site-brede reveal kent deze nieuwe blokken niet; wél zichtbaar maken
    kiezer.querySelectorAll('.rv').forEach(function (e) { e.classList.add('in'); });
  }).catch(function () {
    // zonder data: sectie stil laten verdwijnen, de rest van de pagina werkt gewoon
    var sec = kiezer.closest('section'); if (sec) sec.hidden = true;
  });
})();
