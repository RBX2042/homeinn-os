var curPk = 'p2';
var prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var navEl = document.getElementById('nav');
var mobEl = document.getElementById('mob');
var burgerEl = document.getElementById('burger');
var modalEl = document.getElementById('modal');
var modalFormEl = document.getElementById('mf');
var modalSuccessEl = document.getElementById('ms');

/* Aangepaste cursor verwijderd — een strakke, stille pagina gebruikt de native cursor. */

/* NAV */
window.addEventListener('scroll', () => {
  var sb = document.getElementById('scrollbar');
  if (sb) {
    var h = document.documentElement;
    sb.style.transform = 'scaleX(' + Math.min(1, h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1)).toFixed(3) + ')';
  }
  // Sticky mobiele CTA pas tonen voorbij de hero (de hero heeft zelf al een verkoop-CTA)
  document.body.classList.toggle('smcta-on', window.scrollY > window.innerHeight * 0.6);
  var n = document.getElementById('nav');
  if (!n) return;
  n.classList.toggle('scrolled', window.scrollY > 50);
}, {passive:true});

/* PAGE ROUTER */
function go(id, shouldScroll, updateHistory) {
  if (typeof shouldScroll === 'undefined') shouldScroll = true;
  if (typeof updateHistory === 'undefined') updateHistory = true;
  var pages = document.querySelectorAll('.pg');
  var target = document.getElementById('pg-' + id);
  if (!pages.length || !target) return;
  pages.forEach(p => p.classList.remove('on'));
  target.classList.add('on');
  var n = document.getElementById('nav');
  if (!n) return;
  n.classList.remove('light');
  n.classList.toggle('scrolled', window.scrollY > 50);
  n.style.color = '';
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('on', a.dataset.p === id));
  closeMob();
  if (updateHistory) {
    var url = new URL(window.location.href);
    if (id === 'home') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', id);
    }
    window.history.replaceState({}, '', url.toString());
  }
  if (shouldScroll) window.scrollTo({top:0, behavior:'smooth'});
  setTimeout(doReveal, 80);
}

/* MOBILE + submenu: zie site-nav.js (gedeeld door alle pagina's) */

/* PROCESS TABS */
function setTab(id, btn) {
  document.querySelectorAll('#proc-panels .proc-panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.proc-tabs .ptab').forEach(t => t.classList.remove('on'));
  var panel = document.getElementById('tp-' + id);
  if (!panel) return;
  panel.classList.add('on');
  btn.classList.add('on');
}

/* CALCULATOR */
function setPk(p) {
  curPk = p;
  var p1 = document.getElementById('ct-p1');
  var p2 = document.getElementById('ct-p2');
  if (!p1 || !p2) return;
  p1.classList.toggle('on', p === 'p1');
  p2.classList.toggle('on', p === 'p2');
  calcUpdate();
}
function calcUpdate() {
  var slider = document.getElementById('c-slider');
  var huurEl = document.getElementById('c-huur');
  var feeEl = document.getElementById('c-fee');
  var pctEl = document.getElementById('c-pct');
  var netEl = document.getElementById('c-net');
  if (!slider || !huurEl || !feeEl || !pctEl || !netEl) return;
  var h = parseInt(slider.value);
  var pct = curPk === 'p1' ? 0.05 : 0.08;
  var min = curPk === 'p1' ? 95 : 135;
  var amt = Math.round(h * pct);
  var fee = Math.max(amt, min);
  var eff = (fee / h * 100).toFixed(1);
  huurEl.textContent = '€ ' + h.toLocaleString('nl-NL');
  slider.setAttribute('aria-valuetext', '€ ' + h.toLocaleString('nl-NL'));
  feeEl.textContent = '€ ' + fee.toLocaleString('nl-NL');
  pctEl.textContent = eff.replace('.', ',') + '%';
  netEl.textContent = '€ ' + (h - fee).toLocaleString('nl-NL');
}
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('hero-ready');
  var params = new URLSearchParams(window.location.search);
  var formStatus = params.get('form_status');
  var initialView = params.get('view');
  // De secundaire weergaven zijn nu losse pagina's. Oude ?view=-links netjes
  // doorsturen naar de echte URL's (backwards compatible voor bookmarks/deellinks).
  var VIEW_REDIRECT = {
    verkopen: 'pand-verkopen.html', aanbod: 'te-koop.html', huren: 'verhuur.html',
    projecten: 'projecten.html', tarieven: 'vastgoedbeheer.html', over: 'over-ons.html',
    blog: 'kennis.html', contact: 'contact.html', privacy: 'privacy.html',
    voorwaarden: 'voorwaarden.html', cookies: 'cookies.html'
  };
  if (initialView && VIEW_REDIRECT[initialView]) { location.replace(VIEW_REDIRECT[initialView]); return; }
  if (initialView === 'diensten') { var d = document.getElementById('diensten'); if (d) d.scrollIntoView(); }
  if (document.querySelectorAll('.pg').length) {
    if (initialView && document.getElementById('pg-' + initialView)) {
      go(initialView, false, false);
    } else {
      go('home', false, false);
    }
  }
  var s = document.getElementById('c-slider');
  if (s) { s.addEventListener('input', calcUpdate); calcUpdate(); }
  if (formStatus === 'meeting_success') showModalSuccess();
  if (formStatus === 'meeting_error') openModal();
  doReveal();
});

/* MODAL */
function showModalSuccess() {
  if (!modalEl || !modalFormEl || !modalSuccessEl) return;
  modalEl.classList.add('on');
  modalFormEl.style.display = 'none';
  modalSuccessEl.style.display = 'block';
  document.body.classList.add('no-scroll');
  var kop = modalSuccessEl.querySelector('h3');
  if (kop) { kop.setAttribute('tabindex', '-1'); try { kop.focus(); } catch (_) {} }
}

var modalLastFocus = null;
function getModalFocusable() {
  if (!modalEl) return [];
  return Array.prototype.filter.call(
    modalEl.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
    function (el) { return el.offsetParent !== null && el.getAttribute('tabindex') !== '-1'; }
  );
}
var modalGeopendOp = 0;
function openModal(subject, ref) {
  // Niet elke pagina draagt de modal. Zonder terugval zou de knop hier stil
  // doodlopen (de inline onclick geeft immers 'return false'), waardoor de lead
  // verloren gaat. Stuur de bezoeker dan door naar het contactformulier, met
  // onderwerp en projectreferentie erbij — geen persoonsgegevens in de URL.
  if (!modalEl || !modalFormEl || !modalSuccessEl) {
    var q = [];
    if (subject) q.push('onderwerp=' + encodeURIComponent(subject));
    if (ref) q.push('ref=' + encodeURIComponent(ref));
    window.location.href = 'contact.html' + (q.length ? '?' + q.join('&') : '');
    return;
  }
  modalLastFocus = document.activeElement;
  closeMob();
  modalGeopendOp = Date.now();
  modalEl.classList.add('on');
  modalFormEl.style.display = 'block';
  modalSuccessEl.style.display = 'none';
  document.body.classList.add('no-scroll');
  var sel = modalFormEl.querySelector('select[name="meeting_package"]');
  if (sel) {
    if (subject) {
      // Onderwerp dat (nog) niet als optie bestaat — bijv. een huur-CTA — dynamisch
      // toevoegen, zodat het onderwerp nooit stil verloren gaat in de lead.
      var heeft = Array.prototype.some.call(sel.options, function (o) { return o.value === subject || o.text === subject; });
      if (!heeft) sel.add(new Option(subject, subject));
      sel.value = subject;
    } else { sel.selectedIndex = 0; }
  }
  var refEl = modalFormEl.querySelector('input[name="meeting_ref"]');
  if (refEl) refEl.value = ref || '';
  var firstField = modalFormEl.querySelector('#m-naam') || getModalFocusable()[0];
  if (firstField) { try { firstField.focus(); } catch (_) {} }
}
function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('on');
  var wdOpen = document.getElementById('woning-detail');
  if (!(wdOpen && wdOpen.classList.contains('on'))) document.body.classList.remove('no-scroll');
  if (modalLastFocus && typeof modalLastFocus.focus === 'function') { try { modalLastFocus.focus(); } catch (_) {} }
  modalLastFocus = null;
}
if (modalEl) {
  modalEl.addEventListener('click', e => {
    if (e.target === modalEl) closeModal();
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modalEl && modalEl.classList.contains('on')) closeModal();
    closeMob();
    return;
  }
  // Focus-trap: houd Tab binnen de geopende modal
  if (e.key === 'Tab' && modalEl && modalEl.classList.contains('on')) {
    var f = getModalFocusable();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!modalEl.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* REVEAL — valt "fail-open" terug op zichtbaar als er geen IntersectionObserver is */
function doReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.rv:not(.in), .rv-stagger:not(.in)').forEach(el => el.classList.add('in'));
    return;
  }
  var obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, {threshold: 0.08});
  document.querySelectorAll('.rv:not(.in), .rv-stagger:not(.in)').forEach(el => obs.observe(el));
}
doReveal();

/* ===== Count-up op kerncijfers (jstats) ===== */
function runCount(el) {
  var target = parseFloat(el.getAttribute('data-count'));
  if (isNaN(target)) return;
  var from = parseFloat(el.getAttribute('data-from'));
  if (isNaN(from)) from = 0;
  var prefix = el.getAttribute('data-prefix') || '';
  var suffix = el.getAttribute('data-suffix') || '';
  var useSep = el.getAttribute('data-sep') === '1';
  var dur = 1100, start = null;
  function fmt(v) {
    var n = Math.round(v);
    return prefix + (useSep ? n.toLocaleString('nl-NL') : String(n)) + suffix;
  }
  function step(ts) {
    if (start === null) start = ts;
    var p = Math.min(1, (ts - start) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (target - from) * eased);
    if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
  }
  requestAnimationFrame(step);
}
if (!prefersReduce && 'IntersectionObserver' in window) {
  var countObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { runCount(e.target); countObs.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-count]').forEach(function (el) { countObs.observe(el); });
  });
}
window.addEventListener('resize', () => {
  if (window.innerWidth > 960) closeMob();
});
document.addEventListener('click', e => {
  var mob = document.getElementById('mob');
  var burger = document.getElementById('burger');
  if (!mob || !burger || !mob.classList.contains('on')) return;
  if (mob.contains(e.target) || burger.contains(e.target)) return;
  closeMob();
});
if (mobEl) {
  mobEl.addEventListener('click', e => {
    if (e.target.id === 'mob') { closeMob(); return; }
    // Anker-links binnen het mobiele menu: eerst sluiten (body is scroll-locked),
    // daarna pas scrollen — anders vuurt de native hash-scroll in een gelockte body.
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    e.preventDefault();
    closeMob();
    var doel = document.getElementById(a.getAttribute('href').slice(1));
    if (doel) setTimeout(function () { doel.scrollIntoView({ behavior: 'smooth' }); }, 0);
  });
}

/* ===== Google Maps: pas laden na klik (privacy) ===== */
function mapsKnop(mapsQ, titel) {
  return '<button class="map-load" type="button" data-maps="' + mapsQ + '" data-titel="' + titel + '">' +
    '<span class="map-load-icoon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21 C12 21 5 14.6 5 9.5 A7 7 0 0 1 19 9.5 C19 14.6 12 21 12 21 Z"/><circle cx="12" cy="9.5" r="2.4"/></svg></span><strong>Kaart tonen</strong><span class="map-load-sub">Google Maps — laadt pas na uw klik</span></button>';
}
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest ? e.target.closest('.map-load') : null;
  if (!btn) return;
  var iframe = document.createElement('iframe');
  iframe.className = btn.getAttribute('data-hoogte') === 'wd' ? 'wd-map' : 'card-map';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.src = 'https://www.google.com/maps?q=' + btn.getAttribute('data-maps') + '&output=embed';
  iframe.title = 'Kaart ' + (btn.getAttribute('data-titel') || '');
  btn.replaceWith(iframe);
});

/* ===== Software-integratie: formulieren → HomeINN OS (Aanvragen) ===== */
var INBOX_KEY = 'homeinn-inbox-v1';

var LEAD_EMAIL_ENDPOINT = 'https://formsubmit.co/ajax/info@homeinn.nl';

function stuurLeadDoor(type, data) {
  try {
    if (location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return Promise.resolve(true);
    return fetch(LEAD_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: 'Website-aanvraag: ' + (data.subject || type),
        _template: 'table',
        Type: type,
        Naam: data.name || '',
        Contact: data.contact || '',
        Email: data.email || '',
        Telefoon: data.phone || '',
        Onderwerp: data.subject || '',
        Bericht: data.message || '',
        Portfolio: data.portfolio || ''
      })
    }).then(function(r){return r.json().catch(function(){return null;}).then(function(j){var ok=r.ok&&!!(j&&String(j.success).toLowerCase()==="true");return ok;});}).catch(function () { return false; });
  } catch (err) { return Promise.resolve(false); }
}

function saveLead(type, data) {
  try {
    var list = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]');
    if (!Array.isArray(list)) list = [];
    data.id = 'lead' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    data.type = type;
    data.date = new Date().toISOString();
    data.handled = false;
    list.push(data);
    localStorage.setItem(INBOX_KEY, JSON.stringify(list));
  } catch (err) { console.warn('Aanvraag kon niet worden opgeslagen:', err); }
  if (window.pushLeadToCloud) window.pushLeadToCloud(type, data, 'homeinn-public.html');
  // Lokale kopie alleen bewaren als de bezorging NIET is gelukt (privacy op gedeelde apparaten).
  return stuurLeadDoor(type, data).then(function (ok) {
    if (ok) verwijderLokaleLead(data.id);
    return ok;
  });
}
function verwijderLokaleLead(id) {
  try {
    var list = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]');
    if (!Array.isArray(list)) return;
    list = list.filter(function (l) { return l && l.id !== id; });
    if (list.length) localStorage.setItem(INBOX_KEY, JSON.stringify(list)); else localStorage.removeItem(INBOX_KEY);
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', function () {
  var mform = document.querySelector('#mf form');
  if (mform) mform.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(mform);
    // Honeypot: alleen "ingevuld én binnen 4 seconden" telt als bot. Nooit meer
    // een success-scherm tonen zonder verzending — dan verdwijnt een echte lead stil.
    if (f.get('company_website') && (Date.now() - modalGeopendOp) < 4000) { mform.reset(); closeModal(); return; }
    var knop = mform.querySelector('.m-submit');
    if (knop) { knop.disabled = true; knop.textContent = 'Bezig met verzenden…'; }
    var fout = mform.querySelector('.m-fout');
    if (fout) fout.remove();
    saveLead('Gesprek', {
      name: String(f.get('meeting_name') || '').trim(),
      contact: String(f.get('meeting_contact') || '').trim(),
      portfolio: String(f.get('meeting_portfolio_size') || ''),
      subject: String(f.get('meeting_package') || ''),
      message: f.get('meeting_ref') ? 'Betreft: ' + String(f.get('meeting_ref')) : ''
    }).then(function (ok) {
      if (knop) { knop.disabled = false; knop.textContent = 'Plan mijn kennismaking →'; }
      if (ok) { mform.reset(); showModalSuccess(); return; }
      var p = document.createElement('p');
      p.className = 'm-fout';
      p.setAttribute('role', 'alert');
      p.innerHTML = 'Het versturen is niet gelukt. Probeer het nog eens, of bel ons direct op <a href="tel:+31626257071">+31 6 26 25 70 71</a> — dan plannen wij het gesprek telefonisch in.';
      mform.querySelector('.modal-body').appendChild(p);
    });
  });

  var cform = document.querySelector('#pg-contact form');
  if (cform) cform.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(cform);
    if (!f.get('company_website')) {
      saveLead('Contact', {
        name: (String(f.get('first_name') || '') + ' ' + String(f.get('last_name') || '')).trim(),
        email: String(f.get('email') || '').trim(),
        phone: String(f.get('phone') || '').trim(),
        portfolio: String(f.get('portfolio_size') || ''),
        subject: String(f.get('package_interest') || ''),
        message: String(f.get('message') || '').trim()
      });
    }
    var box = cform.closest('.cf');
    if (box) box.innerHTML = '<h3>Uw bericht is ontvangen ✓</h3><p style="margin-top:1.25rem;font-weight:300;line-height:1.8">Bedankt voor uw aanvraag. Wij nemen binnen vier uur op werkdagen contact met u op.</p>';
  });
});

/* ===== Aanbod: woningen uit aanbod.json (gepubliceerd vanuit HomeINN OS) ===== */
function escHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
  });
}

function fmtPrijs(n) {
  return '€ ' + (Number(n) || 0).toLocaleString('nl-NL') + ' k.k.';
}

var aanbodCache = [];

function renderAanbod() {
  var grid = document.getElementById('aanbod-grid');
  var soldBox = document.getElementById('aanbod-verkocht');
  if (!grid) return;
  var leeg = '<div class="aanbod-leeg"><div class="leeg-spot hi-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-aankoop"/></svg></div><h3>Nog niets in de verkoop.</h3><p>Onze woningen zijn nu in ontwikkeling. Laat uw gegevens achter via "Houd mij op de hoogte" en u hoort het zodra de eerste in de verkoop gaat.</p></div>';
  fetch('aanbod.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('geen aanbod.json'); return r.json(); })
    .then(function (data) {
      var items = (data && Array.isArray(data.aanbod)) ? data.aanbod : [];
      aanbodCache = items;
      grid.innerHTML = items.length ? items.map(function (w, i) {
        var kenmerken = [escHtml(w.plaats), escHtml(w.type), w.m2 ? w.m2 + ' m²' : '', w.kamers ? w.kamers + ' kamers' : '', w.label ? 'Energielabel ' + escHtml(w.label) : '']
          .filter(Boolean).join(' · ');
        var mapsQ = encodeURIComponent((w.adres || '') + ', ' + (w.plaats || 'Rotterdam'));
        var fotos = Array.isArray(w.fotos) ? w.fotos : [];
        var visual = fotos.length
          ? '<div class="card-visual" data-woning="' + i + '"><img class="card-foto" loading="lazy" onerror="this.style.display=&quot;none&quot;" src="' + escHtml(fotos[0]) + '" alt="' + escHtml(w.adres) + '">' + (fotos.length > 1 ? '<span class="foto-count">' + fotos.length + ' foto\u2019s</span>' : '') + '</div>'
          : mapsKnop(mapsQ, escHtml(w.adres));
        return '<article class="blog-card rv in ' + (i === 1 ? 'd1' : i === 2 ? 'd2' : '') + '">' +
          visual + '<div class="blog-body">' +
          '<div class="proj-status' + (w.status === 'Onder bod' ? ' sold' : '') + '">' + escHtml(w.status || 'Te koop') + '</div>' +
          '<h3>' + escHtml(w.adres) + '</h3>' +
          '<p class="aanbod-kenmerken">' + kenmerken + '</p>' +
          '<div class="aanbod-prijs">' + fmtPrijs(w.prijs) + '</div>' +
          '<p>' + escHtml((w.omschrijving || '').slice(0, 140) + ((w.omschrijving || '').length > 140 ? '…' : '')) + '</p>' +
          '<button class="pillar-cta" data-woning="' + i + '">Bekijk deze woning →</button> ' +
          '<button class="pillar-cta" data-open-modal data-subject="Woningaanbod ontvangen" data-ref="' + escHtml(w.id || w.adres) + '">Plan een bezichtiging →</button>' +
          '</div></article>';
      }).join('') : leeg;
      var sold = (data && Array.isArray(data.verkocht)) ? data.verkocht : [];
      if (soldBox && sold.length) {
        soldBox.innerHTML = '<p class="aanbod-sold-note">Recent verkocht: ' +
          sold.map(function (s) { return escHtml(s.adres) + ' (' + escHtml(s.plaats) + ')'; }).join(' · ') + '</p>';
      }
      if (data && data.bijgewerkt && items.length) {
        soldBox.innerHTML += '<p class="aanbod-sold-note">Aanbod bijgewerkt op ' + escHtml(data.bijgewerkt) + '</p>';
      }
    })
    .catch(function () { grid.innerHTML = leeg; });
}
document.addEventListener('DOMContentLoaded', renderAanbod);

/* ===== Te huur: huuraanbod uit aanbod.json (sleutel 'tehuur') ===== */
function fmtHuur(n) {
  return '€ ' + (Number(n) || 0).toLocaleString('nl-NL') + ' /mnd';
}

var huurCache = [];

function renderHuuraanbod() {
  var grid = document.getElementById('huren-grid');
  var metaBox = document.getElementById('huren-meta');
  if (!grid) return;
  var leeg = '<div class="aanbod-leeg"><div class="leeg-spot hi-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-sleutel"/></svg></div><h3>Op dit moment hebben wij geen woningen te huur.</h3><p>Nieuwe huurwoningen komen geregeld beschikbaar. Laat via "Ik zoek een huurwoning" weten wat u zoekt — wij benaderen u zodra er een passende woning vrijkomt.</p></div>';
  fetch('aanbod.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('geen aanbod.json'); return r.json(); })
    .then(function (data) {
      var items = (data && Array.isArray(data.tehuur)) ? data.tehuur : [];
      huurCache = items;
      grid.innerHTML = items.length ? items.map(function (w, i) {
        var kenmerken = [escHtml(w.plaats), escHtml(w.type), w.m2 ? w.m2 + ' m²' : '', w.kamers ? w.kamers + ' kamers' : '', w.label ? 'Energielabel ' + escHtml(w.label) : '']
          .filter(Boolean).join(' · ');
        var mapsQ = encodeURIComponent((w.adres || '') + ', ' + (w.plaats || 'Rotterdam'));
        var fotos = Array.isArray(w.fotos) ? w.fotos : [];
        var visual = fotos.length
          ? '<div class="card-visual" data-huur="' + i + '"><img class="card-foto" loading="lazy" onerror="this.style.display=&quot;none&quot;" src="' + escHtml(fotos[0]) + '" alt="' + escHtml(w.adres) + '">' + (fotos.length > 1 ? '<span class="foto-count">' + fotos.length + ' foto’s</span>' : '') + '</div>'
          : mapsKnop(mapsQ, escHtml(w.adres));
        return '<article class="blog-card rv in ' + (i === 1 ? 'd1' : i === 2 ? 'd2' : '') + '">' +
          visual + '<div class="blog-body">' +
          '<div class="proj-status">Te huur</div>' +
          '<h3>' + escHtml(w.adres) + '</h3>' +
          '<p class="aanbod-kenmerken">' + kenmerken + '</p>' +
          '<div class="aanbod-prijs">' + fmtHuur(w.huur) + '</div>' +
          '<p>' + escHtml((w.omschrijving || '').slice(0, 140) + ((w.omschrijving || '').length > 140 ? '…' : '')) + '</p>' +
          '<button class="pillar-cta" data-huur="' + i + '">Bekijk deze woning →</button> ' +
          '<button class="pillar-cta" data-open-modal data-subject="Huurwoning bezichtigen" data-ref="' + escHtml(w.id || w.adres) + '">Plan een bezichtiging →</button>' +
          '</div></article>';
      }).join('') : leeg;
      if (metaBox && data && data.bijgewerkt && items.length) {
        metaBox.innerHTML = '<p class="aanbod-sold-note">Huuraanbod bijgewerkt op ' + escHtml(data.bijgewerkt) + '</p>';
      }
    })
    .catch(function () { grid.innerHTML = leeg; });
}
document.addEventListener('DOMContentLoaded', renderHuuraanbod);

/* ===== Projecten volgen & investeren (uit aanbod.json) ===== */
var MAANDEN_NL = ['januari','februari','maart','april','mei','juni',
                  'juli','augustus','september','oktober','november','december'];
function fmtDatumNl(iso) {
  if (!iso) return '';
  var d = iso.split('-');
  if (d.length !== 3) return iso;
  var m = MAANDEN_NL[parseInt(d[1], 10) - 1];
  return m ? parseInt(d[2], 10) + ' ' + m + ' ' + d[0] : d[2] + '-' + d[1] + '-' + d[0];
}

/* De portefeuilleregel staat ook op pagina's zonder projectenraster (de
   homepage). Los bijwerken, anders loopt hij nooit mee met aanbod.json. */
function renderPortefeuilleMeta() {
  var meta = document.getElementById('portefeuille-meta');
  if (!meta || document.getElementById('projecten-grid')) return;
  fetch('aanbod.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('geen data'); return r.json(); })
    .then(function (data) {
      var pf = data && data.portefeuille;
      if (pf && pf.woningen) {
        meta.textContent = pf.woningen + ' woningen op ' + pf.locaties + ' locaties · eigen bezit · peildatum ' + fmtDatumNl(pf.peildatum);
      }
    })
    .catch(function () { /* statische tekst in de HTML blijft staan */ });
}
document.addEventListener('DOMContentLoaded', renderPortefeuilleMeta);

function renderProjectenPublic() {
  var grid = document.getElementById('projecten-grid');
  if (!grid) return;
  var leeg = '<div class="aanbod-leeg"><div class="leeg-spot hi-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-ontwikkeling"/></svg></div><h3>Geen lopende projecten zichtbaar.</h3><p>Nieuwe ontwikkelprojecten worden hier gepubliceerd zodra ze starten. Wilt u meedoen in een volgend project? Plan een kennismaking.</p></div>';
  fetch('aanbod.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('geen data'); return r.json(); })
    .then(function (data) {
      var items = (data && Array.isArray(data.projecten)) ? data.projecten : [];
      grid.innerHTML = items.length ? items.map(function (pr, i) {
        var mapsQ = encodeURIComponent(pr.mapsAdres || ((pr.adres || '') + ', ' + (pr.postcode ? pr.postcode + ' ' : '') + (pr.plaats || 'Rotterdam')));
        var refLabel = escHtml((pr.id || '') + ' — ' + (pr.titel || pr.adres || ''));
        var laatste = (pr.updates && pr.updates[0]) ? pr.updates[0] : null;
        var inv = pr.investering;
        var invHtml = '';
        if (inv) {
          invHtml = '<div class="invest-box">' +
            '<div class="ib-title">Open voor investeerders</div>';
          if (inv.doelbedrag) {
            var invPct = Math.min(100, Math.round((inv.opgehaald || 0) / inv.doelbedrag * 100));
            invHtml += '<div class="pw-wrap"><div class="pw-bar" style="width:' + invPct + '%"></div></div>' +
              '<div class="ib-row"><span>' + escHtml('€ ' + (Number(inv.opgehaald) || 0).toLocaleString('nl-NL') + ' opgehaald van € ' + (Number(inv.doelbedrag) || 0).toLocaleString('nl-NL')) + '</span><span>' + invPct + '%</span></div>';
          }
          if (inv.minInleg || inv.rendementPct || inv.looptijd) {
            invHtml += '<div class="ib-row">' +
              (inv.minInleg ? '<span>Min. inleg € ' + (Number(inv.minInleg) || 0).toLocaleString('nl-NL') + '</span>' : '<span></span>') +
              '<span>' + (inv.rendementPct ? escHtml(String(inv.rendementPct)).replace('.', ',') + '% streefrendement/jr' + (inv.looptijd ? ' · ' : '') : '') + escHtml(inv.looptijd || '') + '</span></div>';
          } else {
            invHtml += '<p class="ib-note">Aankoopsom, verbouwbudget, planning en het rendementspercentage leggen wij per project vast. U ontvangt de volledige cijfers na een persoonlijke kennismaking.</p>';
          }
          invHtml += '<button class="pillar-cta" data-open-modal data-subject="Investeren in een project" data-ref="' + refLabel + '">Investeer mee in dit project →</button>' +
            '</div>';
        }
        var prFotos = Array.isArray(pr.fotos) ? pr.fotos : [];
        var prVisual = '<div class="pf-visual">' + mapsKnop(mapsQ, escHtml(pr.adres)) +
          (prFotos.length ? '<img class="pf-foto" loading="lazy" decoding="async" onerror="this.remove()" onload="this.classList.add(&quot;on&quot;)" src="' + escHtml(prFotos[0]) + '" alt="' + escHtml(pr.adres + ' — pand in eigendom van HomeINN') + '">' : '') + '</div>';
        var kenmerken = [escHtml(pr.postcode || ''), escHtml(pr.wijk || pr.plaats || ''), escHtml(pr.type || '')].filter(Boolean).join(' · ');
        var voortgang = Number(pr.voortgang);
        return '<article class="blog-card rv in ' + (i % 3 === 1 ? 'd1' : i % 3 === 2 ? 'd2' : '') + '">' +
          prVisual +
          '<div class="blog-body">' +
          '<div class="proj-status">' + escHtml(pr.status || 'In ontwikkeling') + '</div>' +
          '<h3>' + escHtml(pr.titel || pr.adres) + '</h3>' +
          '<p class="aanbod-kenmerken">' + kenmerken + '</p>' +
          (isFinite(voortgang) && voortgang > 0
            ? '<div class="pw-wrap"><div class="pw-bar" style="width:' + voortgang + '%"></div></div>' +
              '<p class="aanbod-kenmerken">' + voortgang + '% gereed' + (pr.oplevering ? ' · oplevering ' + fmtDatumNl(pr.oplevering) : '') + '</p>'
            : '') +
          '<p>' + escHtml(pr.omschrijving || '') + '</p>' +
          (laatste ? '<p class="upd"><strong>Update ' + fmtDatumNl(laatste.datum) + ':</strong> ' + escHtml(laatste.tekst) + '</p>' : '') +
          invHtml +
          '<a class="pillar-cta" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '">Bekijk op Google Maps →</a>' +
          '</div></article>';
      }).join('') : leeg;
      var meta = document.getElementById('portefeuille-meta');
      var pf = data && data.portefeuille;
      if (meta && pf && pf.woningen) {
        meta.textContent = pf.woningen + ' woningen op ' + pf.locaties + ' locaties · eigen bezit · peildatum ' + fmtDatumNl(pf.peildatum);
      }
    })
    .catch(function () { grid.innerHTML = leeg; });
}
document.addEventListener('DOMContentLoaded', renderProjectenPublic);

/* Gedelegeerde modal-opener: veilig voor apostrofs in adressen/titels */
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest ? e.target.closest('[data-open-modal]') : null;
  if (btn) openModal(btn.getAttribute('data-subject') || '', btn.getAttribute('data-ref') || '');
});

/* ===== Woningdetail: galerij, kenmerken, kaart ===== */
function openWoningDetail(w) {
  var box = document.getElementById('woning-detail');
  if (!box || !w) return;
  var fotos = Array.isArray(w.fotos) ? w.fotos : [];
  var mapsQ = encodeURIComponent((w.adres || '') + ', ' + (w.plaats || 'Rotterdam'));
  var isHuur = (w.huur != null) && (w.prijs == null);
  var prijs = isHuur ? fmtHuur(w.huur) : ('€ ' + (Number(w.prijs) || 0).toLocaleString('nl-NL') + ' k.k.');
  var statusTxt = w.status || (isHuur ? 'Te huur' : 'Te koop');
  var bezSubject = isHuur ? 'Huurwoning bezichtigen' : 'Woningaanbod ontvangen';
  var rows = [
    [isHuur ? 'Huurprijs' : 'Vraagprijs', prijs],
    ['Status', statusTxt],
    ['Type', w.type || ''],
    ['Woonoppervlakte', w.m2 ? w.m2 + ' m²' : ''],
    ['Kamers', w.kamers || ''],
    ['Energielabel', w.label || ''],
    ['Plaats', w.plaats || '']
  ].filter(function (r) { return r[1]; });
  box.innerHTML =
    '<div class="wd">' +
      '<button class="wd-close" data-wd-close aria-label="Sluiten">✕</button>' +
      (fotos.length
        ? '<div class="wd-gallery"><img class="wd-main" id="wd-main" src="' + escHtml(fotos[0]) + '" alt="' + escHtml(w.adres) + '">' +
          (fotos.length > 1 ? '<div class="wd-thumbs">' + fotos.map(function (f, i) {
            return '<img class="wd-thumb' + (i === 0 ? ' on' : '') + '" tabindex="0" role="button" aria-label="Toon foto ' + (i + 1) + ' van ' + fotos.length + '" onerror="this.style.display=&quot;none&quot;" data-src="' + escHtml(f) + '" src="' + escHtml(f) + '" alt="Foto ' + (i + 1) + '">';
          }).join('') + '</div>' : '') + '</div>'
        : '') +
      '<div class="wd-body">' +
        '<div class="proj-status">' + escHtml(statusTxt) + '</div>' +
        '<h3 class="wd-titel">' + escHtml(w.adres) + ', ' + escHtml(w.plaats || 'Rotterdam') + '</h3>' +
        '<div class="wd-prijs">' + prijs + '</div>' +
        '<div class="wd-kenmerken">' + rows.map(function (r) {
          return '<div class="wd-row"><span>' + escHtml(r[0]) + '</span><strong>' + escHtml(String(r[1])) + '</strong></div>';
        }).join('') + '</div>' +
        (w.omschrijving ? '<p class="wd-tekst">' + escHtml(w.omschrijving) + '</p>' : '') +
        '<div class="wd-acties">' +
          '<button class="btn btn-primary" data-open-modal data-subject="' + escHtml(bezSubject) + '" data-ref="' + escHtml((w.id || '') + ' — ' + (w.adres || '')) + '" data-wd-close>Plan een bezichtiging <span class="arr">→</span></button>' +
          '<a class="btn btn-outline-dark" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '">Route & omgeving</a>' +
        '</div>' +
        '<div class="wd-map-wrap">' + mapsKnop(mapsQ, escHtml(w.adres)).replace('class="map-load"', 'class="map-load" data-hoogte="wd"') + '</div>' +
      '</div>' +
    '</div>';
  box.classList.add('on');
  box.setAttribute('aria-hidden', 'false');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', (w.adres || 'Woning') + ', ' + (w.plaats || 'Rotterdam'));
  document.body.classList.add('no-scroll');
  box.scrollTop = 0;
  wdLaatsteFocus = document.activeElement;
  var sluit = box.querySelector('.wd-close');
  if (sluit) { try { sluit.focus(); } catch (_) {} }
}
var wdLaatsteFocus = null;

function closeWoningDetail() {
  var box = document.getElementById('woning-detail');
  if (!box) return;
  if (!box.classList.contains('on')) return;
  box.classList.remove('on');
  box.setAttribute('aria-hidden', 'true');
  if (!(modalEl && modalEl.classList.contains('on'))) document.body.classList.remove('no-scroll');
  if (wdLaatsteFocus && typeof wdLaatsteFocus.focus === 'function') { try { wdLaatsteFocus.focus(); } catch (_) {} }
  wdLaatsteFocus = null;
}

document.addEventListener('click', function (e) {
  if (!e.target) return;
  var open = e.target.closest ? e.target.closest('[data-woning]') : null;
  if (open) { openWoningDetail(aanbodCache[Number(open.getAttribute('data-woning'))]); return; }
  var openH = e.target.closest ? e.target.closest('[data-huur]') : null;
  if (openH) { openWoningDetail(huurCache[Number(openH.getAttribute('data-huur'))]); return; }
  var thumb = e.target.closest ? e.target.closest('.wd-thumb') : null;
  if (thumb) {
    var main = document.getElementById('wd-main');
    if (main) main.src = thumb.getAttribute('data-src');
    document.querySelectorAll('.wd-thumb').forEach(function (t) { t.classList.toggle('on', t === thumb); });
    return;
  }
  var dicht = e.target.closest ? e.target.closest('[data-wd-close]') : null;
  var bg = document.getElementById('woning-detail');
  if (dicht || e.target === bg) closeWoningDetail();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeWoningDetail(); return; }
  // Enter/Spatie op een thumbnail = klik (toetsenbordbediening galerij)
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('wd-thumb')) {
    e.preventDefault(); e.target.click();
  }
  // Focus-trap binnen de woningdetail-dialoog
  var box = document.getElementById('woning-detail');
  if (e.key === 'Tab' && box && box.classList.contains('on')) {
    var f = Array.prototype.filter.call(box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* Bedrijfsgegevens staan nu rechtstreeks in de HTML-footer (zichtbaar zonder JS) */

/* ===== PWA: installeerbaar + offline ===== */
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}

/* ===== FAQ-accordion (met aria-expanded, zodat screenreaders de staat volgen) ===== */
function syncFaqState(item) {
  var btn = item.querySelector('.faq-q');
  var panel = item.querySelector('.faq-a');
  var open = item.classList.contains('open');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (panel) panel.setAttribute('aria-hidden', open ? 'false' : 'true');
}
document.addEventListener('click', function (e) {
  var q = e.target.closest ? e.target.closest('.faq-q') : null;
  if (!q) return;
  var item = q.parentElement;
  var open = item.classList.contains('open');
  item.parentElement.querySelectorAll('.faq-item').forEach(function (el) {
    el.classList.remove('open');
    syncFaqState(el);
  });
  if (!open) { item.classList.add('open'); syncFaqState(item); }
});
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.faq-item').forEach(syncFaqState);
});

/* ===== Hero-parallax: subtiele diepte bij scrollen ===== */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lagen = [];
  document.querySelectorAll('.hero-bridge, .hero-bridge-m').forEach(function (el) { lagen.push([el, 0.13]); });
  var glow = document.querySelector('.hero-glow');
  if (glow) lagen.push([glow, 0.06]);
  var grain = document.querySelector('.hero-grain');
  if (grain) lagen.push([grain, 0.04]);
  if (!lagen.length) return;
  var tick = false;
  function upd() {
    var y = window.scrollY || window.pageYOffset || 0;
    // robuuste viewporthoogte — innerHeight kan 0/undefined zijn in sommige omgevingen
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    if (y <= vh * 1.25) {
      lagen.forEach(function (l) { l[0].style.transform = 'translate3d(0,' + (y * l[1]).toFixed(1) + 'px,0)'; });
    }
    tick = false;
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(upd); }
  }, { passive: true });
})();


/* ── Contactformulier voorvullen vanuit ?onderwerp= / ?ref= ──────────────────
   Zo landt een bezoeker die vanaf een projectkaart of een menuknop doorklikt
   met het juiste onderwerp in het formulier, in plaats van opnieuw te moeten
   kiezen. De waarden komen uit onze eigen links; ze worden alleen als tekst
   in bestaande velden gezet, nooit als HTML uitgevoerd. */
(function () {
  var form = document.getElementById('ct-form');
  if (!form || !window.location.search) return;
  var params = new URLSearchParams(window.location.search);
  var onderwerp = params.get('onderwerp');
  var ref = params.get('ref');

  if (onderwerp) {
    var sel = form.querySelector('#ct-interest');
    if (sel) {
      var match = Array.prototype.filter.call(sel.options, function (o) {
        return o.value === onderwerp || o.text === onderwerp;
      })[0];
      if (!match) { match = new Option(onderwerp, onderwerp); sel.add(match); }
      sel.value = match.value;
    }
  }
  if (ref) {
    var msg = form.querySelector('#ct-message');
    if (msg && !msg.value) msg.value = 'Betreft: ' + ref + '\n\n';
  }
  var eerste = form.querySelector('#ct-first');
  if (eerste) { try { eerste.focus({ preventScroll: true }); } catch (_) {} }
})();
