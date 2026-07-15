/* ============================================================================
   HomeINN — Fullscreen fotogalerij (lightbox)
   ----------------------------------------------------------------------------
   Werkt op elke pagina met foto's:
     • woning.html      → .wd-gallery[data-fotos] (opent ALLE foto's, ook die
                           niet in het raster passen) + knop [data-lb-open]
     • homeinn-public   → de woningdetail-overlay (.wd-main / .wd-thumb)
   Bediening: klik, ← →, Esc, swipe. Respecteert prefers-reduced-motion.
   Laad dit bestand ná de pagina-scripts:  <script src="lightbox.js" defer></script>
   ========================================================================== */
(function () {
  'use strict';

  var fotos = [], idx = 0, titel = '', laatsteFocus = null;

  function bouw() {
    var el = document.getElementById('lb');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'lb';
    el.id = 'lb';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Fotogalerij');
    el.innerHTML =
      '<button class="lb-close" type="button" data-lb-close aria-label="Sluiten">✕</button>' +
      '<button class="lb-prev" type="button" data-lb-prev aria-label="Vorige foto">‹</button>' +
      '<button class="lb-next" type="button" data-lb-next aria-label="Volgende foto">›</button>' +
      '<p class="lb-cap" id="lb-cap"></p>' +
      '<img class="lb-img" id="lb-img" alt="">' +
      '<p class="lb-count" id="lb-count" aria-live="polite"></p>';
    document.body.appendChild(el);
    return el;
  }

  function toon() {
    var img = document.getElementById('lb-img');
    if (!img) return;
    var src = fotos[idx];
    img.classList.remove('in');
    var pre = new Image();
    function zet() { img.src = src; img.alt = titel ? (titel + ' — foto ' + (idx + 1)) : ('Foto ' + (idx + 1)); img.classList.add('in'); }
    pre.onload = zet; pre.onerror = zet; pre.src = src;
    var cnt = document.getElementById('lb-count');
    if (cnt) cnt.textContent = (idx + 1) + ' / ' + fotos.length;
    var cap = document.getElementById('lb-cap');
    if (cap) cap.textContent = titel || '';
    var solo = fotos.length < 2;
    var p = document.querySelector('.lb-prev'), n = document.querySelector('.lb-next');
    if (p) p.style.display = solo ? 'none' : '';
    if (n) n.style.display = solo ? 'none' : '';
    // volgende foto vast voorladen — bladeren voelt direct
    if (!solo) { var nx = new Image(); nx.src = fotos[(idx + 1) % fotos.length]; }
  }

  function open(lijst, start, naam) {
    if (!lijst || !lijst.length) return;
    fotos = lijst; idx = Math.max(0, Math.min(start || 0, lijst.length - 1)); titel = naam || '';
    laatsteFocus = document.activeElement;
    var el = bouw();
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    toon();
    requestAnimationFrame(function () { el.classList.add('vis'); });
    var c = el.querySelector('.lb-close');
    if (c) { try { c.focus(); } catch (_) {} }
  }

  function sluit() {
    var el = document.getElementById('lb');
    if (!el || !el.classList.contains('on')) return;
    el.classList.remove('vis');
    el.setAttribute('aria-hidden', 'true');
    setTimeout(function () { el.classList.remove('on'); }, 300);
    // scroll-lock alleen loslaten als er niets anders open staat
    var wd = document.getElementById('woning-detail');
    var md = document.getElementById('modal');
    var mob = document.getElementById('mob');
    var anders = (wd && wd.classList.contains('on')) || (md && md.classList.contains('on')) || (mob && mob.classList.contains('on'));
    if (!anders) document.body.classList.remove('no-scroll');
    if (laatsteFocus) { try { laatsteFocus.focus(); } catch (_) {} }
  }

  function stap(d) {
    if (fotos.length < 2) return;
    idx = (idx + d + fotos.length) % fotos.length;
    toon();
  }

  function lijstVan(gal) {
    try { return JSON.parse(gal.getAttribute('data-fotos') || '[]'); } catch (_) { return []; }
  }

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('[data-lb-close]')) { sluit(); return; }
    if (e.target.closest('[data-lb-prev]')) { stap(-1); return; }
    if (e.target.closest('[data-lb-next]')) { stap(1); return; }
    var lb = document.getElementById('lb');
    if (lb && lb.classList.contains('on')) { if (e.target === lb) sluit(); return; }

    // 1) knop "alle foto's"
    var knop = e.target.closest('[data-lb-open]');
    if (knop) {
      var gal1 = document.querySelector('.wd-gallery');
      if (gal1) open(lijstVan(gal1), Number(knop.getAttribute('data-lb-open')) || 0, gal1.getAttribute('data-titel') || '');
      return;
    }

    // 2) foto in het raster op woning.html
    var img = e.target.closest('.wd-gallery img');
    if (img) {
      var gal = img.closest('.wd-gallery');
      var alle = lijstVan(gal);
      var mijn = img.getAttribute('src');
      var i = alle.indexOf(mijn);
      if (!alle.length) { alle = [mijn]; i = 0; }
      open(alle, i < 0 ? 0 : i, gal.getAttribute('data-titel') || '');
      return;
    }

    // 3) legacy overlay (homeinn-public.html)
    var wd = document.getElementById('woning-detail');
    if (!wd || !wd.classList.contains('on')) return;
    var main = e.target.closest('.wd-main');
    var th = e.target.closest('.wd-thumb');
    if (!main && !th) return;
    var thumbs = Array.prototype.map.call(wd.querySelectorAll('.wd-thumb'), function (t) { return t.getAttribute('data-src'); });
    var naam = (wd.querySelector('.wd-titel') || {}).textContent || '';
    if (!thumbs.length) {
      var m = wd.querySelector('.wd-main');
      if (m) open([m.getAttribute('src')], 0, naam);
      return;
    }
    var huidig = th ? th.getAttribute('data-src') : (wd.querySelector('.wd-main') || {}).getAttribute('src');
    var j = thumbs.indexOf(huidig);
    open(thumbs, j < 0 ? 0 : j, naam);
  });

  document.addEventListener('keydown', function (e) {
    var lb = document.getElementById('lb');
    if (!lb || !lb.classList.contains('on')) return;
    if (e.key === 'Escape') { e.stopPropagation(); sluit(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stap(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stap(-1); }
  }, true);

  // Swipe op mobiel
  var x0 = null;
  document.addEventListener('touchstart', function (e) {
    var lb = document.getElementById('lb');
    if (lb && lb.classList.contains('on') && e.touches[0]) x0 = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : x0) - x0;
    if (Math.abs(dx) > 45) stap(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });

  window.HomeinnLightbox = { open: open, close: sluit };
})();
