/* ============================================================================
   HomeINN — gedeeld hoofdmenu
   ----------------------------------------------------------------------------
   Eén bron voor het gedrag van de navigatie op ALLE publieke pagina's:
   het mobiele menu (met focusbeheer), het uitklapbare 'Diensten'-paneel
   (hover, klik, toetsenbord — met kloppende aria-expanded) en de sluitroutes.

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
  if (burger) burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
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

// Hover en toetsenbordfocus openen het paneel via CSS; houd aria-expanded en de
// .on-klasse daarmee in de pas, zodat Escape en schermlezers de echte staat zien.
document.querySelectorAll('.nav-has-sub').forEach(function (li) {
  var sub = li.querySelector('.nav-mega');
  if (!sub) return;
  var fijn = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (fijn) {
    li.addEventListener('mouseenter', function () { zetSub(sub, true); });
    li.addEventListener('mouseleave', function () { zetSub(sub, false); });
  }
  li.addEventListener('focusin', function () { zetSub(sub, true); });
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
