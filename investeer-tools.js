/* HomeINN — interactieve investeerderstools (19 september 2026).
   Vijf onderdelen op investeren.html en invest-en.html, alle gevoed door portefeuille.json:
     1. projectkiezer met de feitelijke cijfers per pand (zelfde bron als de homepage-kaarten)
     2. schematische kaart van de elf panden (geen externe kaartdienst, geen tracking)
     3. fase-tracker per pand (fase komt uit portefeuille.json; standaard 2 tot de eigenaar het bijwerkt)
     4. scenario delen: inleg/looptijd/pand in de URL-hash, "kopieer link", en meegeschreven in de lead
     5. vergelijker "zelf kopen of meedoen" — feiten, geen rendementsclaim
   Bewust GEEN nieuwe rekenregels: het bestaande rekenvoorbeeld (homeinn-public.js) blijft de enige
   plek met een rendementsberekening; deze tools tonen alleen de cijfers die al op de site staan. */
(function () {
  'use strict';
  var EN = (document.documentElement.lang || 'nl').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    kiezerEyebrow: 'Choose a project', kiezerKop: 'Which property would you like to <em>look at?</em>',
    kiezerLede: 'Eleven properties, one standard. Select a property to see its phase, its homes after splitting and how to request the full figures.',
    kaartNote: 'Schematic map — positions are indicative. Open a location in Google Maps via the property panel.',
    units: 'Homes after splitting', fase: 'Phase', status: 'Status',
    fasen: ['Purchase completed', 'Planning & permits', 'Refurbishment with Lageweg Services B.V.', 'Sale or letting'],
    ctaInfo: 'Request the project information for this property', ctaMaps: 'Open in Google Maps',
    scenarioKop: 'Share this property', scenarioLede: 'Your chosen property in one link — handy for a partner or adviser. We only see it if you send us the form.',
    kopieer: 'Copy link', gekopieerd: 'Link copied', scenarioLead: 'Scenario', pand: 'property',
    vglEyebrow: 'Compare', vglKop: 'Buying yourself or <em>taking part?</em>', vglLede: 'Facts side by side, without a return forecast. Which route fits you depends on your situation; we are happy to talk it through.',
    zelf: 'Buying a property yourself', mee: 'Taking part in a HomeINN project',
    vgl: [
      ['Entry amount', 'Full purchase price plus buyer’s costs', 'From €100,000 in a single amount per participant'],
      ['Financing', 'Arrange it yourself; bank terms for investors', 'Not applicable — HomeINN owns and develops the property'],
      ['Refurbishment', 'Find and manage contractors yourself', 'HomeINN with its fixed partner Lageweg Services B.V.'],
      ['Tenants and management', 'Yourself or a paid property manager', 'Not applicable during the project'],
      ['Your time', 'Viewings, notary, works, tenants', 'Progress updates by e-mail'],
      ['Control', 'Full — every decision is yours', 'None — HomeINN decides on the project'],
      ['Liquidity', 'You can sell at any time', 'Fixed until the end of the project; not tradable'],
      ['Risk', 'Market, vacancy and construction risk on your own balance sheet', 'Your contribution can be lost in whole or in part']
    ],
    vglNote: 'This comparison is informational and not advice. Ask for the project information and, if you wish, an independent adviser.',
    jaar: function (n) { return n + (n === 1 ? ' year' : ' years'); }
  } : {
    kiezerEyebrow: 'Kies een project', kiezerKop: 'Welk pand wilt u <em>bekijken?</em>',
    kiezerLede: 'Elf panden, één standaard. Kies een pand en zie de fase waarin het zit en de woningen na splitsing — de cijfers van dat pand ontvangt u in het projectdossier.',
    kaartNote: 'Schematische kaart — posities zijn indicatief. Open een locatie in Google Maps via het pandpaneel.',
    units: 'Woningen na splitsing', fase: 'Fase', status: 'Status',
    fasen: ['Aankoop afgerond', 'Planvorming & vergunning', 'Renovatie met Lageweg Services B.V.', 'Verkoop of verhuur'],
    ctaInfo: 'Projectinformatie voor dit pand aanvragen', ctaMaps: 'Open in Google Maps',
    scenarioKop: 'Deel dit pand', scenarioLede: 'Uw gekozen pand in één link — handig voor een partner of adviseur. Wij zien het alleen als u het formulier verstuurt.',
    kopieer: 'Kopieer link', gekopieerd: 'Link gekopieerd', scenarioLead: 'Scenario', pand: 'pand',
    vglEyebrow: 'Vergelijk', vglKop: 'Zelf kopen of <em>meedoen?</em>', vglLede: 'De feiten naast elkaar, zonder rendementsvoorspelling. Welke route bij u past hangt af van uw situatie; wij denken graag mee.',
    zelf: 'Zelf een pand kopen', mee: 'Meedoen in een HomeINN-project',
    vgl: [
      ['Instapbedrag', 'Volledige koopsom plus kosten koper', 'Vanaf € 100.000 ineens per deelnemer'],
      ['Financiering', 'Zelf regelen; bankvoorwaarden voor beleggers', 'Niet van toepassing — HomeINN bezit en ontwikkelt het pand'],
      ['Verbouwing', 'Zelf aannemers zoeken en aansturen', 'HomeINN met vaste bouwpartner Lageweg Services B.V.'],
      ['Huurders en beheer', 'Zelf of via een betaalde beheerder', 'Niet van toepassing tijdens het project'],
      ['Uw tijd', 'Bezichtigingen, notaris, bouw, huurders', 'Voortgangsupdates per e-mail'],
      ['Zeggenschap', 'Volledig — elke beslissing is van u', 'Geen — HomeINN beslist over het project'],
      ['Liquiditeit', 'U kunt op elk moment verkopen', 'Vast tot het einde van het project; niet verhandelbaar'],
      ['Risico', 'Markt-, leegstands- en bouwrisico op uw eigen balans', 'Uw inleg kan geheel of deels verloren gaan']
    ],
    vglNote: 'Deze vergelijking is informatief en geen advies. Vraag de projectinformatie op en desgewenst een onafhankelijk adviseur.',
    jaar: function (n) { return n + ' jaar'; }
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  /* ── 0. rekenvoorbeeld — letterlijk de regel uit homeinn-public.js (7% × jaren, geen rente-op-rente).
        Die file wordt op deze pagina's niet geladen; zonder dit blok bewogen de sliders niets. */
  (function () {
    var inleg = $('ivc-inleg'), jaren = $('ivc-jaren');
    if (!inleg || !jaren || inleg.dataset.bound) return;
    inleg.dataset.bound = '1';
    function eur(n) { return EN ? '€' + Math.round(n).toLocaleString('en-GB') : '€ ' + Math.round(n).toLocaleString('nl-NL'); }
    function upd() {
      var i = +inleg.value, jr = +jaren.value, r = i * 0.07 * jr;
      $('ivc-inleg-out').textContent = eur(i);
      $('ivc-jaren-out').textContent = T.jaar(jr);
      ['ivc-rend', 'ivc-tot'].forEach(function (id, k) {
        var el = $(id); if (!el) return; el.classList.add('tick'); el.textContent = eur(k ? i + r : r);
        setTimeout(function () { el.classList.remove('tick'); }, 120);
      });
    }
    inleg.addEventListener('input', upd); jaren.addEventListener('input', upd); upd();
  })();

  var kiezer = $('iv-kiezer'), kaart = $('iv-kaart'), vgl = $('iv-vergelijk'), calc = $('hoe-vastgelegd');
  if (!kiezer && !vgl) return;

  /* ── 5. vergelijker (heeft de data niet nodig) ─────────────────────────── */
  if (vgl) {
    var rows = T.vgl.map(function (r) {
      return '<tr><th scope="row">' + esc(r[0]) + '</th><td data-kol="zelf">' + esc(r[1]) + '</td><td data-kol="mee">' + esc(r[2]) + '</td></tr>';
    }).join('');
    vgl.innerHTML =
      '<div class="proc-head"><span class="t-eyebrow">' + esc(T.vglEyebrow) + '</span><h2>' + T.vglKop + '</h2><p class="proc-lede">' + esc(T.vglLede) + '</p></div>' +
      '<div class="ivv-toggle" role="tablist" aria-label="' + esc(T.vglEyebrow) + '">' +
        '<button type="button" role="tab" aria-selected="true" data-kol="zelf">' + esc(T.zelf) + '</button>' +
        '<button type="button" role="tab" aria-selected="false" data-kol="mee">' + esc(T.mee) + '</button></div>' +
      '<div class="ivv-wrap"><table class="ivv-table"><thead><tr><th scope="col"></th><th scope="col">' + esc(T.zelf) + '</th><th scope="col">' + esc(T.mee) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="ivv-note">' + esc(T.vglNote) + '</p>';
    // Op smalle schermen één kolom tegelijk (tabs); op brede schermen staan beide naast elkaar.
    vgl.querySelectorAll('.ivv-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        vgl.querySelectorAll('.ivv-toggle button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        vgl.setAttribute('data-kol', b.getAttribute('data-kol'));
      });
    });
    vgl.setAttribute('data-kol', 'zelf');
  }

  if (!kiezer) return;
  var DATA = null, actief = null, pins = {}, pandGekozen = false;

  /* ── scenario in de URL-hash (#scenario=inleg,jaren,pand-id) ─────────── */
  function leesScenario() {
    var kortePandLink = /pand=([^&]+)/.exec(location.hash || '');
    if (kortePandLink) return { inleg: 0, jaren: 0, pand: decodeURIComponent(kortePandLink[1]) };
    var m = /scenario=([^&]+)/.exec(location.hash || '');
    if (!m) return null;
    var d = decodeURIComponent(m[1]).split(',');
    return { inleg: +d[0] || 0, jaren: +d[1] || 0, pand: d[2] || '' };
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
    var inleg = $('ivc-inleg'), jaren = $('ivc-jaren');
    // pand alleen meesturen als de bezoeker er zelf een koos — anders deelt hij stilzwijgend het eerste pand
    // Sinds de bedragen van de site af zijn, bestaan de inleg- en looptijdvelden niet meer:
    // dan is het gekozen pand het hele "scenario" en blijft de link kort.
    var delen = [inleg ? inleg.value : '', jaren ? jaren.value : '', pandGekozen && actief ? actief.id : ''];
    var kort = (!inleg && !jaren);
    var url = deelBasis() + (kort
      ? (delen[2] ? '#pand=' + encodeURIComponent(delen[2]) : '')
      : '#scenario=' + encodeURIComponent(delen.join(',')));
    var veld = $('ivs-url'); if (veld) veld.value = url;
    return url;
  }
  function scenarioTekst() {
    var inleg = $('ivc-inleg'), jaren = $('ivc-jaren'), out = [];
    if (inleg) out.push('€ ' + (+inleg.value).toLocaleString(EN ? 'en-GB' : 'nl-NL'));
    if (jaren) out.push(T.jaar(+jaren.value));
    if (pandGekozen && actief) out.push(actief.kort);
    return out.join(' · ');
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
      '<div class="ivk-head"><div><span class="t-eyebrow">' + esc(p.gebied) + '</span><h3>' + esc(p.titel) + '</h3><p class="aanbod-kenmerken">' + esc(L(p,'kenmerken')) + '</p></div><span class="pfx-badge">' + esc(L(p,'badge')) + '</span></div>' +
      '<p class="pfx-desc">' + esc(L(p,'desc')) + '</p>' +
      '<div class="ivk-fase"><span class="ivk-k">' + esc(T.fase) + ' · ' + esc(p.status) + '</span><ol class="ivk-fasen">' + fasen + '</ol></div>' +
      '<dl class="pfx-fin">' + fin + '</dl>' +
      '<p class="pfx-units-head">' + esc(T.units) + '</p><ul class="pfx-units">' + units + '</ul>' +
      '<div class="ivk-acties"><a class="btn btn-primary" href="' + infoUrl + '" data-pand="' + esc(p.id) + '">' + esc(T.ctaInfo) + ' <span class="arr">→</span></a>' +
      '<a class="pillar-cta" target="_blank" rel="noopener" href="' + mapsUrl + '">' + esc(T.ctaMaps) + ' <span class="arr">→</span></a></div>';
    // formulier voorselecteren op het gekozen pand
    var sel = $('iv-project');
    if (sel) for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text.trim() === p.formOptie) { sel.selectedIndex = i; break; }
    schrijfScenario();
    if (scrollNaar) { var pnl = $('ivk-paneel'); if (pnl && pnl.scrollIntoView) pnl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }

  function bouwKiezer() {
    var chips = DATA.panden.map(function (p) {
      return '<button type="button" class="ivk-chip" data-id="' + esc(p.id) + '" aria-pressed="false"><span>' + esc(p.kort) + '</span><small>' + esc(p.gebied) + ' · ' + esc(L(p,'badge')) + '</small></button>';
    }).join('');
    kiezer.innerHTML =
      '<div class="proc-head"><span class="t-eyebrow">' + esc(T.kiezerEyebrow) + '</span><h2>' + T.kiezerKop + '</h2><p class="proc-lede">' + esc(T.kiezerLede) + '</p></div>' +
      '<div class="ivk-grid"><div class="ivk-lijst" role="list">' + chips + '</div><div class="ivk-paneel" id="ivk-paneel" aria-live="polite"></div></div>';
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
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img');
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

  /* ── 4. scenario delen ───────────────────────────────────────────────── */
  function bouwScenario() {
    if (!calc) return;
    var box = document.createElement('div'); box.className = 'ivs';
    box.innerHTML = '<span class="iv-calc-k">' + esc(T.scenarioKop) + '</span><p>' + esc(T.scenarioLede) + '</p>' +
      '<div class="ivs-row"><input id="ivs-url" type="text" readonly aria-label="' + esc(T.scenarioKop) + '"><button type="button" class="ivs-btn" id="ivs-copy">' + esc(T.kopieer) + '</button></div>';
    var body = calc.querySelector('.iv-calc-body') || calc; body.appendChild(box);
    ['ivc-inleg', 'ivc-jaren'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', schrijfScenario); });
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
      var regel = T.scenarioLead + ': ' + scenarioTekst();
      // een eerdere scenario-regel (bv. na een mislukte verzending) overschrijven, niet stapelen
      var rest = ta.value.split('\n').filter(function (r) { return r.indexOf(T.scenarioLead + ': ') !== 0; }).join('\n').replace(/\n+$/, '');
      ta.value = (rest ? rest + '\n' : '') + regel;
    }, true);
  }

  function pasScenarioToe() {
    var s = leesScenario(); if (!s) return;
    var inleg = $('ivc-inleg'), jaren = $('ivc-jaren');
    if (inleg && s.inleg) { inleg.value = s.inleg; inleg.dispatchEvent(new Event('input', { bubbles: true })); }
    if (jaren && s.jaren) { jaren.value = s.jaren; jaren.dispatchEvent(new Event('input', { bubbles: true })); }
    var p = DATA.panden.filter(function (x) { return x.id === s.pand; })[0];
    if (p) toonPand(p, false, true);
  }

  fetch('portefeuille.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || !d.panden || !d.panden.length) throw new Error('leeg');
    DATA = d;
    bouwKiezer(); bouwKaart(); bouwScenario();
    // hero-/homepagelinks met ?project=<adres> → dat pand tonen
    var gevraagd = new URLSearchParams(location.search).get('project');
    var start = DATA.panden.filter(function (p) { return gevraagd && (p.kort === gevraagd.trim() || p.titel === gevraagd.trim()); })[0] || DATA.panden[0];
    toonPand(start, false);
    pasScenarioToe();
    // site-brede reveal kent deze nieuwe blokken niet; wél zichtbaar maken
    kiezer.querySelectorAll('.rv').forEach(function (e) { e.classList.add('in'); });
  }).catch(function () {
    // zonder data: sectie stil laten verdwijnen, de rest van de pagina werkt gewoon
    var sec = kiezer.closest('section'); if (sec) sec.hidden = true;
  });
})();
