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
});
