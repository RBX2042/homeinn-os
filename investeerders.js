/* HomeINN — Investeerdersportaal.
   Logt in met magic-link en toont, via de RLS in de database, ALLEEN de eigen gegevens
   van de ingelogde investeerder (inleg, rendement, uitkeringen, projectupdates, documenten). */
(function () {
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';

  var app = document.getElementById('app');
  var who = document.getElementById('who');
  var toastEl = document.getElementById('toast');
  var client = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '€ ' + (Math.round(Number(n) || 0)).toLocaleString('nl-NL'); }
  function fdate(d) { if (!d) return '—'; var p = String(d).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : d; }
  var toastTimer = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 4200); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function days(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }

  /* Netto IRR op datumcashflows (Newton-Raphson + bisectie-fallback). Geeft % per jaar of null. */
  function xirr(flows) {
    var f = (flows || []).filter(function (x) { return x && x.date && isFinite(Number(x.amount)) && Number(x.amount) !== 0; })
      .map(function (x) { return { date: String(x.date).slice(0, 10), amount: Number(x.amount) }; });
    if (f.length < 2) return null;
    if (!f.some(function (x) { return x.amount < 0; }) || !f.some(function (x) { return x.amount > 0; })) return null;
    var t0 = f.reduce(function (m, x) { return x.date < m ? x.date : m; }, f[0].date);
    var pts = f.map(function (x) { return { t: days(t0, x.date) / 365, a: x.amount }; });
    function npv(r) { return pts.reduce(function (s, x) { return s + x.a / Math.pow(1 + r, x.t); }, 0); }
    function dnpv(r) { return pts.reduce(function (s, x) { return s - x.t * x.a / Math.pow(1 + r, x.t + 1); }, 0); }
    var rate = 0.1, i;
    for (i = 0; i < 60; i++) {
      var v = npv(rate), d = dnpv(rate);
      if (!isFinite(v) || !isFinite(d) || d === 0) break;
      var nx = rate - v / d;
      if (!isFinite(nx)) break;
      if (Math.abs(nx - rate) < 1e-7) { rate = nx; break; }
      rate = Math.max(-0.9999, nx);
    }
    if (isFinite(rate) && rate > -0.9999 && Math.abs(npv(rate)) < 1) return rate * 100;
    var lo = -0.99, hi = 10, flo = npv(lo), fhi = npv(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2, fm = npv(mid);
      if (!isFinite(fm)) return null;
      if (Math.abs(fm) < 1e-6 || (hi - lo) < 1e-8) return mid * 100;
      if (flo * fm < 0) { hi = mid; } else { lo = mid; flo = fm; }
    }
    return ((lo + hi) / 2) * 100;
  }
  function pct(v, dec) { return (v === null || v === undefined || !isFinite(v)) ? '—' : (Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: dec == null ? 1 : dec }) + '%'); }

  /* Pure inline-SVG cashflow-tijdlijn voor het portaal. flows: [{date,amount,nav?}]. */
  function cfTimeline(flows) {
    var data = (flows || []).filter(function (f) { return f && isFinite(Number(f.amount)); })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (data.length < 2) return '<p class="empty">Nog te weinig cashflows voor een tijdlijn.</p>';
    var W = 760, H = 240, padL = 50, padR = 14, padT = 18, padB = 30;
    var innerW = W - padL - padR, innerH = H - padT - padB, zeroY = padT + innerH / 2;
    var maxAbs = Math.max.apply(null, data.map(function (f) { return Math.abs(Number(f.amount)); }).concat([1]));
    var cum = 0, cums = data.map(function (f) { return (cum += Number(f.amount)); });
    var cumMax = Math.max.apply(null, cums.map(function (c) { return Math.abs(c); }).concat([maxAbs, 1]));
    var n = data.length, slot = innerW / n, barW = Math.max(6, Math.min(40, slot * 0.45));
    function x(i) { return padL + slot * (i + 0.5); }
    function barH(v) { return Math.abs(v) / maxAbs * (innerH / 2 - 4); }
    function cumY(v) { return zeroY - (v / cumMax) * (innerH / 2 - 4); }
    var bars = data.map(function (f, i) {
      var v = Number(f.amount), h = barH(v), cx = x(i);
      var y = v < 0 ? zeroY : zeroY - h;
      var fill = f.nav ? '#3a6ea5' : v < 0 ? '#b03a3a' : '#1e6a42';
      return '<rect x="' + (cx - barW / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" rx="2" fill="' + fill + '"><title>' + esc(fdate(f.date)) + ': ' + esc(money(v)) + (f.nav ? ' (huidige waarde)' : '') + '</title></rect>';
    }).join('');
    var linePts = cums.map(function (c, i) { return x(i).toFixed(1) + ',' + cumY(c).toFixed(1); }).join(' ');
    var dots = cums.map(function (c, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + cumY(c).toFixed(1) + '" r="3" fill="#3a6ea5"><title>Cumulatief ' + esc(fdate(data[i].date)) + ': ' + esc(money(c)) + '</title></circle>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img" aria-label="Cashflow-tijdlijn">' +
      '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '" stroke="rgba(12,11,9,.18)" stroke-width="1"/>' +
      '<text x="6" y="' + (padT + 8) + '" style="font-size:11px;fill:#6f756f">+</text>' +
      '<text x="6" y="' + (H - padB) + '" style="font-size:11px;fill:#6f756f">−</text>' +
      bars + '<polyline points="' + linePts + '" fill="none" stroke="#3a6ea5" stroke-width="2"/>' + dots + '</svg>' +
      '<p style="display:flex;gap:16px;flex-wrap:wrap;font-size:.76rem;color:var(--muted);margin:8px 0 0">' +
      legendDot('#b03a3a') + 'Inleg' + legendDot('#1e6a42') + 'Uitkering' + legendDot('#3a6ea5') + 'Cumulatief / huidige waarde</p>';
  }
  function legendDot(c) { return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle;background:' + c + '"></span>'; }

  function printContractDoc(html) {
    var w = window.open('', '_blank');
    if (!w) { toast('Sta pop-ups toe om te downloaden/printen.'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>HomeINN contract</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:800px;margin:24px auto;padding:0 18px;line-height:1.5}h1{font-size:20px;color:#0b1e30}h2{font-size:14px;color:#0b1e30;margin:14px 0 4px}img{max-width:140px;height:auto}table{width:100%;border-collapse:collapse}.doc-sign{display:flex;gap:40px;margin-top:34px}.doc-sign>div{flex:1}.doc-sign .line{border-top:1px solid #555;margin-top:42px;padding-top:4px;color:#666;font-size:12px}</style></head><body>' + html + '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print();},150);}</scr' + 'ipt></body></html>');
    w.document.close();
  }

  function renderUnavailable() {
    who.innerHTML = '';
    app.innerHTML = '<div class="card login-card"><p class="eyebrow">Even niet bereikbaar</p><h1>Portaal niet beschikbaar</h1><p class="muted">Er kon geen verbinding met de server worden gemaakt. Probeer het later opnieuw of neem contact op met HomeINN.</p></div>';
  }

  function renderLogin(sent) {
    who.innerHTML = '';
    app.innerHTML =
      '<div class="card login-card">' +
        '<p class="eyebrow">Investeerdersportaal</p>' +
        '<h1>Inloggen</h1>' +
        (sent
          ? '<p class="muted">We hebben je een inloglink gemaild. Open die link op dit apparaat om in te loggen. Geen mail? Controleer je spam of probeer het opnieuw.</p>'
          : '<p class="muted">Vul je e-mailadres in — je ontvangt een beveiligde inloglink (geen wachtwoord). Gebruik het adres dat bij HomeINN bekend is.</p>' +
            '<form id="login-form"><label for="email">E-mailadres</label>' +
            '<input id="email" type="email" required placeholder="jouw@email.nl" autocomplete="email">' +
            '<button class="btn primary" type="submit" style="margin-top:16px;width:100%">Stuur inloglink</button></form>') +
      '</div>' +
      '<p class="foot">© HomeINN · Rotterdam — <a href="homeinn-public.html">terug naar de website</a></p>';
    var form = document.getElementById('login-form');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      if (!email) return;
      client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } })
        .then(function (r) { if (r.error) throw r.error; renderLogin(true); })
        .catch(function (err) { toast('Inloggen mislukt: ' + (err.message || err)); });
    });
  }

  async function renderDashboard(user) {
    who.innerHTML = '<span>' + esc(user.email) + '</span><button class="btn ghost slim" id="logout">Uitloggen</button>';
    document.getElementById('logout').addEventListener('click', function () { client.auth.signOut(); });

    app.innerHTML = '<div class="card"><p class="muted">Je gegevens worden geladen…</p></div>';

    // RLS zorgt dat we uitsluitend de EIGEN rijen terugkrijgen.
    var invRes = await client.from('hios_investors')
      .select('id, naam, bedrag, rendement_pct, datum, wwft, project:hios_projects(id, name, ref, status, data)')
      .order('datum', { ascending: false });
    if (invRes.error) { app.innerHTML = '<div class="card"><p class="empty">Kon je gegevens niet laden: ' + esc(invRes.error.message) + '</p></div>'; return; }
    var investments = invRes.data || [];

    var payRes = await client.from('hios_investor_payouts').select('*').order('date', { ascending: false });
    var payouts = (payRes && payRes.data) || [];
    var updRes = await client.from('hios_project_updates').select('*').order('date', { ascending: false });
    var updates = (updRes && updRes.data) || [];
    var docRes = await client.from('hios_documents').select('*');
    var documents = (docRes && docRes.data) || [];
    var contRes = await client.from('hios_contracts').select('*').eq('type', 'Investeringsovereenkomst').order('created_at', { ascending: false });
    var contracts = (contRes && contRes.data) || [];
    var contractsHtml = contractsSection(contracts);

    if (!investments.length) {
      app.innerHTML =
        '<div class="card"><p class="eyebrow">Welkom</p><h1>' + (contracts.length ? 'Je documenten' : 'Nog geen investeringen') + '</h1>' +
        '<p class="muted">' + (contracts.length ? 'Hieronder vind je je contract(en) ter ondertekening.' : 'Aan dit account zijn nog geen investeringen gekoppeld. Zodra HomeINN je inleg registreert met dit e-mailadres (' + esc(user.email) + ') verschijnt die hier automatisch.') + '</p></div>' +
        contractsHtml;
      return;
    }

    var totaalInleg = investments.reduce(function (s, i) { return s + (Number(i.bedrag) || 0); }, 0);
    var verwachtRendement = investments.reduce(function (s, i) { return s + (Number(i.bedrag) || 0) * (Number(i.rendement_pct) || 0) / 100; }, 0);
    var uitbetaald = payouts.filter(function (p) { return p.status === 'Uitbetaald'; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);

    // Netto IRR & multiple over alle eigen investeringen: inleg negatief, uitkeringen positief,
    // huidige waarde (lopende inleg) als slotbedrag vandaag.
    var cf = [];
    investments.forEach(function (i) { if (Number(i.bedrag)) cf.push({ date: i.datum, amount: -(Number(i.bedrag) || 0) }); });
    payouts.filter(function (p) { return p.status === 'Uitbetaald' && Number(p.amount); }).forEach(function (p) { cf.push({ date: p.date, amount: Number(p.amount) || 0 }); });
    var navTotal = investments.reduce(function (s, i) { var st = (i.project && i.project.status) || ''; return s + (st === 'Afgerond' ? 0 : (Number(i.bedrag) || 0)); }, 0);
    var flowsChart = cf.slice();
    if (navTotal > 0) flowsChart.push({ date: todayISO(), amount: navTotal, nav: true });
    var myIrr = xirr(flowsChart);
    var myMoic = totaalInleg ? (uitbetaald + navTotal) / totaalInleg : null;

    var html =
      '<div class="kpis">' +
        kpi('Totaal ingelegd', money(totaalInleg)) +
        kpi('Mijn netto IRR', pct(myIrr, 1)) +
        kpi('Multiple (MOIC)', myMoic === null || !isFinite(myMoic) ? '—' : (Number(myMoic).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '×')) +
        kpi('Reeds uitbetaald', money(uitbetaald)) +
        kpi('Verwacht rendement / jaar', money(verwachtRendement)) +
        kpi('Projecten', String(investments.length)) +
      '</div>' +
      (cf.length >= 1 ? '<div class="card"><h2>Mijn cashflow in de tijd</h2><p class="muted" style="font-size:.82rem;margin:0 0 12px">Je netto rendement (IRR) over alle inleg samen is <strong>' + pct(myIrr, 1) + '</strong>. Rode balken zijn je inleg, groene de uitkeringen, de blauwe lijn het cumulatieve saldo inclusief de huidige waarde van je lopende inleg.</p>' + cfTimeline(flowsChart) + '</div>' : '');

    investments.forEach(function (inv) {
      var proj = inv.project || {};
      var d = proj.data || {};
      var phases = d.phases || [];
      var voortgang = phases.length ? Math.round(phases.filter(function (f) { return f.status === 'Klaar'; }).length / phases.length * 100) : null;
      var projUpdates = updates.filter(function (u) { return u.project_id === proj.id; });
      var myPayouts = payouts.filter(function (p) {
        return investments.some(function (x) { return x.id === inv.id && x.id === p.investor_id; }) || p.investor_id === inv.id;
      });
      var projDocs = documents.filter(function (doc) { return (doc.scope === 'project' && doc.ref_id === proj.id) || (doc.scope === 'investor' && doc.ref_id === inv.id); });

      html +=
        '<div class="card">' +
          '<p class="eyebrow">' + esc(proj.ref || 'Project') + '</p>' +
          '<h2>' + esc(proj.name || 'Project') + ' <span class="badge gold">' + esc(proj.status || '') + '</span></h2>' +
          (voortgang !== null ? '<div class="progress"><i style="width:' + voortgang + '%"></i></div><p class="muted" style="font-size:.8rem;margin:0 0 12px">Voortgang: ' + voortgang + '%</p>' : '') +
          '<table style="margin-bottom:8px"><tbody>' +
            row('Mijn inleg', '<strong>' + money(inv.bedrag) + '</strong>') +
            row('Afgesproken rendement', (Number(inv.rendement_pct) || 0).toLocaleString('nl-NL') + '% per jaar') +
            row('Ingestapt op', fdate(inv.datum)) +
            row('Identiteitscontrole (Wwft)', inv.wwft ? '<span class="badge green">✔ Geverifieerd</span>' : '<span class="badge red">In behandeling</span>') +
          '</tbody></table>' +
          ((d.fotos && d.fotos.length) ? subblock('Foto\'s', '<div class="gallery">' + d.fotos.slice(0, 8).map(function (f) { return '<img src="' + esc(f) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'; }).join('') + '</div>') : '') +
          subblock('Projectupdates', projUpdates.length
            ? '<ul class="timeline">' + projUpdates.map(function (u) { return '<li><span class="date">' + fdate(u.date) + '</span><br>' + esc(u.text) + '</li>'; }).join('') + '</ul>'
            : '<p class="empty">Nog geen updates geplaatst.</p>') +
          (myPayouts.length ? subblock('Uitkeringen',
            '<table><thead><tr><th>Datum</th><th>Soort</th><th>Bedrag</th><th>Status</th></tr></thead><tbody>' +
            myPayouts.map(function (p) { return '<tr><td>' + fdate(p.date) + '</td><td>' + esc(p.kind) + '</td><td>' + money(p.amount) + '</td><td>' + (p.status === 'Uitbetaald' ? '<span class="badge green">Uitbetaald</span>' : '<span class="badge">Gepland</span>') + '</td></tr>'; }).join('') +
            '</tbody></table>') : '') +
          (projDocs.length ? subblock('Documenten',
            '<ul class="timeline">' + projDocs.map(function (doc) { return '<li><a href="' + esc(doc.url || doc.file) + '" download="' + esc(doc.name || 'document') + '" target="_blank" rel="noopener">' + esc(doc.name || 'Document') + ' ↗</a></li>'; }).join('') + '</ul>') : '') +
        '</div>';
    });

    html += contractsHtml;
    html += '<p class="foot">Bedragen zijn indicatief. Aan dit overzicht kunnen geen rechten worden ontleend. © HomeINN · Rotterdam</p>';
    app.innerHTML = html;
  }

  function contractsSection(contracts) {
    if (!contracts || !contracts.length) return '';
    return contracts.map(function (c) {
      var signed = c.status === 'Getekend';
      return '<div class="card">' +
        '<p class="eyebrow">' + esc(c.type || 'Contract') + (c.ref ? ' · ' + esc(c.ref) : '') + '</p>' +
        '<h2>Ter ondertekening</h2>' +
        '<div class="contract-doc">' + (c.body_html || '<p class="muted">Geen inhoud.</p>') + '</div>' +
        '<button class="printbtn" type="button" style="margin:8px 0;background:transparent;border:1px solid var(--line);border-radius:9px;padding:9px 15px;font:inherit;font-weight:700;color:var(--navy);cursor:pointer">Download / print</button>' +
        (signed
          ? '<p class="muted">✔ Digitaal ondertekend op ' + fdate(c.signed_at) + (c.signed_name ? ' door ' + esc(c.signed_name) : '') + '.</p>'
          : '<label>Volledige naam (geldt als digitale handtekening)</label>' +
            '<input type="text" class="signname" placeholder="Voor- en achternaam">' +
            '<button class="btn primary signbtn" data-id="' + esc(c.id) + '" style="margin-top:10px">Akkoord &amp; digitaal ondertekenen</button>') +
        '</div>';
    }).join('');
  }

  // Contract downloaden/printen (gedelegeerd)
  app.addEventListener('click', function (e) {
    var pb = e.target.closest ? e.target.closest('.printbtn') : null;
    if (!pb) return;
    var card = pb.closest('.card'); var doc = card ? card.querySelector('.contract-doc') : null;
    if (doc) printContractDoc(doc.innerHTML);
  });

  // Ondertekenen (gedelegeerd, één keer)
  app.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.signbtn') : null;
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    var nameInput = btn.parentElement.querySelector('.signname');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) { toast('Vul je volledige naam in om te ondertekenen.'); return; }
    btn.disabled = true;
    client.rpc('hios_sign_contract', { p_id: id, p_name: name }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data === true) { toast('Ondertekend — bedankt!'); boot(); }
      else { toast('Ondertekenen lukte niet (al getekend of niet voor jou bestemd).'); btn.disabled = false; }
    }).catch(function (err) { toast('Fout bij ondertekenen: ' + (err.message || err)); btn.disabled = false; });
  });

  function kpi(label, val) { return '<div class="kpi"><span>' + esc(label) + '</span><strong>' + val + '</strong></div>'; }
  function row(label, val) { return '<tr><td class="muted">' + esc(label) + '</td><td>' + val + '</td></tr>'; }
  function subblock(title, inner) { return '<h2 style="font-size:.95rem;margin:18px 0 8px">' + esc(title) + '</h2>' + inner; }

  async function boot() {
    if (!client) { renderUnavailable(); return; }
    var res = await client.auth.getUser();
    var user = res && res.data ? res.data.user : null;
    if (user) renderDashboard(user); else renderLogin(false);
  }

  if (client) client.auth.onAuthStateChange(function () { boot(); });
  boot();
})();
