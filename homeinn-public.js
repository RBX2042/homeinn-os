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
  document.body.classList.remove('no-scroll');
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

/* ===== Software-integratie: formulieren → HomeINN OS (Aanvragen) ===== */
var INBOX_KEY = 'homeinn-inbox-v1';

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

function renderAanbod() {
  var grid = document.getElementById('aanbod-grid');
  var soldBox = document.getElementById('aanbod-verkocht');
  if (!grid) return;
  var leeg = '<div class="aanbod-leeg"><h3>Op dit moment is alles verkocht.</h3><p>Nieuwe woningen zijn in ontwikkeling. Laat uw gegevens achter via "Houd mij op de hoogte" en u hoort het als eerste.</p></div>';
  fetch('aanbod.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('geen aanbod.json'); return r.json(); })
    .then(function (data) {
      var items = (data && Array.isArray(data.aanbod)) ? data.aanbod : [];
      grid.innerHTML = items.length ? items.map(function (w, i) {
        var kenmerken = [escHtml(w.plaats), escHtml(w.type), w.m2 ? w.m2 + ' m²' : '', w.kamers ? w.kamers + ' kamers' : '', w.label ? 'Energielabel ' + escHtml(w.label) : '']
          .filter(Boolean).join(' · ');
        var mapsQ = encodeURIComponent((w.adres || '') + ', ' + (w.plaats || 'Rotterdam'));
        return '<article class="blog-card rv in ' + (i === 1 ? 'd1' : i === 2 ? 'd2' : '') + '">' +
          '<iframe class="card-map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + mapsQ + '&output=embed" title="Kaart ' + escHtml(w.adres) + '"></iframe><div class="blog-body">' +
          '<div class="proj-status' + (w.status === 'Onder bod' ? ' sold' : '') + '">' + escHtml(w.status || 'Te koop') + '</div>' +
          '<h3>' + escHtml(w.adres) + '</h3>' +
          '<p class="aanbod-kenmerken">' + kenmerken + '</p>' +
          '<div class="aanbod-prijs">' + fmtPrijs(w.prijs) + '</div>' +
          '<p>' + escHtml(w.omschrijving || '') + '</p>' +
          '<button class="pillar-cta" data-open-modal data-subject="Woningaanbod ontvangen" data-ref="' + escHtml(w.id || w.adres) + '">Plan een bezichtiging →</button> ' +
          '<a class="pillar-cta" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '">Route & omgeving →</a>' +
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
        return '<article class="blog-card rv in ' + (i === 1 ? 'd1' : i === 2 ? 'd2' : '') + '">' +
          '<iframe class="card-map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + mapsQ + '&output=embed" title="Kaart ' + escHtml(pr.adres) + '"></iframe>' +
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
