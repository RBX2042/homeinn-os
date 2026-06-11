var curPk = 'p2';
var curX = 0, curY = 0, ringX = 0, ringY = 0;
var hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var curEl = document.getElementById('cur');
var ringEl = document.getElementById('cur-ring');
var navEl = document.getElementById('nav');
var mobEl = document.getElementById('mob');
var burgerEl = document.getElementById('burger');
var modalEl = document.getElementById('modal');
var modalFormEl = document.getElementById('mf');
var modalSuccessEl = document.getElementById('ms');

if (hasFinePointer) {
  document.body.classList.add('has-custom-cursor');
}

/* CURSOR */
if (hasFinePointer && curEl && ringEl) {
  document.addEventListener('mousemove', e => { curX = e.clientX; curY = e.clientY; });
  (function raf() {
    ringX += (curX - ringX) * 0.12;
    ringY += (curY - ringY) * 0.12;
    curEl.style.transform = 'translate(' + curX + 'px,' + curY + 'px)';
    ringEl.style.transform = 'translate(' + Math.round(ringX) + 'px,' + Math.round(ringY) + 'px)';
    requestAnimationFrame(raf);
  })();
  document.querySelectorAll('a,button,.pk,.tc,.testi-card,.blog-card,.wb-item,.pstep').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-grow'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-grow'));
  });
  document.querySelectorAll('input,textarea').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-text'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-text'));
  });
}

/* NAV */
window.addEventListener('scroll', () => {
  var n = document.getElementById('nav');
  if (!n) return;
  n.classList.toggle('scrolled', window.scrollY > 50 && !n.classList.contains('light'));
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

/* MOBILE */
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

/* PROCESS TABS */
function setTab(id, btn) {
  document.querySelectorAll('.proc-panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('on'));
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
  feeEl.textContent = '€ ' + fee.toLocaleString('nl-NL');
  pctEl.textContent = eff + '%';
  netEl.textContent = '€ ' + (h - fee).toLocaleString('nl-NL');
}
document.addEventListener('DOMContentLoaded', () => {
  var params = new URLSearchParams(window.location.search);
  var formStatus = params.get('form_status');
  var initialView = params.get('view');
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
}

function openModal(subject, ref) {
  if (!modalEl || !modalFormEl || !modalSuccessEl) return;
  closeMob();
  modalEl.classList.add('on');
  modalFormEl.style.display = 'block';
  modalSuccessEl.style.display = 'none';
  document.body.classList.add('no-scroll');
  var sel = modalFormEl.querySelector('select[name="meeting_package"]');
  if (sel) {
    if (subject) { sel.value = subject; } else { sel.selectedIndex = 0; }
  }
  var refEl = modalFormEl.querySelector('input[name="meeting_ref"]');
  if (refEl) refEl.value = ref || '';
}
function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('on');
  var wdOpen = document.getElementById('woning-detail');
  if (!(wdOpen && wdOpen.classList.contains('on'))) document.body.classList.remove('no-scroll');
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
  }
});

/* REVEAL */
function doReveal() {
  var obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, {threshold: 0.08});
  document.querySelectorAll('.rv:not(.in)').forEach(el => obs.observe(el));
}
window.addEventListener('scroll', doReveal, {passive: true});
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
    if (e.target.id === 'mob') closeMob();
  });
}

/* ===== Google Maps: pas laden na klik (privacy) ===== */
function mapsKnop(mapsQ, titel) {
  return '<button class="map-load" type="button" data-maps="' + mapsQ + '" data-titel="' + titel + '">' +
    '<span class="map-load-icoon">📍</span><strong>Kaart tonen</strong><span class="map-load-sub">Google Maps — laadt pas na uw klik</span></button>';
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
    if (location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return;
    fetch(LEAD_EMAIL_ENDPOINT, {
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
    }).catch(function () { /* bezorging mag de bezoeker nooit hinderen */ });
  } catch (err) { /* idem */ }
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
  stuurLeadDoor(type, data);
}

document.addEventListener('DOMContentLoaded', function () {
  var mform = document.querySelector('#mf form');
  if (mform) mform.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(mform);
    if (!f.get('company_website')) { // honeypot: bots negeren
      saveLead('Gesprek', {
        name: String(f.get('meeting_name') || '').trim(),
        contact: String(f.get('meeting_contact') || '').trim(),
        portfolio: String(f.get('meeting_portfolio_size') || ''),
        subject: String(f.get('meeting_package') || ''),
        message: f.get('meeting_ref') ? 'Betreft: ' + String(f.get('meeting_ref')) : ''
      });
    }
    mform.reset();
    showModalSuccess();
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
  var leeg = '<div class="aanbod-leeg"><h3>Op dit moment is alles verkocht.</h3><p>Nieuwe woningen zijn in ontwikkeling. Laat uw gegevens achter via "Houd mij op de hoogte" en u hoort het als eerste.</p></div>';
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

/* ===== Projecten volgen & investeren (uit aanbod.json) ===== */
function fmtDatumNl(iso) {
  if (!iso) return '';
  var d = iso.split('-');
  return d.length === 3 ? d[2] + '-' + d[1] + '-' + d[0] : iso;
}

function renderProjectenPublic() {
  var grid = document.getElementById('projecten-grid');
  if (!grid) return;
  var leeg = '<div class="aanbod-leeg"><h3>Geen lopende projecten zichtbaar.</h3><p>Nieuwe ontwikkelprojecten worden hier gepubliceerd zodra ze starten. Wilt u meedoen in een volgend project? Plan een kennismaking.</p></div>';
  fetch('aanbod.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('geen data'); return r.json(); })
    .then(function (data) {
      var items = (data && Array.isArray(data.projecten)) ? data.projecten : [];
      grid.innerHTML = items.length ? items.map(function (pr, i) {
        var mapsQ = encodeURIComponent((pr.adres || '') + ', ' + (pr.plaats || 'Rotterdam'));
        var refLabel = escHtml((pr.id || '') + ' — ' + (pr.titel || pr.adres || ''));
        var laatste = (pr.updates && pr.updates[0]) ? pr.updates[0] : null;
        var inv = pr.investering;
        var invHtml = '';
        if (inv) {
          var invPct = inv.doelbedrag ? Math.min(100, Math.round((inv.opgehaald || 0) / inv.doelbedrag * 100)) : 0;
          invHtml = '<div class="invest-box">' +
            '<div class="ib-title">Open voor investeerders</div>' +
            '<div class="pw-wrap"><div class="pw-bar" style="width:' + invPct + '%"></div></div>' +
            '<div class="ib-row"><span>' + escHtml('€ ' + (Number(inv.opgehaald) || 0).toLocaleString('nl-NL') + ' opgehaald van € ' + (Number(inv.doelbedrag) || 0).toLocaleString('nl-NL')) + '</span><span>' + invPct + '%</span></div>' +
            '<div class="ib-row"><span>Min. inleg € ' + (Number(inv.minInleg) || 0).toLocaleString('nl-NL') + '</span><span>' + escHtml(String(inv.rendementPct || 0)).replace('.', ',') + '% verwacht/jr · ' + escHtml(inv.looptijd || '') + '</span></div>' +
            '<button class="pillar-cta" data-open-modal data-subject="Investeren in een project" data-ref="' + refLabel + '">Ik wil meedoen →</button>' +
            '</div>';
        }
        var prFotos = Array.isArray(pr.fotos) ? pr.fotos : [];
        var prVisual = prFotos.length
          ? '<div class="card-visual"><img class="card-foto" loading="lazy" onerror="this.style.display=&quot;none&quot;" src="' + escHtml(prFotos[0]) + '" alt="' + escHtml(pr.adres) + '"></div>'
          : mapsKnop(mapsQ, escHtml(pr.adres));
        return '<article class="blog-card rv in ' + (i === 1 ? 'd1' : i === 2 ? 'd2' : '') + '">' +
          prVisual +
          '<div class="blog-body">' +
          '<div class="proj-status">' + escHtml(pr.status || 'In ontwikkeling') + '</div>' +
          '<h3>' + escHtml(pr.titel || pr.adres) + '</h3>' +
          '<p class="aanbod-kenmerken">' + [escHtml(pr.adres), escHtml(pr.plaats), escHtml(pr.type)].filter(Boolean).join(' · ') + '</p>' +
          '<div class="pw-wrap"><div class="pw-bar" style="width:' + (Number(pr.voortgang) || 0) + '%"></div></div>' +
          '<p class="aanbod-kenmerken">' + (Number(pr.voortgang) || 0) + '% gereed' + (pr.oplevering ? ' · oplevering ' + fmtDatumNl(pr.oplevering) : '') + '</p>' +
          '<p>' + escHtml(pr.omschrijving || '') + '</p>' +
          (laatste ? '<p class="upd"><strong>Update ' + fmtDatumNl(laatste.datum) + ':</strong> ' + escHtml(laatste.tekst) + '</p>' : '') +
          invHtml +
          '<button class="pillar-cta" data-open-modal data-subject="Project volgen" data-ref="' + refLabel + '">Volg dit project →</button> ' +
          '<a class="pillar-cta" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '">Bekijk op Google Maps →</a>' +
          '</div></article>';
      }).join('') : leeg;
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
  var prijs = '€ ' + (Number(w.prijs) || 0).toLocaleString('nl-NL') + ' k.k.';
  var rows = [
    ['Vraagprijs', prijs],
    ['Status', w.status || 'Te koop'],
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
            return '<img class="wd-thumb' + (i === 0 ? ' on' : '') + '" onerror="this.style.display=&quot;none&quot;" data-src="' + escHtml(f) + '" src="' + escHtml(f) + '" alt="Foto ' + (i + 1) + '">';
          }).join('') + '</div>' : '') + '</div>'
        : '') +
      '<div class="wd-body">' +
        '<div class="proj-status">' + escHtml(w.status || 'Te koop') + '</div>' +
        '<h3 class="wd-titel">' + escHtml(w.adres) + ', ' + escHtml(w.plaats || 'Rotterdam') + '</h3>' +
        '<div class="wd-prijs">' + prijs + '</div>' +
        '<div class="wd-kenmerken">' + rows.map(function (r) {
          return '<div class="wd-row"><span>' + escHtml(r[0]) + '</span><strong>' + escHtml(String(r[1])) + '</strong></div>';
        }).join('') + '</div>' +
        (w.omschrijving ? '<p class="wd-tekst">' + escHtml(w.omschrijving) + '</p>' : '') +
        '<div class="wd-acties">' +
          '<button class="btn btn-primary" data-open-modal data-subject="Woningaanbod ontvangen" data-ref="' + escHtml((w.id || '') + ' — ' + (w.adres || '')) + '" data-wd-close>Plan een bezichtiging <span class="arr">→</span></button>' +
          '<a class="btn btn-outline-dark" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '">Route & omgeving</a>' +
        '</div>' +
        '<div class="wd-map-wrap">' + mapsKnop(mapsQ, escHtml(w.adres)).replace('class="map-load"', 'class="map-load" data-hoogte="wd"') + '</div>' +
      '</div>' +
    '</div>';
  box.classList.add('on');
  box.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  box.scrollTop = 0;
}

function closeWoningDetail() {
  var box = document.getElementById('woning-detail');
  if (!box) return;
  box.classList.remove('on');
  box.setAttribute('aria-hidden', 'true');
  if (!(modalEl && modalEl.classList.contains('on'))) document.body.classList.remove('no-scroll');
}

document.addEventListener('click', function (e) {
  if (!e.target) return;
  var open = e.target.closest ? e.target.closest('[data-woning]') : null;
  if (open) { openWoningDetail(aanbodCache[Number(open.getAttribute('data-woning'))]); return; }
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
  if (e.key === 'Escape') closeWoningDetail();
});

/* ===== Bedrijfsgegevens (footer) — vul in en publiceer ===== */
var BEDRIJF = {
  naam: '',   // bijv. 'HomeINN B.V.'
  kvk: '',    // bijv. '12345678'
  btw: '',    // bijv. 'NL123456789B01'
  adres: ''   // bijv. 'Straatnaam 1, 3011 AA Rotterdam'
};
document.addEventListener('DOMContentLoaded', function () {
  var el = document.getElementById('f-legal');
  if (!el) return;
  var delen = [];
  if (BEDRIJF.naam) delen.push(BEDRIJF.naam);
  if (BEDRIJF.adres) delen.push(BEDRIJF.adres);
  if (BEDRIJF.kvk) delen.push('KvK ' + BEDRIJF.kvk);
  if (BEDRIJF.btw) delen.push('Btw ' + BEDRIJF.btw);
  if (delen.length) { el.textContent = delen.join(' · '); el.style.display = 'block'; }
});
