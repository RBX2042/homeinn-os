#!/usr/bin/env node
/* ============================================================================
   HomeINN — Juridische pagina's generator (privacy / voorwaarden / cookies)
   ----------------------------------------------------------------------------
   Eén gedeeld sjabloon, drie losse indexeerbare URL's. Hergebruikt het
   designsysteem (fonts.css → tokens.css → homeinn-public.css) + de bestaande
   .legal-* componenten. Teksten 1-op-1 overgenomen uit de SPA (versie 2.0).

   Gebruik:  node build-legal.js   →  privacy.html, voorwaarden.html, cookies.html
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const TEL = '+31 6 26 25 70 71';

// Iconen-sprite (alleen de symbolen die de legal-hero's gebruiken)
const SPRITE = `<svg width="0" height="0" style="position:absolute;overflow:hidden" aria-hidden="true"><defs>
<symbol id="ic-slot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 10.6 H17.4 a1.4 1.4 0 0 1 1.4 1.4 V18.6 a1.4 1.4 0 0 1 -1.4 1.4 H6.6 a1.4 1.4 0 0 1 -1.4 -1.4 V12 a1.4 1.4 0 0 1 1.4 -1.4 Z"/><path d="M8.6 10.6 V8 a3.4 3.4 0 0 1 6.8 0 V10.6"/><circle cx="12" cy="14.4" r="1.1"/><path d="M12 15.5 V16.9"/></symbol>
<symbol id="ic-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3 H14 L18 7 V21 H7 Z"/><path d="M14 3 V7 H18"/><path d="M9.5 12 H15.5"/><path d="M9.5 15 H15.5"/><path d="M9.5 18 H13"/></symbol>
<symbol id="ic-discreet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 C6.5 7.8 9.6 6 12 6 C14.4 6 17.5 7.8 20 12"/><path d="M4 12 C6.5 16.2 9.6 18 12 18 C14.4 18 17.5 16.2 20 12"/><circle cx="12" cy="12" r="2.4"/><path d="M5 5 L19 19"/></symbol>
</defs></svg>`;

const PAGES = [
  {
    slug: 'privacy', title: 'Privacybeleid', icon: 'ic-slot',
    metaDescription: 'Het privacybeleid van HomeINN: welke persoonsgegevens wij verwerken, waarom, hoe lang en welke rechten u heeft. Geen trackers, kaarten pas na uw klik.',
    heroCopy: 'HomeINN verwerkt persoonsgegevens zorgvuldig en alleen voor contact, dienstverlening en het verbeteren van de website. Hieronder leest u in duidelijke taal welke gegevens wij verwerken en waarom.',
    versie: 'Versie 2.0 · ingangsdatum 11 juni 2026',
    secties: [
      ['Wie is verantwoordelijk', 'HomeINN, gevestigd te Rotterdam, is verwerkingsverantwoordelijke voor de verwerking van persoonsgegevens via deze website. Contact: <a href="mailto:info@homeinn.nl">info@homeinn.nl</a>.'],
      ['Welke gegevens wij verwerken en waarom', 'Vult u een formulier in (kennismakingsgesprek, pand verkopen, project volgen, investeren of contact), dan verwerken wij de gegevens die u opgeeft: naam, e-mailadres en/of telefoonnummer, het onderwerp van uw aanvraag en uw bericht. Grondslag: uitvoering van (precontractuele) maatregelen op uw verzoek (art. 6 lid 1 sub b AVG) en ons gerechtvaardigd belang om aanvragen op te volgen.'],
      ['Doorsturen van uw aanvraag', 'Formulierinzendingen worden per e-mail aan ons bezorgd via de verwerkersdienst FormSubmit. Daarbij worden uw formuliergegevens door deze dienst verwerkt ten behoeve van de bezorging. Wij verkopen of delen uw gegevens niet voor marketingdoeleinden van derden.'],
      ['Kaarten van Google Maps', 'Kaarten op deze site laden pas nadat u daarop klikt. Op dat moment worden gegevens (zoals uw IP-adres) door Google verwerkt; daarop is het privacybeleid van Google van toepassing. Klikt u niet, dan worden er geen gegevens met Google gedeeld. Lettertypen worden vanaf onze eigen server geladen.'],
      ['Bewaartermijnen', 'Aanvragen bewaren wij maximaal 12 maanden na afronding van het contact, tenzij er een overeenkomst tot stand komt — dan gelden de wettelijke (fiscale) bewaartermijnen van 7 jaar voor administratie.'],
      ['Uw rechten', 'U heeft recht op inzage, rectificatie, verwijdering, beperking, overdraagbaarheid en bezwaar. Mail daarvoor naar <a href="mailto:info@homeinn.nl">info@homeinn.nl</a>; wij reageren binnen vier weken. U kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).'],
    ],
  },
  {
    slug: 'voorwaarden', title: 'Algemene voorwaarden', icon: 'ic-doc',
    metaDescription: 'De algemene voorwaarden van HomeINN: toepasselijkheid, dienstverlening, tarieven en betaling, en aansprakelijkheid. Helder en vooraf duidelijk.',
    heroCopy: 'Onze algemene voorwaarden geven duidelijkheid over samenwerking, verantwoordelijkheden, tarieven en communicatie. Zo weten beide partijen vooraf precies waar zij aan toe zijn.',
    versie: '',
    secties: [
      ['Toepasselijkheid', 'Deze voorwaarden zijn van toepassing op offertes, overeenkomsten en dienstverlening van HomeINN, tenzij schriftelijk anders is overeengekomen.'],
      ['Dienstverlening', 'HomeINN houdt zich bezig met de aan- en verkoop van onroerend goed, projectontwikkeling, vastgoedbeheer en aanverwante diensten. De exacte inhoud van een opdracht of overeenkomst volgt uit de offerte, koopovereenkomst of opdrachtbevestiging.'],
      ['Tarieven en betaling', 'Tarieven worden vooraf transparant gecommuniceerd. Facturen dienen te worden voldaan binnen de overeengekomen termijn. Eventuele aanvullende werkzaamheden worden alleen in rekening gebracht als deze vooraf zijn afgestemd of logisch uit de opdracht voortvloeien.'],
      ['Aansprakelijkheid', 'HomeINN spant zich in om haar werkzaamheden zorgvuldig uit te voeren. Aansprakelijkheid is beperkt tot directe schade die aantoonbaar voortvloeit uit een toerekenbare tekortkoming en voor zover wettelijk toegestaan.'],
    ],
  },
  {
    slug: 'cookies', title: 'Cookiebeleid', icon: 'ic-discreet',
    metaDescription: 'Het cookiebeleid van HomeINN: deze website plaatst geen cookies en gebruikt geen trackers. Alleen lokale opslag voor formulieren; kaarten pas na uw klik.',
    heroCopy: 'Deze website plaatst geen cookies en gebruikt geen trackers. Alleen uw eigen browser bewaart formuliergegevens lokaal; kaarten laden pas na uw klik.',
    versie: 'Versie 2.0 · ingangsdatum 11 juni 2026',
    secties: [
      ['Geen cookies', 'Deze website plaatst geen cookies en gebruikt geen analytische of advertentietrackers. Er is daarom geen cookiebanner nodig.'],
      ['Lokale opslag', 'Vult u een formulier in, dan kan uw browser de inzending tijdelijk lokaal bewaren (localStorage) zodat de aanvraag goed wordt verwerkt. Deze gegevens blijven op uw eigen apparaat en zijn voor ons niet op afstand toegankelijk.'],
      ['Kaarten', 'Google Maps-kaarten laden uitsluitend nadat u daarop klikt. Pas op dat moment maakt uw browser verbinding met Google; tot die tijd wordt er niets met Google gedeeld. Lettertypen laden wij van onze eigen server, niet via Google Fonts.'],
      ['Vragen', 'Vragen over cookies of privacy? Mail <a href="mailto:info@homeinn.nl">info@homeinn.nl</a>.'],
    ],
  },
];

function page(p, alle) {
  const canonical = `https://home-inn.nl/${p.slug}`;
  const sections = p.secties.map(s => `<h2>${s[0]}</h2>\n      <p>${s[1]}</p>`).join('\n      ');
  const versie = p.versie ? `<p style="font-size:.78rem;color:var(--ink4)">${p.versie}</p>\n      ` : '';
  const andere = alle.filter(x => x.slug !== p.slug).map(x => `<a href="${x.slug}.html">${x.title}</a>`).join('');
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${p.title} — HomeINN Rotterdam</title>
  <meta name="description" content="${p.metaDescription}">
  <link rel="icon" href="assets/favicon-512.png?v=20260616g">
  <meta name="theme-color" content="#0b1e30">
  <link rel="canonical" href="${canonical}">
  <link rel="preload" href="fonts/CormorantGaramond-300.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/Outfit-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="fonts/fonts.css">
  <link rel="stylesheet" href="tokens.css?v=20260618">
  <link rel="stylesheet" href="homeinn-public.css?v=20260616g">
  <style>
    .lg-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.1rem clamp(1.25rem,5vw,5.5rem);background:var(--navy);border-bottom:1px solid rgba(var(--gold-rgb),.35);position:sticky;top:0;z-index:800}
    .lg-top .brand img{height:34px;width:auto;display:block}
    .lg-top .tel{color:#eaf0f5;text-decoration:none;font-size:.8rem;font-weight:500;letter-spacing:.02em;white-space:nowrap}
    .lg-top .tel strong{color:#fff;font-weight:600}
    @media(max-width:560px){.lg-top .tel{display:none}}
    .lg-other{max-width:760px;margin:0 auto;padding:0 clamp(1.5rem,5vw,2rem) clamp(3rem,6vw,5rem);display:flex;flex-wrap:wrap;gap:1.25rem;font-size:.82rem}
    .lg-other span{color:var(--ink4)}
    .lg-other a{color:var(--gold-ink);text-decoration:none;border-bottom:1px solid rgba(var(--gold-rgb),.3)}
    .lg-foot{border-top:1px solid var(--line);background:var(--panel)}
    .lg-foot .in{max-width:1320px;margin:0 auto;padding:2.25rem clamp(1.5rem,5vw,5.5rem);display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:center;font-size:.72rem;color:var(--ink4)}
    .lg-foot .in a{color:var(--ink3);text-decoration:none;margin-left:1.4rem}
    .lg-foot .in a:first-child{margin-left:0}
  </style>
</head>
<body>
  ${SPRITE}
  <header class="lg-top">
    <a class="brand" href="homeinn-public.html" aria-label="HomeINN home"><picture><source srcset="assets/logo-light.webp?v=20260616g" type="image/webp"><img src="assets/logo-light.png?v=20260616g" alt="HomeINN" width="158" height="34"></picture></a>
    <a class="tel" href="tel:+31626257071">Liever bellen? <strong>${TEL}</strong></a>
  </header>

  <main>
    <section class="legal-hero">
      <div class="legal-hero-inner">
        <div><span class="t-eyebrow">Juridisch</span><h1 class="page-h1">${p.title}</h1></div>
        <div class="legal-hero-copy"><p>${p.heroCopy}</p></div>
      </div>
      <div class="legal-spot spot-art" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <circle class="sa-line" cx="50" cy="50" r="46"/>
          <circle class="sa-faint" cx="50" cy="50" r="38" stroke-dasharray="2.5 4"/>
          <svg x="29" y="29" width="42" height="42" viewBox="0 0 24 24"><use href="#${p.icon}"/></svg>
        </svg>
      </div>
    </section>
    <section class="section legal-section">
      <div class="legal-wrap">
        <article class="legal-doc">
      ${versie}${sections}
        </article>
      </div>
    </section>
    <nav class="lg-other" aria-label="Andere juridische pagina's"><span>Zie ook:</span>${andere}<a href="homeinn-public.html">Terug naar home</a></nav>
  </main>

  <footer class="lg-foot">
    <div class="in">
      <span>© 2026 HomeINN — Vastgoedpartner Rotterdam</span>
      <nav aria-label="Links"><a href="homeinn-public.html">Home</a><a href="privacy.html">Privacy</a><a href="voorwaarden.html">Voorwaarden</a><a href="cookies.html">Cookies</a></nav>
    </div>
  </footer>
</body>
</html>
`;
}

PAGES.forEach(p => {
  fs.writeFileSync(path.join(__dirname, `${p.slug}.html`), page(p, PAGES), 'utf8');
  console.log(`  ✓ ${p.slug}.html  (${p.title})`);
});
console.log(`\nKlaar: ${PAGES.length} juridische pagina's.`);
