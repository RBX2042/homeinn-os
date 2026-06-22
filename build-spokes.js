#!/usr/bin/env node
/* ============================================================================
   HomeINN — Wijk-/gemeente-spokes generator (SEO-motor)
   ----------------------------------------------------------------------------
   Eén sjabloon, veel pagina's: "Uw pand verkopen in [Gebied]". Per gebied een
   eigen indexeerbare URL (/verkopen-<slug>), met UNIEKE lokale content. De
   pagina's hergebruiken het bestaande designsysteem (fonts.css → tokens.css →
   homeinn-public.css) zodat ze identiek ogen aan de publieke site. Alle CTA's
   leiden naar de bod-flow (/pand-verkopen).

   Gebruik:  node build-spokes.js
   Output:   verkopen-<slug>.html  (in de projectroot)

   - META    = vaste metadata per gebied (type + buurlinks), hand-onderhouden.
   - WIJKEN  = UNIEKE lokale teksten, gegenereerd + adversarieel geverifieerd
               via de workflow 'homeinn-wijk-spokes-content' (geen verzonnen cijfers).
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const TEL = '+31 6 26 25 70 71';
const TEL_HREF = '+31626257071';
const CHECK = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Vaste metadata per gebied: type (wijk vs gemeente) + interne buurlinks. ── */
const META = {
  'rotterdam-noord':        { soort: 'wijk in Rotterdam', areaType: 'neighborhood', buren: ['hillegersberg', 'centrum'] },
  'rotterdam-zuid':         { soort: 'stadsdeel van Rotterdam', areaType: 'neighborhood', buren: ['feijenoord', 'ijsselmonde'] },
  'kralingen':              { soort: 'wijk in Rotterdam', areaType: 'neighborhood', buren: ['centrum', 'rotterdam-noord'] },
  'hillegersberg':          { soort: 'wijk in Rotterdam', areaType: 'neighborhood', buren: ['rotterdam-noord', 'schiedam'] },
  'ijsselmonde':            { soort: 'wijk in Rotterdam', areaType: 'neighborhood', buren: ['rotterdam-zuid', 'barendrecht'] },
  'feijenoord':             { soort: 'wijk in Rotterdam', areaType: 'neighborhood', buren: ['rotterdam-zuid', 'centrum'] },
  'centrum':                { soort: 'centrum van Rotterdam', areaType: 'neighborhood', buren: ['kralingen', 'rotterdam-noord'] },
  'schiedam':              { soort: 'gemeente in de regio Rotterdam', areaType: 'city', buren: ['vlaardingen', 'rotterdam-noord'] },
  'capelle-aan-den-ijssel': { soort: 'gemeente in de regio Rotterdam', areaType: 'city', buren: ['rotterdam-noord', 'ridderkerk'] },
  'barendrecht':            { soort: 'gemeente in de regio Rotterdam', areaType: 'city', buren: ['ijsselmonde', 'ridderkerk'] },
  'ridderkerk':             { soort: 'gemeente in de regio Rotterdam', areaType: 'city', buren: ['barendrecht', 'ijsselmonde'] },
  'vlaardingen':            { soort: 'gemeente in de regio Rotterdam', areaType: 'city', buren: ['schiedam', 'rotterdam-zuid'] },
};

/* ── Unieke lokale content per gebied: geverifieerde workflow-output. ──
   Bron: spokes-content.json (gegenereerd + adversarieel geverifieerd via de
   workflow 'homeinn-wijk-spokes-content' — geen verzonnen cijfers). */
const WIJKEN = require('./spokes-content.json');

const VERGELIJK = [
  ['Tijd tot zekerheid', 'Voorstel binnen 48 uur', 'Gemiddeld 3–6 maanden'],
  ['Makelaars- en stylingkosten', '€ 0', '± 1–2% courtage + verkoopklaar maken'],
  ['Staat van de woning', 'Wij kopen in elke staat', 'Opknappen verhoogt de kans'],
  ['Financieringsvoorbehoud', 'Nooit — eigen kapitaal', 'Koop kan op het laatst stuklopen'],
  ['Privacy', 'Geen borden, geen Funda', 'Volledig openbaar traject'],
];

const STAPPEN = [
  ['01', 'Vertel ons over uw pand', 'Adres, staat en uw situatie volstaan — telefonisch of via het formulier.'],
  ['02', 'Opname binnen enkele dagen', 'Één discreet bezoek, zonder verplichtingen — ook bij verhuurde staat.'],
  ['03', 'Onderbouwd voorstel binnen 48 uur', 'Transparant opgebouwd op staat, ligging en marktwaarde.'],
  ['04', 'Passeren bij de notaris', 'Bij een notaris naar uw keuze, op het moment dat ú kiest.'],
];

const NAAM = {}; // slug → naam (voor buurlinks)

function buurLinks(slug) {
  const meta = META[slug];
  if (!meta || !meta.buren || !meta.buren.length) return '';
  const items = meta.buren
    .filter(s => NAAM[s])
    .map(s => `<a href="verkopen-${s}.html">Pand verkopen in ${esc(NAAM[s])}</a>`)
    .join('');
  if (!items) return '';
  return `<nav class="spoke-buren" aria-label="Andere werkgebieden"><span>Ook actief in de regio:</span>${items}</nav>`;
}

function page(w) {
  const meta = META[w.slug] || { soort: 'regio Rotterdam', areaType: 'city', buren: [] };
  const titel = `Huis verkopen ${w.naam} | Direct bod binnen 48 uur — HomeINN`;
  const canonical = `https://home-inn.nl/verkopen-${w.slug}`;
  const h1 = `Uw pand verkopen in ${esc(w.naam)} — direct bod van HomeINN`;
  const areaLD = meta.areaType === 'city'
    ? `{"@type":"City","name":"${esc(w.naam)}"}`
    : `{"@type":"Place","name":"${esc(w.naam)}, Rotterdam"}`;

  const usp = [
    'Voorstel binnen 48 uur', 'Geen makelaars- of stylingkosten', 'Geen financieringsvoorbehoud',
    'Notaris naar uw keuze', 'Discreet — geen borden, geen Funda',
  ].map(t => `<div class="usp"><span class="usp-check">${CHECK}</span>${t}</div>`).join('');

  const lokaal = w.lokaalTekst.map(p => `<p>${esc(p)}</p>`).join('');
  const vglRows = VERGELIJK.map(r =>
    `<tr><td>${esc(r[0])}</td><td class="vgl-hi">${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('');
  const stappen = STAPPEN.map(s =>
    `<div class="pstep"><div class="pstep-n">${s[0]}</div><div class="pstep-body"><strong>${esc(s[1])}</strong><span>${esc(s[2])}</span></div></div>`).join('');

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(w.metaDescription)}">
  <link rel="icon" href="assets/favicon-512.png?v=20260616g">
  <meta name="theme-color" content="#0b1e30">
  <link rel="apple-touch-icon" href="assets/favicon-512.png?v=20260616g">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="HomeINN">
  <meta property="og:title" content="Pand verkopen in ${esc(w.naam)} — voorstel binnen 48 uur">
  <meta property="og:description" content="${esc(w.metaDescription)}">
  <meta property="og:image" content="https://home-inn.nl/assets/og-home-1200x630.png?v=20260616g">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="nl_NL">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="fonts/CormorantGaramond-300.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/Outfit-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="fonts/fonts.css">
  <link rel="stylesheet" href="tokens.css?v=20260618">
  <link rel="stylesheet" href="homeinn-public.css?v=20260616g">
  <style>
    /* Slimme, navigatie-lichte kop (géén SPA-#nav-afhankelijkheid). Tokens uit tokens.css. */
    .spoke-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;
      padding:1.1rem clamp(1.25rem,5vw,5.5rem);background:var(--navy);border-bottom:1px solid rgba(var(--gold-rgb),.35);
      position:sticky;top:0;z-index:800}
    .spoke-top .brand img{height:34px;width:auto;display:block}
    .spoke-top .right{display:flex;align-items:center;gap:1.25rem}
    .spoke-top .tel{color:#eaf0f5;text-decoration:none;font-size:.8rem;font-weight:500;letter-spacing:.02em;white-space:nowrap}
    .spoke-top .tel strong{color:#fff;font-weight:600}
    .spoke-top .tel:hover{color:var(--gold3)}
    .spoke-top .top-cta{display:inline-flex;align-items:center;gap:8px;background:var(--gold);color:var(--navy);
      text-decoration:none;font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:11px 20px}
    .spoke-top .top-cta:hover{background:var(--gold2)}
    @media(max-width:620px){.spoke-top .tel{display:none}}
    .spoke-hero-cta{margin-top:2rem;display:flex;flex-wrap:wrap;gap:1rem 1.5rem;align-items:center}
    .spoke-hero-micro{color:rgba(255,255,255,.5);font-size:.8rem;font-weight:300;letter-spacing:.02em}
    .spoke-lokaal{max-width:1320px;margin:0 auto;padding:clamp(3.5rem,7vw,6rem) clamp(1.5rem,5vw,5.5rem)}
    .spoke-lokaal .lokaal-body{max-width:760px}
    .spoke-lokaal .lokaal-body p{font-size:1.02rem;font-weight:300;line-height:1.9;color:var(--ink3);margin:0 0 1.25rem}
    .spoke-buren{max-width:1320px;margin:0 auto;padding:0 clamp(1.5rem,5vw,5.5rem) clamp(3rem,6vw,5rem);
      display:flex;flex-wrap:wrap;gap:.6rem 1.4rem;align-items:center}
    .spoke-buren span{font-size:.8rem;color:var(--ink4);font-weight:400}
    .spoke-buren a{font-size:.82rem;color:var(--gold-ink);text-decoration:none;border-bottom:1px solid rgba(var(--gold-rgb),.3)}
    .spoke-buren a:hover{color:var(--navy)}
    .spoke-foot{border-top:1px solid var(--line);background:var(--panel)}
    .spoke-foot .in{max-width:1320px;margin:0 auto;padding:2.25rem clamp(1.5rem,5vw,5.5rem);
      display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:center;font-size:.72rem;color:var(--ink4)}
    .spoke-foot .in a{color:var(--ink3);text-decoration:none;margin-left:1.4rem}
    .spoke-foot .in a:first-child{margin-left:0}
    .spoke-foot .in a:hover{color:var(--gold-ink)}
  </style>
</head>
<body>
  <header class="spoke-top">
    <a class="brand" href="homeinn-public.html" aria-label="HomeINN home">
      <picture><source srcset="assets/logo-light.webp?v=20260616g" type="image/webp">
      <img src="assets/logo-light.png?v=20260616g" alt="HomeINN" width="158" height="34"></picture>
    </a>
    <div class="right">
      <a class="tel" href="tel:${TEL_HREF}">Liever bellen? <strong>${TEL}</strong></a>
      <a class="top-cta" href="pand-verkopen.html">Voorstel aanvragen</a>
    </div>
  </header>

  <main>
    <section class="page-hero">
      <div class="page-hero-inner">
        <span class="t-eyebrow" style="display:block;margin-bottom:1.5rem">Pand verkopen · ${esc(w.naam)}</span>
        <h1>${h1}</h1>
        <p>${esc(w.heroSub)}</p>
        <div class="spoke-hero-cta">
          <a class="btn btn-primary" href="pand-verkopen.html">Vraag een voorstel aan <span class="arr">→</span></a>
          <span class="spoke-hero-micro">Binnen 48 uur · Vrijblijvend · Geen makelaarskosten · Discreet</span>
        </div>
      </div>
    </section>

    <div class="usp-strip"><div class="usp-inner">${usp}</div></div>

    <section class="spoke-lokaal">
      <div class="proc-head"><span class="t-eyebrow">${esc(w.naam)}</span><h2>${esc(w.lokaalTitel)}</h2></div>
      <div class="lokaal-body">${lokaal}</div>
    </section>

    <section class="vgl-section">
      <div class="vgl-inner">
        <div class="proc-head"><span class="t-eyebrow">Eerlijk vergeleken</span><h2>Direct aan HomeINN<br>of via de <em>makelaar?</em></h2></div>
        <div class="vgl-wrap">
          <table class="vgl-table">
            <thead><tr><th></th><th class="vgl-hi">Direct aan HomeINN</th><th>Via een makelaar</th></tr></thead>
            <tbody>${vglRows}</tbody>
          </table>
        </div>
        <p class="vgl-note">Eerlijk is eerlijk: op een perfecte woning in een verkopersmarkt kan een makelaarstraject meer opleveren. Maar zodra snelheid, zekerheid, privacy of de staat van het pand meespeelt, wint de directe route — en dat rekenen wij graag transparant voor u uit.</p>
      </div>
    </section>

    <section class="proc-section">
      <div class="proc-inner">
        <div class="proc-head"><span class="t-eyebrow">Zo werkt het</span><h2>Van eerste contact tot notaris.<br><em>In vier stappen.</em></h2></div>
        <div class="proc-panel on"><div class="proc-steps">${stappen}</div></div>
      </div>
    </section>

    ${buurLinks(w.slug)}

    <div class="cta-band"><div class="cta-inner"><h2>Uw pand in ${esc(w.naam)} verkopen? Vraag een vrijblijvend <em>voorstel</em> aan.</h2><a class="btn btn-dark" href="pand-verkopen.html">Voorstel binnen 48 uur <span class="arr">→</span></a></div></div>
  </main>

  <footer class="spoke-foot">
    <div class="in">
      <span>© 2026 HomeINN — Vastgoedpartner Rotterdam</span>
      <nav aria-label="Links">
        <a href="homeinn-public.html">Home</a>
        <a href="pand-verkopen.html">Pand verkopen</a>
        <a href="privacy.html">Privacy</a>
      </nav>
    </div>
  </footer>

  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"RealEstateAgent",
    "name":"HomeINN",
    "telephone":"${TEL_HREF}",
    "email":"info@homeinn.nl",
    "url":"${canonical}",
    "areaServed":${areaLD},
    "address":{"@type":"PostalAddress","addressLocality":"Rotterdam","addressCountry":"NL"},
    "description":"HomeINN koopt panden in ${esc(w.naam)} direct aan met eigen kapitaal — ook verhuurd of met achterstallig onderhoud. Voorstel binnen 48 uur, zonder makelaarskosten."
  }
  </script>
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    "itemListElement":[
      {"@type":"ListItem","position":1,"name":"Home","item":"https://home-inn.nl/"},
      {"@type":"ListItem","position":2,"name":"Pand verkopen","item":"https://home-inn.nl/pand-verkopen"},
      {"@type":"ListItem","position":3,"name":"Verkopen in ${esc(w.naam)}","item":"${canonical}"}
    ]
  }
  </script>
</body>
</html>
`;
}

function main() {
  WIJKEN.forEach(w => { NAAM[w.slug] = w.naam; });
  let n = 0;
  WIJKEN.forEach(w => {
    fs.writeFileSync(path.join(__dirname, `verkopen-${w.slug}.html`), page(w), 'utf8');
    n++;
    console.log(`  ✓ verkopen-${w.slug}.html  (${w.naam})`);
  });
  console.log(`\nKlaar: ${n} wijk-spoke(s) gegenereerd.`);
}

main();
module.exports = { WIJKEN, META, page };
