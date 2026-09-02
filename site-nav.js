/* ============================================================================
   HomeINN — gedeeld hoofdmenu
   ----------------------------------------------------------------------------
   Eén bron voor het gedrag van de navigatie op ALLE publieke pagina's:
   het mobiele menu, het uitklapbare 'Diensten'-paneel en de sluitroutes.

   Laad dit bestand vóór homeinn-public.js — die roept closeMob() aan vanuit
   de paginarouter go().

   De opmaak staat in homeinn-public.css (.sn, .nav-mega, #mob, .burger).
   ============================================================================ */

/* ── Mobiel menu ── */
function syncMenuState(isOpen) {
  document.body.classList.toggle('no-scroll', isOpen);
  var burger = document.getElementById('burger');
  if (burger) burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeMob() {
  var mob = document.getElementById('mob');
  if (!mob) return;
  mob.classList.remove('on');
  syncMenuState(false);
}

function toggleMob() {
  var mob = document.getElementById('mob');
  if (!mob) return;
  var isOpen = !mob.classList.contains('on');
  mob.classList.toggle('on', isOpen);
  syncMenuState(isOpen);
}

/* ── Uitklapbaar submenu ('Diensten') ── */
function closeNavSubs(except) {
  document.querySelectorAll('.nav-mega.on').forEach(function (el) {
    if (el === except) return;
    el.classList.remove('on');
    var btn = el.parentElement && el.parentElement.querySelector('.nav-sub-toggle');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

function toggleNavSub(btn) {
  var sub = document.getElementById(btn.getAttribute('aria-controls'));
  if (!sub) return;
  var open = !sub.classList.contains('on');
  closeNavSubs(sub);
  sub.classList.toggle('on', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

document.addEventListener('click', function (e) {
  if (!(e.target.closest && e.target.closest('.nav-has-sub'))) closeNavSubs();
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var open = document.querySelector('.nav-mega.on');
  if (open) {
    var btn = open.parentElement.querySelector('.nav-sub-toggle');
    closeNavSubs();
    if (btn) btn.focus();
    return;
  }
  var mob = document.getElementById('mob');
  if (mob && mob.classList.contains('on')) {
    closeMob();
    var burger = document.getElementById('burger');
    if (burger) burger.focus();
  }
});

/* Markeer de huidige pagina in het menu (aria-current + accentkleur) */
document.addEventListener('DOMContentLoaded', function () {
  var hier = location.pathname.split('/').pop() || 'homeinn-public.html';
  document.querySelectorAll('.sn a, #mob nav a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
    if (href && href === hier) {
      a.setAttribute('aria-current', 'page');
      a.classList.add('on');
    }
  });
});
