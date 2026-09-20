/* ============================================================================
   HomeINN — gedeeld hoofdmenu
   ----------------------------------------------------------------------------
   Eén bron voor het gedrag van de navigatie op ALLE publieke pagina's:
   het mobiele menu (met focusbeheer), het uitklapbare 'Diensten'-paneel
   (klik, toetsenbord — met kloppende aria-expanded) en de sluitroutes.

   Laad dit bestand vóór homeinn-public.js — die roept closeMob() aan vanuit
   de paginarouter go().

   De opmaak staat in homeinn-public.css (.sn, .nav-mega, #mob, .burger).
   ============================================================================ */

var FOCUSBAAR = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
var mobLaatsteFocus = null;

function andereOverlayOpen() {
  var modal = document.getElementById('modal');
  var wd = document.getElementById('woning-detail');
  return (modal && modal.classList.contains('on')) || (wd && wd.classList.contains('on'));
}

/* ── Mobiel menu ── */
function syncMenuState(isOpen) {
  // Scroll-lock alleen opheffen als er geen andere overlay (modal/woningdetail) meer open staat.
  document.body.classList.toggle('no-scroll', isOpen || andereOverlayOpen());
  var burger = document.getElementById('burger');
  if (burger) {
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    burger.setAttribute('aria-label', document.documentElement.lang === 'en' ? (isOpen ? 'Close menu' : 'Open menu') : (isOpen ? 'Sluit menu' : 'Open menu'));
  }
}

function closeMob() {
  var mob = document.getElementById('mob');
  if (!mob || !mob.classList.contains('on')) return;
  mob.classList.remove('on');
  syncMenuState(false);
  if (mobLaatsteFocus && typeof mobLaatsteFocus.focus === 'function') { try { mobLaatsteFocus.focus(); } catch (_) {} }
  mobLaatsteFocus = null;
}

function toggleMob() {
  var mob = document.getElementById('mob');
  if (!mob) return;
  var isOpen = !mob.classList.contains('on');
  if (!isOpen) { closeMob(); return; }
  mobLaatsteFocus = document.activeElement;
  mob.classList.add('on');
  syncMenuState(true);
  // role="dialog" + aria-modal vereist dat de focus de dialoog in gaat.
  var eerste = mob.querySelector(FOCUSBAAR);
  if (eerste) { try { eerste.focus(); } catch (_) {} }
}

/* Sluitroutes horen bij het gedeelde menu, ook op pagina's zonder homepage-script. */
window.addEventListener('resize', function () {
  if (window.innerWidth > 1100) closeMob();
});
document.addEventListener('click', function (e) {
  var mob = document.getElementById('mob');
  var burger = document.getElementById('burger');
  if (!mob || !mob.classList.contains('on')) return;
  if (burger && burger.contains(e.target)) return;
  if (e.target === mob || !mob.contains(e.target)) { closeMob(); return; }
  var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if (!a) return;
  var doel = document.getElementById(a.getAttribute('href').slice(1));
  if (!doel) return;
  e.preventDefault();
  closeMob();
  doel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

/* ── Uitklapbaar submenu ('Diensten') ── */
function zetSub(sub, open) {
  sub.classList.toggle('on', open);
  var btn = sub.parentElement && sub.parentElement.querySelector('.nav-sub-toggle');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeNavSubs(except) {
  document.querySelectorAll('.nav-mega.on').forEach(function (el) {
    if (el !== except) zetSub(el, false);
  });
}

function toggleNavSub(btn) {
  var sub = document.getElementById(btn.getAttribute('aria-controls'));
  if (!sub) return;
  var open = !sub.classList.contains('on');
  closeNavSubs(sub);
  zetSub(sub, open);
}

// Eén toestand voor zichtbaarheid en aria-expanded. Klik, Enter en Spatie
// bedienen de knop; focus of hover opent het paneel niet onverwacht opnieuw.
document.querySelectorAll('.nav-has-sub').forEach(function (li) {
  var sub = li.querySelector('.nav-mega');
  if (!sub) return;
  li.addEventListener('focusout', function (e) {
    if (!li.contains(e.relatedTarget)) zetSub(sub, false);
  });
});

document.addEventListener('click', function (e) {
  if (!(e.target.closest && e.target.closest('.nav-has-sub'))) closeNavSubs();
});

document.addEventListener('keydown', function (e) {
  var mob = document.getElementById('mob');
  var mobOpen = mob && mob.classList.contains('on');

  if (e.key === 'Escape') {
    var open = document.querySelector('.nav-mega.on');
    if (open) {
      var btn = open.parentElement.querySelector('.nav-sub-toggle');
      closeNavSubs();
      if (btn) btn.focus();
      return;
    }
    if (mobOpen) { closeMob(); return; }
  }

  // Focus-trap: Tab blijft binnen het geopende mobiele menu (aria-modal).
  if (e.key === 'Tab' && mobOpen) {
    var items = Array.prototype.filter.call(mob.querySelectorAll(FOCUSBAAR), function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var eerste = items[0], laatste = items[items.length - 1];
    if (!mob.contains(document.activeElement)) { e.preventDefault(); eerste.focus(); }
    else if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
    else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
  }
});

/* Markeer de huidige pagina in het menu (aria-current + accentkleur) */
document.addEventListener('DOMContentLoaded', function () {
  var hier = location.pathname.split('/').pop() || 'homeinn-public.html';
  if (hier === 'index.html' || hier === '') hier = 'homeinn-public.html';
  document.querySelectorAll('.sn a, #mob nav a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
    if (href === './' || href === '/') href = 'homeinn-public.html';
    if (href && href === hier) {
      a.setAttribute('aria-current', 'page');
      a.classList.add('on');
    }
  });
});


/* ── Scrollhint op brede tabellen ──
   .vgl-wrap (spokes) en .anv (vastgoedbeheer) scrollen horizontaal. De
   verlopende schaduw aan de rechterkant zegt dát er meer staat; hij dooft
   zodra de gebruiker aan het einde is. Staat hier omdat site-nav.js op élke
   publieke pagina geladen wordt. Zonder JS blijft de hint zichtbaar — dat is
   de veilige uitkomst, niet andersom. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.vgl-wrap,.anv').forEach(function (el) {
    function sync() {
      var rest = el.scrollWidth - el.clientWidth - el.scrollLeft;
      el.style.setProperty('--scroll-hint', rest > 8 ? '1' : '0');
    }
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
  });
});


/* ── Portefeuille inkorten op telefoons ──
   Acht panden onder elkaar is op mobiel 6,6 schermen scrollen voordat je verder
   komt. Onder 720px tonen we er drie, met een knop die de rest uitklapt. Dit
   gebeurt bewust in JavaScript: zonder JS blijft de volledige lijst staan — een
   bezoeker mag nooit panden missen doordat een script niet laadt.

   Sommige grids (projecten.html, te-koop.html, verhuur.html) worden pas ná
   DOMContentLoaded uit aanbod.json gevuld. Daarom kijkt een MutationObserver mee
   tot een grid genoeg kaarten heeft; daarna koppelt hij zichzelf los. */
(function () {
  function kortIn(grid) {
    if (grid.dataset.ingekort) return;
    var kaarten = grid.children.length;
    if (kaarten <= 4) return;               // vier of minder: inkorten heeft geen zin
    grid.dataset.ingekort = '1';
    grid.classList.add('pf-inkort');
    var knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'pf-meer';
    knop.setAttribute('aria-expanded', 'false');
    knop.innerHTML = (document.documentElement.lang === 'en' ? 'Show all ' + kaarten + ' properties ' : 'Toon alle ' + kaarten + ' panden ') + '<span class="arr" aria-hidden="true">\u2193</span>';
    knop.addEventListener('click', function () {
      grid.classList.remove('pf-inkort');
      knop.setAttribute('aria-expanded', 'true');
      knop.remove();
      // Focus naar de eerste kaart die zichtbaar wordt, zodat toetsenbord- en
      // schermlezergebruikers niet aan het einde van de lijst achterblijven.
      var eerste = grid.children[3];
      if (eerste) {
        var f = eerste.querySelector('a,button,h3');
        if (f) { if (!f.matches('a[href],button')) f.setAttribute('tabindex', '-1'); try { f.focus(); } catch (_) {} }
      }
    });
    grid.insertAdjacentElement('afterend', knop);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.matchMedia || !window.matchMedia('(max-width:720px)').matches) return;
    document.querySelectorAll('.blog-grid,.pfx-grid').forEach(function (grid) {
      kortIn(grid);
      if (grid.dataset.ingekort || !window.MutationObserver) return;
      // Nog niet genoeg kaarten: wacht tot het aanbod geladen is.
      var obs = new MutationObserver(function () {
        kortIn(grid);
        if (grid.dataset.ingekort) obs.disconnect();
      });
      obs.observe(grid, { childList: true });
    });
  });
})();

/* ── Site-brede reveal en hero-entrance ──
   De homepage had 54 reveal-animaties, de subpagina's nul (hun .rv droeg een vaste .in).
   Dit blok maakt de beweging overal gelijk zonder één regel HTML te wijzigen — dus ook
   generator-veilig. Werkwijze: componenten die bij het laden ONDER de vouw staan krijgen
   .rv en worden geobserveerd; wat al in beeld staat blijft direct zichtbaar (geen flits).
   Zonder JS gebeurt niets (alles zichtbaar, @media(scripting:none) dekt de rest); met
   prefers-reduced-motion zet de CSS alle transities uit en zet .in de opacity op 1. */
document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('hero-ready');   // zelfde haak als de homepage voor de kop-entrance
  if (!('IntersectionObserver' in window)) return;
  var SEL = '.proc-head,.proc-lede,.pstep,.pk,.tc,.val-card,.blog-card,.wg-card,.pcard,.jstep,.disc-row,' +
            '.cta-inner,.vgl-wrap,.faq-item,.kn-card,.story-text,.ci-item,.cf,.pfx-card,.pfx-vision,.pfx-summary,' +
            '.pfx-phases,.pfx-risks,.pfx-partners,.iv-form-intro,.ov-verhaal,.calc-text,.pakketten-head,.usp-strip,' +
            '.art-body > h2,.art-body > figure,.legal-doc > h2,.jstats-band,.wb-inner,.statement-body,.vh-eigenaren,.map-load';
  var vouw = window.innerHeight;
  var items = [];
  document.querySelectorAll(SEL).forEach(function (el) {
    if (el.closest('.hero,.page-hero,#nav,#mob,header')) return;
    if (el.parentElement && el.parentElement.closest('.rv,.rv-stagger') && !el.parentElement.classList.contains('rv-stagger')) return;
    var r = el.getBoundingClientRect();
    if (r.top < vouw * 0.9) return;                        // al in beeld: niet verbergen
    if (el.classList.contains('rv-stagger')) { el.classList.remove('in'); items.push(el); return; }
    el.classList.add('rv'); el.classList.remove('in');
    // lichte trapsgewijze vertraging voor broertjes naast elkaar (kaarten in een grid)
    var i = Array.prototype.indexOf.call(el.parentElement ? el.parentElement.children : [], el);
    if (i > 0 && i < 4) el.classList.add('d' + i);
    items.push(el);
  });
  // Oudere pagina's dragen soms .rv zónder .in in de HTML (bedoeld voor homeinn-public.js, dat daar
  // niet laadt). Wat al in beeld staat mag nooit verborgen blijven: direct tonen.
  document.querySelectorAll('.rv:not(.in)').forEach(function (el) { if (items.indexOf(el) > -1) return; var r = el.getBoundingClientRect(); if (r.top < vouw && r.bottom > 0) el.classList.add('in'); else items.push(el); });
  if (!items.length) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  items.forEach(function (el) { obs.observe(el); });
  // Vangnet: een verborgen of geknepen tabblad kan IntersectionObserver-meldingen uitstellen.
  // Bij scrollen/resizen controleren we zelf de positie, zodat niets in beeld onzichtbaar blijft.
  var bezig = false;
  function vangnet() {
    if (bezig) return; bezig = true;
    requestAnimationFrame(function () {
      bezig = false;
      var h = window.innerHeight;
      items = items.filter(function (el) {
        if (el.classList.contains('in')) return false;
        var r = el.getBoundingClientRect();
        if (r.top < h * 0.96 && r.bottom > 0) { el.classList.add('in'); obs.unobserve(el); return false; }
        return true;
      });
      if (!items.length) { window.removeEventListener('scroll', vangnet); window.removeEventListener('resize', vangnet); }
    });
  }
  window.addEventListener('scroll', vangnet, { passive: true });
  window.addEventListener('resize', vangnet);
  // Lettertypen/foto's verschuiven de lay-out nog even na DOMContentLoaded: daarna nog eens controleren.
  window.addEventListener('load', vangnet); setTimeout(vangnet, 900); setTimeout(vangnet, 2500);
});

/* ── Licht/donker-schakelaar (19 sep 2026) ──
   Kleuren komen uit tokens.css ([data-theme=dark] + prefers-color-scheme). Dit blok zet alleen
   de knop in de kop (naast de EN-schakelaar), onthoudt de keuze in localStorage ('hi-theme')
   en houdt aria-pressed/label bij. Het vroege inline-script in <head> past de opgeslagen keuze
   al vóór de eerste paint toe, zodat er geen flits is. */
(function () {
  var EN = (document.documentElement.lang || 'nl').indexOf('en') === 0;
  function huidig() {
    var a = document.documentElement.getAttribute('data-theme');
    if (a === 'dark' || a === 'light') return a;
    return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function label(knop) {
    var donker = huidig() === 'dark';
    knop.setAttribute('aria-pressed', donker ? 'true' : 'false');
    knop.setAttribute('aria-label', EN ? (donker ? 'Switch to light mode' : 'Switch to dark mode') : (donker ? 'Naar lichte modus' : 'Naar donkere modus'));
    knop.title = knop.getAttribute('aria-label');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', donker ? '#14161a' : (meta.dataset.licht || meta.getAttribute('content')));
  }
  function maakKnop() {
    var knop = document.createElement('button');
    knop.type = 'button'; knop.className = 'theme-sw';
    knop.innerHTML = '<svg class="ts-zon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>' +
                     '<svg class="ts-maan" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
    knop.addEventListener('click', function () {
      var naar = huidig() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', naar);
      try { localStorage.setItem('hi-theme', naar); } catch (e) {}
      document.querySelectorAll('.theme-sw').forEach(label);
    });
    label(knop);
    return knop;
  }
  document.addEventListener('DOMContentLoaded', function () {
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.dataset.licht = meta.getAttribute('content');
    var plekken = document.querySelectorAll('.lang-sw');
    if (plekken.length) plekken.forEach(function (ls) { ls.parentNode.insertBefore(maakKnop(), ls); });
    var burger = document.getElementById('burger') || document.querySelector('.sn-burger,.burger');
    if (burger) {
      var m = maakKnop(); m.classList.add('theme-sw--m'); burger.parentNode.insertBefore(m, burger);
      // Taalschakelaar ook zichtbaar in de mobiele kop (de .right-groep is daar verborgen)
      var ls0 = document.querySelector('.lang-sw');
      if (ls0) { var lm = ls0.cloneNode(true); lm.classList.add('lang-sw--m'); burger.parentNode.insertBefore(lm, m); }
    }
    else { var kop = document.querySelector('header .right, header .nav-right, .topbar .right, .topbar, header'); if (kop) kop.appendChild(maakKnop()); }
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { document.querySelectorAll('.theme-sw').forEach(label); });
  });
})();

/* ── Taal-continuïteit NL/EN (19 sep 2026) ──
   Er zijn vijf Engelse pagina's (home, about, contact, invest, projects). Alle andere pagina's
   bestaan alleen in het Nederlands. Zonder hulp verliest een Engelse bezoeker zijn taal zodra hij
   in het menu op bv. "Development" klikt. Daarom:
   1. op EN-pagina's krijgen menu-/footerlinks naar NL-only pagina's een klein NL-label en hreflang;
   2. de taalkeuze wordt onthouden ('hi-lang');
   3. landt een Engelse bezoeker (verwijzer *-en.html, ?lang=en of onthouden keuze) op een
      NL-only pagina, dan verschijnt onderaan een smalle balk met een weg terug naar het Engels;
   4. heeft de NL-pagina wél een Engelse tweeling en kwam de bezoeker van een EN-pagina, dan
      gaan we direct door naar die tweeling (geen dubbel klikken). */
(function () {
  var EN = (document.documentElement.lang || 'nl').indexOf('en') === 0;
  // Sinds 19 sep 2026 hebben alle publieke pagina's een Engelse tweeling; alleen de wijk-spokes en
  // het portaal zijn NL-only. TWIN wordt gebruikt om op EN-pagina's links naar NL-pagina's om te leiden.
  var TWIN = {'homeinn-public.html':'index-en.html','index.html':'index-en.html','over-ons.html':'about-en.html','contact.html':'contact-en.html','investeren.html':'invest-en.html','projecten.html':'projects-en.html','projectontwikkeling.html':'development-en.html','vastgoedbeheer.html':'property-management-en.html','verhuur.html':'letting-en.html','te-koop.html':'for-sale-en.html','woning.html':'property-en.html','werkgebied.html':'service-area-en.html','kennis.html':'knowledge-en.html','kennis-pand-direct-verkopen-zo-werkt-het.html':'knowledge-sell-directly-en.html','kennis-verduurzamen-naar-label-a.html':'knowledge-energy-label-a-en.html','kennis-verhuren-of-verkopen-de-afweging.html':'knowledge-let-or-sell-en.html','pand-verkopen.html':'sell-your-property-en.html','privacy.html':'privacy-en.html','cookies.html':'cookies-en.html','voorwaarden.html':'terms-en.html'};
  var NL_ONLY = /^(verkopen-[a-z-]+|portaal|inloggen|huurders|kopers|verkoper|investeerders)\.html/;
  function onthoud(l) { try { localStorage.setItem('hi-lang', l); } catch (e) {} }
  function onthouden() { try { return localStorage.getItem('hi-lang'); } catch (e) { return null; } }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lang-sw').forEach(function (a) { a.addEventListener('click', function () { onthoud(a.getAttribute('lang') || 'nl'); }); });
    if (EN) {
      onthoud('en');
      document.querySelectorAll('header a[href], #mob a[href], footer a[href], .site-foot a[href], .nav-mega a[href]').forEach(function (a) {
        if (a.classList.contains('lang-sw') || a.classList.contains('mob-lang')) return; // taalschakelaar wijst bewust naar NL
        var h = a.getAttribute('href') || '';
        var m = h.match(/^([a-z0-9-]+\.html)([#?].*)?$/);
        if (m && TWIN[m[1]]) { a.setAttribute('href', TWIN[m[1]] + (m[2] || '')); return; }
        if (/^verkopen-[a-z-]+\.html/.test(h)) { a.setAttribute('href', 'sell-your-property-en.html'); return; }
        if (!NL_ONLY.test(h) || a.querySelector('.nl-tag')) return;
        a.setAttribute('hreflang', 'nl');
        a.setAttribute('href', h + (h.indexOf('?') > -1 ? '&' : '?') + 'lang=en');
        a.insertAdjacentHTML('beforeend', ' <span class="nl-tag" title="Dutch only">NL</span>');
      });
      return;
    }
    // Alleen een EIGEN pagina mag als terugweg in de balk komen. Zonder deze
    // controle kan een externe site die naar ons linkt vanaf een URL met
    // '-en.html' erin de bezoeker via onze eigen balk terugsturen naar zichzelf.
    var eigenRef = (function () {
      try {
        var u = new URL(document.referrer, location.href);
        return u.origin === location.origin && /-en\.html/.test(u.pathname) ? u.pathname + u.search : '';
      } catch (e) { return ''; }
    })();
    var q = new URLSearchParams(location.search);
    var vanEN = !!eigenRef || q.get('lang') === 'en' || (onthouden() === 'en' && !document.referrer);
    if (q.get('lang') === 'nl') { onthoud('nl'); vanEN = false; }
    if (!vanEN) return;
    var sw = document.querySelector('.lang-sw');
    var here = (location.pathname.split('/').pop() || 'index.html');
    if (sw && TWIN[here] && /index-en\.html$/.test(sw.getAttribute('href') || '')) sw.setAttribute('href', TWIN[here]);
    var isHome = /\/(index\.html|homeinn-public\.html)?$/.test(location.pathname);
    var twin = sw && (isHome || !/index-en\.html$/.test(sw.getAttribute('href') || '')) ? sw.getAttribute('href') : null;
    // Kwam de bezoeker via de NL-schakelaar van de Engelse tweeling? Dan is Nederlands een bewuste keuze.
    if (twin && eigenRef && eigenRef.indexOf(twin.replace(/^\.\//, '')) > -1) { onthoud('nl'); return; }
    var terug = twin ? twin : (eigenRef || 'index-en.html');
    var tekst = twin ? 'This page is also available in English.' : 'This page is only available in Dutch.';
    var knop = twin ? 'View in English \u2192' : 'Back to English \u2192';
    var bar = document.createElement('div');
    bar.className = 'nl-bar'; bar.setAttribute('role', 'status'); bar.setAttribute('lang', 'en');
    bar.innerHTML = '<span>' + tekst + '</span> <a href="' + terug.replace(/"/g, '') + '">' + knop + '</a>' +
                    '<button type="button" class="nl-bar-x" aria-label="Close">\u00d7</button>';
    bar.querySelector('.nl-bar-x').addEventListener('click', function () { bar.remove(); document.body.classList.remove('nl-bar-on'); onthoud('nl'); });
    document.body.appendChild(bar);
    document.body.classList.add('nl-bar-on');
  });
})();

/* ── Mobiele contactbalk (19 sep 2026) ──
   Op telefoons staat onderaan elke pagina een vaste balk met WhatsApp en Bellen, zodat contact
   altijd één tik weg is. De homepage heeft al een eigen .smcta (Investeren + WhatsApp) en wordt
   overgeslagen. De gouden taalbalk (.nl-bar) schuift erboven. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.smcta')) return;
    var EN = (document.documentElement.lang || 'nl').indexOf('en') === 0;
    var bar = document.createElement('nav');
    bar.className = 'smcta smcta-auto';
    bar.setAttribute('aria-label', EN ? 'Quick contact' : 'Snel contact');
    bar.innerHTML = '<a class="smcta-primary" href="https://wa.me/31633322257" target="_blank" rel="noopener">WhatsApp <span class="arr">\u2192</span></a>' +
                    '<a class="smcta-call" href="tel:+31633322257" aria-label="' + (EN ? 'Call HomeINN' : 'Bellen met HomeINN') + '">' + (EN ? 'Call' : 'Bellen') + '</a>';
    document.body.appendChild(bar);
    document.body.classList.add('smcta-on', 'has-smcta');
  });
})();

/* ── WhatsApp-knop op grotere schermen (20 sep 2026) ──
   Op telefoons staat WhatsApp al in de vaste contactbalk (.smcta hierboven); die balk is onder
   601px zichtbaar. Daarboven bleef WhatsApp alleen in de footer staan, terwijl de meeste mensen
   liever eerst appen dan bellen of een formulier invullen. Deze knop zweeft rechtsonder, met een
   bericht dat past bij de pagina waar de bezoeker op staat. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.wa-fab')) return;
    var EN = (document.documentElement.lang || 'nl').indexOf('en') === 0;
    var pad = (location.pathname.split('/').pop() || 'index.html');
    var berichten = EN ? {
      'invest-en.html': 'Hello HomeINN, I would like to receive the project information for investors.',
      'sell-your-property-en.html': 'Hello HomeINN, I would like a no-obligation offer for my property.',
      'for-sale-en.html': 'Hello HomeINN, I have a question about a property you have for sale.',
      'property-management-en.html': 'Hello HomeINN, I have a question about property management.',
      'letting-en.html': 'Hello HomeINN, I have a question about renting.',
      _: 'Hello HomeINN, I have a question.'
    } : {
      'investeren.html': 'Hallo HomeINN, ik ontvang graag de projectinformatie voor investeerders.',
      'pand-verkopen.html': 'Hallo HomeINN, ik wil graag een vrijblijvend bod op mijn pand.',
      'verkopen.html': 'Hallo HomeINN, ik wil graag een vrijblijvend bod op mijn pand.',
      'te-koop.html': 'Hallo HomeINN, ik heb een vraag over een woning die te koop staat.',
      'vastgoedbeheer.html': 'Hallo HomeINN, ik heb een vraag over vastgoedbeheer.',
      'verhuur.html': 'Hallo HomeINN, ik heb een vraag over huren.',
      _: 'Hallo HomeINN, ik heb een vraag.'
    };
    var tekst = berichten[pad] || (/^verkopen-/.test(pad) ? berichten['pand-verkopen.html'] || berichten._ : berichten._);
    var label = EN ? 'Message us on WhatsApp' : 'Stuur ons een WhatsApp-bericht';
    var a = document.createElement('a');
    a.className = 'wa-fab';
    a.href = 'https://wa.me/31633322257?text=' + encodeURIComponent(tekst);
    a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', label); a.title = label;
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.73.45 3.4 1.32 4.89L2 22l5.4-1.48a9.83 9.83 0 0 0 4.64 1.18h.01c5.43 0 9.84-4.4 9.84-9.84 0-2.63-1.02-5.1-2.88-6.96A9.77 9.77 0 0 0 12.04 2Zm0 1.8c2.15 0 4.17.84 5.69 2.36a7.98 7.98 0 0 1 2.35 5.68c0 4.44-3.61 8.04-8.05 8.04a8.05 8.05 0 0 1-4.1-1.12l-.29-.17-3.2.88.85-3.12-.19-.31a7.96 7.96 0 0 1-1.22-4.2c0-4.44 3.61-8.04 8.16-8.04Zm-3.6 4.1c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15 0 1.26.92 2.48 1.05 2.65.13.17 1.79 2.83 4.44 3.86 2.2.86 2.65.69 3.13.65.48-.05 1.55-.63 1.77-1.24.22-.61.22-1.14.15-1.25-.06-.11-.24-.17-.5-.3-.26-.13-1.55-.77-1.79-.85-.24-.09-.41-.13-.59.13-.17.26-.67.85-.82 1.02-.15.17-.3.2-.56.07-.26-.13-1.1-.41-2.1-1.3a7.9 7.9 0 0 1-1.46-1.8c-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.46.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.07-.13-.58-1.42-.8-1.94-.21-.5-.42-.44-.58-.44h-.5Z"/></svg>' +
      '<span>WhatsApp</span>';
    document.body.appendChild(a);
    // de mobiele contactbalk (en de eigen balk van de homepage) hetzelfde bericht meegeven
    document.querySelectorAll('.smcta a[href^="https://wa.me/"]').forEach(function (l) {
      if (l.href.indexOf('?') === -1) l.href = l.href + '?text=' + encodeURIComponent(tekst);
    });
  });
})();
