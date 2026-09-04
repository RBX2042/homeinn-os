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

const BEDRIJF = {
  naam: 'HomeINN B.V.',
  adres: 'Rosestraat 1321, 3071 AL Rotterdam',
  kvk: '96713437',
  btw: 'NL867727548B01',
};
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
      ['Welke gegevens wij verwerken en waarom', 'Vult u een formulier in (kennismakingsgesprek, pand verkopen, project volgen, investeren of contact), dan verwerken wij de gegevens die u opgeeft: naam, e-mailadres en/of telefoonnummer, het onderwerp van uw aanvraag en uw bericht. Biedt u een pand aan, dan vragen wij daarnaast het adres van het pand, het type, de bewoningssituatie (leeg of verhuurd), de bouwkundige staat, de aanleiding voor verkoop en de gewenste passeertermijn — uitsluitend om een onderbouwd voorstel te kunnen doen. Grondslag: uitvoering van (precontractuele) maatregelen op uw verzoek (art. 6 lid 1 sub b AVG) en ons gerechtvaardigd belang om aanvragen op te volgen.'],
      ['Doorsturen en opslaan van uw aanvraag', 'Formulierinzendingen worden per e-mail aan ons bezorgd via de verwerkersdienst FormSubmit. Daarnaast slaan wij uw aanvraag op in onze eigen beveiligde database bij Supabase (hostingregio: EU), zodat wij hem in ons beheerportaal kunnen opvolgen. Beide partijen treden op als verwerker en verwerken uw gegevens uitsluitend in onze opdracht. Wij verkopen of delen uw gegevens niet voor marketingdoeleinden van derden.'],
      ['Kaarten van Google Maps', 'Kaarten op deze site laden pas nadat u daarop klikt. Op dat moment worden gegevens (zoals uw IP-adres) door Google verwerkt; daarop is het privacybeleid van Google van toepassing. Klikt u niet, dan worden er geen gegevens met Google gedeeld. Lettertypen worden vanaf onze eigen server geladen.'],
      ['Scripts van jsDelivr', 'Zodra u een formulierveld aanraakt, laadt uw browser één script (de Supabase-bibliotheek) van het content delivery network jsDelivr (Prospect One / Fastly). Daarbij ontvangt jsDelivr uw IP-adres en browsergegevens; jsDelivr stelt zelf geen cookies in en profileert niet. Zonder formuliergebruik wordt dit script niet geladen.'],
      ['Bewaartermijnen', 'Aanvragen bewaren wij maximaal 12 maanden na afronding van het contact, tenzij er een overeenkomst tot stand komt — dan gelden de wettelijke (fiscale) bewaartermijnen van 7 jaar voor administratie.'],
      ['Uw rechten', 'U heeft recht op inzage, rectificatie, verwijdering, beperking, overdraagbaarheid en bezwaar. Mail daarvoor naar <a href="mailto:info@homeinn.nl">info@homeinn.nl</a>; wij reageren binnen vier weken. U kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).'],
    ],
  },
  {
    slug: 'voorwaarden', title: 'Algemene voorwaarden', icon: 'ic-doc',
    metaDescription: 'De algemene voorwaarden van HomeINN Rotterdam: toepasselijkheid, dienstverlening, tarieven, opzegging, aansprakelijkheid en toepasselijk recht.',
    heroCopy: 'Onze algemene voorwaarden geven duidelijkheid over samenwerking, verantwoordelijkheden, tarieven en communicatie. Zo weten beide partijen vooraf precies waar zij aan toe zijn.',
    versie: 'Versie 2.0 &middot; ingangsdatum 3 september 2026',
    secties: [
      ['Wie wij zijn', `Deze voorwaarden zijn van ${BEDRIJF.naam}, gevestigd aan ${BEDRIJF.adres}, ingeschreven in het handelsregister onder KvK-nummer ${BEDRIJF.kvk}, btw-identificatienummer ${BEDRIJF.btw}. Bereikbaar via <a href="mailto:info@homeinn.nl">info@homeinn.nl</a> en ${TEL}.`],
      ['Toepasselijkheid', 'Deze voorwaarden zijn van toepassing op alle offertes, aanbiedingen, overeenkomsten en dienstverlening van HomeINN. Afwijkingen gelden alleen als HomeINN die schriftelijk heeft bevestigd. De toepasselijkheid van inkoop- of andere voorwaarden van de wederpartij wordt uitdrukkelijk van de hand gewezen. Wij stellen deze voorwaarden vóór het sluiten van de overeenkomst ter beschikking; zij zijn doorlopend raadpleegbaar op deze pagina.'],
      ['Dienstverlening', 'HomeINN houdt zich bezig met de aan- en verkoop van onroerend goed, projectontwikkeling, verhuur en verhuurbemiddeling, vastgoedbeheer en aanverwante diensten. De exacte inhoud van een opdracht volgt uit de offerte, koopovereenkomst of opdrachtbevestiging. Aanbiedingen zijn vrijblijvend en geldig gedurende de daarin genoemde termijn; ontbreekt die, dan gedurende dertig dagen.'],
      ['Totstandkoming en duur', 'Een overeenkomst komt tot stand zodra de opdrachtbevestiging schriftelijk of per e-mail door beide partijen is aanvaard. Beheerovereenkomsten worden aangegaan voor onbepaalde tijd, tenzij anders overeengekomen. Opgegeven termijnen zijn indicatief en nooit fataal, tenzij uitdrukkelijk anders is vastgelegd.'],
      ['Tarieven en betaling', 'Tarieven worden vooraf transparant gecommuniceerd en zijn exclusief btw, tenzij anders vermeld. Facturen dienen te worden voldaan binnen veertien dagen na factuurdatum. Bij niet-tijdige betaling is de wederpartij zonder ingebrekestelling in verzuim en zijn de wettelijke (handels)rente en buitengerechtelijke incassokosten conform de Wet normering buitengerechtelijke incassokosten verschuldigd. Aanvullende werkzaamheden worden alleen in rekening gebracht als deze vooraf zijn afgestemd of logisch uit de opdracht voortvloeien.'],
      ['Opzegging en be&euml;indiging', 'Overeenkomsten voor onbepaalde tijd kunnen door beide partijen schriftelijk worden opgezegd met inachtneming van een opzegtermijn van &eacute;&eacute;n kalendermaand, tegen het einde van een maand. Bij een opdracht voor een bepaald project eindigt de overeenkomst na oplevering. Beide partijen mogen de overeenkomst met onmiddellijke ingang ontbinden als de andere partij in staat van faillissement verkeert, surseance van betaling is verleend of haar onderneming staakt. Verplichtingen die naar hun aard doorlopen &mdash; zoals geheimhouding en aansprakelijkheid &mdash; blijven na be&euml;indiging van kracht.'],
      ['Aansprakelijkheid', 'HomeINN spant zich in om haar werkzaamheden zorgvuldig uit te voeren. Aansprakelijkheid is beperkt tot directe schade die aantoonbaar voortvloeit uit een toerekenbare tekortkoming. De aansprakelijkheid is in alle gevallen beperkt tot het bedrag dat de aansprakelijkheidsverzekeraar van HomeINN in het betreffende geval uitkeert, vermeerderd met het eigen risico. Keert de verzekeraar niet uit, dan is de aansprakelijkheid beperkt tot het bedrag dat voor de betreffende opdracht in rekening is gebracht, over de twaalf maanden voorafgaand aan de schadeveroorzakende gebeurtenis. Aansprakelijkheid voor indirecte schade, waaronder gevolgschade, gederfde winst en gemiste besparingen, is uitgesloten. Deze beperkingen gelden niet bij opzet of bewuste roekeloosheid van HomeINN of haar leidinggevenden.'],
      ['Overmacht', 'Kan HomeINN haar verplichtingen niet nakomen door een omstandigheid die haar niet is toe te rekenen &mdash; zoals overheidsmaatregelen, storingen bij toeleveranciers, extreme weersomstandigheden of het uitvallen van nutsvoorzieningen &mdash; dan worden die verplichtingen opgeschort zolang de overmacht duurt. Duurt de overmacht langer dan zestig dagen, dan mogen beide partijen de overeenkomst ontbinden voor het niet-uitgevoerde deel, zonder dat een schadevergoedingsplicht ontstaat.'],
      ['Klachten', 'Bent u niet tevreden, meld dat dan binnen bekwame tijd nadat u het gebrek heeft ontdekt of redelijkerwijs had kunnen ontdekken, per e-mail aan <a href="mailto:info@homeinn.nl">info@homeinn.nl</a>; voor consumenten is een melding binnen twee maanden in elk geval tijdig. Wij bevestigen de ontvangst binnen vijf werkdagen en streven ernaar binnen vier weken inhoudelijk te reageren. Een klacht schort de betalingsverplichting niet op.'],
      ['Herroepingsrecht consumenten', 'Sluit u als consument op afstand (bijvoorbeeld via deze website of telefonisch) een overeenkomst voor een dienst met HomeINN, dan heeft u het wettelijke recht die overeenkomst binnen veertien dagen zonder opgave van redenen te herroepen. Vraagt u ons de dienst al binnen die termijn te starten, dan betaalt u een evenredig deel voor het reeds uitgevoerde werk. Op de koop of verkoop van onroerend goed is het herroepingsrecht niet van toepassing.'],
      ['Persoonsgegevens', 'Persoonsgegevens verwerken wij zoals beschreven in ons <a href="privacy.html">privacybeleid</a>. Verwerken wij persoonsgegevens in opdracht van de wederpartij, dan sluiten wij daarvoor een verwerkersovereenkomst conform artikel 28 AVG.'],
      ['Wijziging van deze voorwaarden', 'HomeINN mag deze voorwaarden wijzigen. Gewijzigde voorwaarden gelden voor nieuwe overeenkomsten vanaf de op deze pagina vermelde ingangsdatum. Voor lopende overeenkomsten gaat een wijziging pas in dertig dagen nadat wij de wederpartij daarover hebben ge&iuml;nformeerd; is de wijziging voor de wederpartij niet aanvaardbaar, dan mag zij de overeenkomst binnen die termijn opzeggen.'],
      ['Toepasselijk recht en bevoegde rechter', 'Op alle overeenkomsten met HomeINN is uitsluitend Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter van de rechtbank Rotterdam, tenzij dwingend recht een andere rechter aanwijst. Partijen spannen zich in om een geschil eerst in onderling overleg op te lossen.'],
    ],
  },
  {
    slug: 'cookies', title: 'Cookiebeleid', icon: 'ic-discreet',
    metaDescription: 'Het cookiebeleid van HomeINN: deze website plaatst geen cookies en gebruikt geen trackers. Alleen lokale opslag voor formulieren; kaarten pas na uw klik.',
    heroCopy: 'Deze website plaatst geen cookies en gebruikt geen trackers. Alleen uw eigen browser bewaart formuliergegevens lokaal; kaarten laden pas na uw klik.',
    versie: 'Versie 2.0 · ingangsdatum 11 juni 2026',
    secties: [
      ['Geen cookies', 'Deze website plaatst geen cookies en gebruikt geen analytische of advertentietrackers. Er is daarom geen cookiebanner nodig.'],
      ['Lokale opslag', 'Vult u een formulier in, dan bewaart uw browser de inzending ook lokaal (localStorage), zodat de aanvraag niet verloren gaat. Die lokale kopie blijft op uw eigen apparaat. De aanvraag zelf sturen wij daarnaast per e-mail en naar onze eigen database, zodat wij hem kunnen opvolgen — zie het privacybeleid voor wie die gegevens ontvangt en hoe lang wij ze bewaren.'],
      ['Scripts van derden', 'Raakt u een formulierveld aan, dan laadt uw browser één script van het content delivery network jsDelivr; daarbij ziet jsDelivr uw IP-adres. Er wordt geen cookie geplaatst. Zie het privacybeleid voor details.'],
      ['Kaarten', 'Google Maps-kaarten laden uitsluitend nadat u daarop klikt. Pas op dat moment maakt uw browser verbinding met Google; tot die tijd wordt er niets met Google gedeeld. Lettertypen laden wij van onze eigen server, niet via Google Fonts.'],
      ['Vragen', 'Vragen over cookies of privacy? Mail <a href="mailto:info@homeinn.nl">info@homeinn.nl</a>.'],
    ],
  },
];

function page(p, alle) {
  const canonical = `https://home-inn.nl/${p.slug}.html`;
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
  <link rel="apple-touch-icon" href="assets/favicon-512.png?v=20260616g">
  <meta name="theme-color" content="#0b1e30">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="HomeINN">
  <meta property="og:title" content="${p.title} — HomeINN Rotterdam">
  <meta property="og:description" content="${p.metaDescription}">
  <meta property="og:image" content="https://home-inn.nl/assets/og-home-1200x630.png?v=20260616g">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="nl_NL">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="fonts/CormorantGaramond-300.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/Outfit-300.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="fonts/fonts.css">
  <link rel="stylesheet" href="tokens.css?v=20260618">
  <link rel="stylesheet" href="homeinn-public.css?v=20260903d">
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
    .lg-foot .in a:hover{color:var(--gold-ink)}
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Naar de inhoud</a>
  ${SPRITE}
  <header class="lg-top">
    <a class="brand" href="./" aria-label="HomeINN home"><picture><source srcset="assets/logo-light.webp?v=20260616g" type="image/webp"><img src="assets/logo-light.png?v=20260616g" alt="HomeINN" width="158" height="34"></picture></a>
        <ul class="sn">
      <li><a href="projectontwikkeling.html">Projectontwikkeling</a></li>
      <li><a href="vastgoedbeheer.html">Beheer</a></li>
      <li><a href="investeren.html">Investeren</a></li>
      <li class="nav-has-sub">
        <button class="nav-sub-toggle" type="button" aria-expanded="false" aria-controls="nav-mega-diensten" onclick="toggleNavSub(this)">Diensten <span class="nav-caret" aria-hidden="true"></span></button>
        <div class="nav-mega" id="nav-mega-diensten">
          <div class="nav-mega-inner">
            <div class="nav-mega-col">
              <span class="nav-mega-h">Vijf disciplines</span>
              <a href="pand-verkopen.html"><span class="nav-sub-t">Aankoop</span><span class="nav-sub-d">Wij kopen zelf — ook verhuurd</span></a>
              <a href="projectontwikkeling.html"><span class="nav-sub-t">Projectontwikkeling</span><span class="nav-sub-d">Herontwikkeling en verduurzaming</span></a>
              <a href="te-koop.html"><span class="nav-sub-t">Verkoop</span><span class="nav-sub-d">Opgeleverd, gekeurd, energiezuinig</span></a>
              <a href="verhuur.html"><span class="nav-sub-t">Verhuur</span><span class="nav-sub-d">Van advertentie tot sleuteloverdracht</span></a>
              <a href="vastgoedbeheer.html"><span class="nav-sub-t">Vastgoedbeheer</span><span class="nav-sub-d">Vaste percentages, één aanspreekpunt</span></a>
            </div>
            <div class="nav-mega-col">
              <span class="nav-mega-h">Aanbod &amp; achtergrond</span>
              <a href="te-koop.html"><span class="nav-sub-t">Woningaanbod</span><span class="nav-sub-d">Wat er nu te koop staat</span></a>
              <a href="verhuur.html"><span class="nav-sub-t">Huuraanbod</span><span class="nav-sub-d">Beschikbare huurwoningen</span></a>
              <a href="projecten.html"><span class="nav-sub-t">Projecten &amp; investeren</span><span class="nav-sub-d">Meelopen in een lopende ontwikkeling</span></a>
              <a href="kennis.html"><span class="nav-sub-t">Kennis</span><span class="nav-sub-d">Wat wij zien in de Rotterdamse markt</span></a>
              <a href="werkgebied.html"><span class="nav-sub-t">Werkgebied</span><span class="nav-sub-d">Rotterdam en omstreken</span></a>
            </div>
            <div class="nav-mega-feat">
              <span class="nav-mega-h">Kennismaken</span>
              <p class="nav-mega-p">Dertig minuten is genoeg om te weten of wij iets voor elkaar kunnen betekenen. In Rotterdam, bij u thuis of online.</p>
              <a class="btn btn-primary nav-mega-btn" href="contact.html">Plan een kennismaking <span class="arr">→</span></a>
              <p class="nav-mega-tel">Liever bellen? <a href="tel:+31626257071">${TEL}</a></p>
            </div>
          </div>
        </div>
      </li>
      <li><a href="over-ons.html">Over ons</a></li>
    </ul>
    <button class="sn-burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mob" onclick="toggleMob()"><span></span><span></span><span></span></button>
    <a class="tel" href="tel:+31626257071">Liever bellen? <strong>${TEL}</strong></a>
  </header>

  <div id="mob" role="dialog" aria-modal="true" aria-label="Hoofdmenu">
    <nav aria-label="Hoofdmenu">
      <a href="projectontwikkeling.html">Projectontwikkeling</a>
      <a href="vastgoedbeheer.html">Beheer</a>
      <a href="investeren.html">Investeren</a>
      <a href="over-ons.html">Over ons</a>
      <span class="mob-groep">Diensten</span>
      <a class="mob-sm" href="pand-verkopen.html">Aankoop — uw pand aanbieden</a>
      <a class="mob-sm" href="te-koop.html">Verkoop — woningaanbod</a>
      <a class="mob-sm" href="verhuur.html">Verhuur &amp; huuraanbod</a>
      <a class="mob-sm" href="projecten.html">Projecten &amp; investeren</a>
      <span class="mob-groep">Meer</span>
      <a class="mob-sm" href="kennis.html">Kennis</a>
      <a class="mob-sm" href="werkgebied.html">Werkgebied</a>
      <a class="mob-sm" href="contact.html">Contact</a>
      <a class="mob-sm" href="inloggen.html">Inloggen</a>
    </nav>
    <a class="btn btn-primary mob-btn" href="pand-verkopen.html">Pand aanbieden <span class="arr">→</span></a>
    <p class="mob-sub">Liever een gesprek? <a href="tel:+31626257071">${TEL}</a> · Rotterdam</p>
    <div class="mob-legal">
      <a href="privacy.html">Privacy</a>
      <a href="voorwaarden.html">Voorwaarden</a>
      <a href="cookies.html">Cookies</a>
    </div>
  </div>

  <main id="main" tabindex="-1">
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
    <nav class="lg-other" aria-label="Andere juridische pagina's"><span>Zie ook:</span>${andere}<a href="./">Terug naar home</a></nav>
  </main>

  <footer class="lg-foot">
    <div class="in">
      <span>© 2026 ${BEDRIJF.naam} — Vastgoedpartner Rotterdam<br><small style="color:var(--ink4)">${BEDRIJF.adres} · KvK ${BEDRIJF.kvk} · Btw ${BEDRIJF.btw}</small></span>
      <nav aria-label="Links"><a href="./">Home</a><a href="privacy.html">Privacy</a><a href="voorwaarden.html">Voorwaarden</a><a href="cookies.html">Cookies</a></nav>
      <div class="mini-f-social" aria-label="Volg HomeINN op sociale media"><a href="https://www.facebook.com/profile.php?id=61591037544281" target="_blank" rel="noopener noreferrer" aria-label="HomeINN op Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.2"/><path d="M14.6 7.9 H13.2 a2 2 0 0 0 -2 2 V20.4"/><path d="M9.2 12.7 H14.4"/></svg></a><a href="https://www.instagram.com/homeinn_b.v/" target="_blank" rel="noopener noreferrer" aria-label="HomeINN op Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.8"/><circle cx="12" cy="12" r="3.8"/><circle cx="16.5" cy="7.5" r="1.05" fill="currentColor" stroke="none"/></svg></a></div>
    </div>
  </footer>
  <script src="site-nav.js?v=20260903d"></script>
</body>
</html>
`;
}

PAGES.forEach(p => {
  fs.writeFileSync(path.join(__dirname, `${p.slug}.html`), page(p, PAGES), 'utf8');
  console.log(`  ✓ ${p.slug}.html  (${p.title})`);
});
console.log(`\nKlaar: ${PAGES.length} juridische pagina's.`);
