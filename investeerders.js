/* HomeINN — Portaal voor geldgevers.
   Logt in met magic-link en toont, via de RLS in de database, ALLEEN de eigen gegevens
   van de ingelogde geldgever: hoofdsom, rentebetalingen, vervaldatum, projectupdates en documenten.
   Een lening aan HomeINN B.V. heeft een vaste, enkelvoudige rente vanaf de stortingsdatum; dit portaal
   toont daarom geen rendement, IRR, multiple of 'huidige waarde'. */
(function () {
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';
  var LENING_TYPE = 'Investeringsovereenkomst'; // opgeslagen type-sleutel (hios_contracts filtert erop)
  var LENING_TITEL = 'Overeenkomst van achtergestelde geldlening';

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
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayISO() { return iso(new Date()); }
  function addDaysISO(s, n) { var d = new Date(String(s).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function addMonthsISO(s, m) {
    var p = String(s).slice(0, 10).split('-').map(Number);
    var t = new Date(p[0], p[1] - 1 + m, 1, 12);
    var laatste = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(p[2], laatste));
    return iso(t);
  }
  function pctTekst(v) { return (Number(v) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%'; }

  /* '12 maanden' → 12, '1 jaar' → 12, '18 mnd' → 18; onleesbaar → null. */
  function looptijdMaanden(looptijd) {
    var m = String(looptijd || '').toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(maand|mnd|jaar|jr)/);
    if (!m) return null;
    var n = Number(m[1].replace(',', '.'));
    if (!(n > 0)) return null;
    return Math.round(m[2] === 'jaar' || m[2] === 'jr' ? n * 12 : n);
  }

  var SOORT = { rente: 'Rente', aflossing: 'Aflossing', overig: 'Overige betaling (archief)' };
  function soort(kind) { return SOORT[kind] || (kind ? String(kind) : '—'); }

  /* Stand van één lening: uitstaande hoofdsom, betaalde rente, volgende rentebetaling, vervaldatum. */
  function leningStand(inv, betalingen) {
    var proj = inv.project || {};
    var d = proj.data || {};
    var hoofdsom = Number(inv.bedrag) || 0;
    var betaald = betalingen.filter(function (p) { return p.status === 'Uitbetaald'; });
    var som = function (arr) { return arr.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0); };
    var renteBetaald = som(betaald.filter(function (p) { return p.kind === 'rente'; }));
    var afgelost = som(betaald.filter(function (p) { return p.kind === 'aflossing'; }));
    var uitstaand = Math.max(0, hoofdsom - afgelost);
    var storting = inv.datum ? String(inv.datum).slice(0, 10) : '';
    var looptijd = (d.invest && d.invest.looptijd) || '';
    var maanden = looptijdMaanden(looptijd);
    // Vervaldatum = laatste dag van de looptijd, gerekend vanaf de stortingsdatum.
    var vervaldatum = storting && maanden ? addDaysISO(addMonthsISO(storting, maanden), -1) : '';
    var volgendeRente = '';
    if (storting && uitstaand > 0) {
      var t = todayISO(), k = 1, verjaardag = addMonthsISO(storting, 12);
      while (verjaardag < t && k < 100) { k++; verjaardag = addMonthsISO(storting, 12 * k); }
      volgendeRente = vervaldatum && vervaldatum < verjaardag ? vervaldatum : verjaardag;
    }
    return { hoofdsom: hoofdsom, renteBetaald: renteBetaald, afgelost: afgelost, uitstaand: uitstaand, storting: storting, looptijd: looptijd, vervaldatum: vervaldatum, volgendeRente: volgendeRente };
  }

  function printContractDoc(html) {
    var w = window.open('', '_blank');
    if (!w) { toast('Sta pop-ups toe om te downloaden of te printen.'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>HomeINN B.V. — overeenkomst</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:800px;margin:24px auto;padding:0 18px;line-height:1.5}h1{font-size:20px;color:#0b1e30}h2{font-size:14px;color:#0b1e30;margin:14px 0 4px}img{max-width:140px;height:auto}table{width:100%;border-collapse:collapse}.doc-sign{display:flex;gap:40px;margin-top:34px}.doc-sign>div{flex:1}.doc-sign .line{border-top:1px solid #555;margin-top:42px;padding-top:4px;color:#666;font-size:12px}</style></head><body>' + html + '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print();},150);}</scr' + 'ipt></body></html>');
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
        '<p class="eyebrow">Portaal voor geldgevers</p>' +
        '<h1>Inloggen</h1>' +
        (sent
          ? '<p class="muted">Wij hebben u een inloglink gemaild. Open die link op dit apparaat om in te loggen. Geen e-mail ontvangen? Kijk in uw spammap of probeer het opnieuw.</p>'
          : '<p class="muted">Vul uw e-mailadres in; u ontvangt een beveiligde inloglink, geen wachtwoord. Gebruik het adres dat bij HomeINN bekend is.</p>' +
            '<form id="login-form"><label for="email">E-mailadres</label>' +
            '<input id="email" type="email" required placeholder="naam@voorbeeld.nl" autocomplete="email">' +
            '<button class="btn primary" type="submit" style="margin-top:16px;width:100%">Stuur inloglink</button></form>') +
      '</div>' +
      '<p class="foot">© HomeINN B.V. · Rotterdam — <a href="homeinn-public.html">terug naar de website</a></p>';
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

    app.innerHTML = '<div class="card"><p class="muted"><span class="hi-spin"></span>Uw gegevens worden geladen…</p></div>';

    // RLS zorgt dat we uitsluitend de EIGEN rijen terugkrijgen.
    var invRes = await client.from('hios_investors')
      .select('id, naam, bedrag, rendement_pct, datum, wwft, project:hios_projects(id, name, ref, status, data)')
      .order('datum', { ascending: false });
    if (invRes.error) { app.innerHTML = '<div class="card"><p class="empty">Kon uw gegevens niet laden: ' + esc(invRes.error.message) + '</p></div>'; return; }
    var leningen = invRes.data || [];

    var payRes = await client.from('hios_investor_payouts').select('*').order('date', { ascending: false });
    var betalingen = (payRes && payRes.data) || [];
    var updRes = await client.from('hios_project_updates').select('*').order('date', { ascending: false });
    var updates = (updRes && updRes.data) || [];
    var docRes = await client.from('hios_documents').select('*');
    var documents = (docRes && docRes.data) || [];
    var contRes = await client.from('hios_contracts').select('*').eq('type', LENING_TYPE).order('created_at', { ascending: false });
    var contracts = (contRes && contRes.data) || [];
    var contractsHtml = contractsSection(contracts);

    if (!leningen.length) {
      app.innerHTML =
        '<div class="card"><p class="eyebrow">Welkom</p><h1>' + (contracts.length ? 'Uw documenten' : 'Nog geen lening') + '</h1>' +
        '<p class="muted">' + (contracts.length ? 'Hieronder vindt u uw overeenkomst ter inzage.' : 'Aan dit account is nog geen lening gekoppeld. Zodra HomeINN B.V. uw lening registreert met dit e-mailadres (' + esc(user.email) + '), verschijnt die hier.') + '</p></div>' +
        contractsHtml;
      return;
    }

    var standen = leningen.map(function (inv) {
      var eigen = betalingen.filter(function (p) { return p.investor_id === inv.id; });
      return { inv: inv, betalingen: eigen, stand: leningStand(inv, eigen) };
    });
    var totUitstaand = standen.reduce(function (s, x) { return s + x.stand.uitstaand; }, 0);
    var totRente = standen.reduce(function (s, x) { return s + x.stand.renteBetaald; }, 0);
    var eerst = function (key) { return standen.map(function (x) { return x.stand[key]; }).filter(Boolean).sort()[0] || ''; };
    var volgendeRente = eerst('volgendeRente');
    var vervaldatum = standen.filter(function (x) { return x.stand.uitstaand > 0; }).map(function (x) { return x.stand.vervaldatum; }).filter(Boolean).sort()[0] || '';

    var html =
      '<div class="kpis">' +
        kpi('Uitstaande hoofdsom', money(totUitstaand)) +
        kpi('Rente betaald', money(totRente)) +
        kpi('Volgende rentebetaling', volgendeRente ? fdate(volgendeRente) : '—') +
        kpi(standen.length > 1 ? 'Eerstvolgende vervaldatum' : 'Vervaldatum', vervaldatum ? fdate(vervaldatum) : '—') +
        kpi(standen.length === 1 ? 'Lening' : 'Leningen', String(standen.length)) +
      '</div>';

    standen.forEach(function (x) {
      var inv = x.inv, st = x.stand;
      var proj = inv.project || {};
      var d = proj.data || {};
      var phases = d.phases || [];
      var voortgang = phases.length ? Math.round(phases.filter(function (f) { return f.status === 'Klaar'; }).length / phases.length * 100) : null;
      var projUpdates = updates.filter(function (u) { return u.project_id === proj.id; });
      var projDocs = documents.filter(function (doc) { return (doc.scope === 'project' && doc.ref_id === proj.id) || (doc.scope === 'investor' && doc.ref_id === inv.id); });

      html +=
        '<div class="card">' +
          '<p class="eyebrow">' + esc(proj.ref || 'Project') + '</p>' +
          '<h2>' + esc(proj.name || 'Project') + ' <span class="badge gold">' + esc(proj.status || '') + '</span></h2>' +
          (voortgang !== null ? '<div class="progress"><i style="width:' + voortgang + '%"></i></div><p class="muted" style="font-size:.8rem;margin:0 0 12px">Voortgang verbouwing: ' + voortgang + '%</p>' : '') +
          '<table style="margin-bottom:8px"><tbody>' +
            row('Hoofdsom', '<strong>' + money(st.hoofdsom) + '</strong>') +
            row('Vaste rente', pctTekst(inv.rendement_pct) + ' per jaar <span class="muted">· achtergesteld, niet gegarandeerd</span>') +
            row('Stortingsdatum', st.storting ? fdate(st.storting) : 'Nog niet ontvangen') +
            row('Looptijd', esc(st.looptijd || '—')) +
            row('Vervaldatum', st.vervaldatum ? fdate(st.vervaldatum) : '—') +
            row('Volgende rentebetaling', st.volgendeRente ? fdate(st.volgendeRente) : '—') +
            row('Uitstaande hoofdsom', money(st.uitstaand)) +
            row('Rente betaald', money(st.renteBetaald)) +
            row('Identificatie vóór storting', inv.wwft ? '<span class="badge green">✔ Bevestigd</span>' : '<span class="badge red">In behandeling</span>') +
          '</tbody></table>' +
          ((d.fotos && d.fotos.length) ? subblock('Foto\'s', '<div class="gallery">' + d.fotos.slice(0, 8).map(function (f) { return '<img src="' + esc(f) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'; }).join('') + '</div>') : '') +
          subblock('Projectupdates', projUpdates.length
            ? '<ul class="timeline">' + projUpdates.map(function (u) { return '<li><span class="date">' + fdate(u.date) + '</span><br>' + esc(u.text) + '</li>'; }).join('') + '</ul>'
            : '<p class="empty">Nog geen updates geplaatst.</p>') +
          (x.betalingen.length ? subblock('Rente en aflossing',
            '<table><thead><tr><th>Datum</th><th>Soort</th><th>Bedrag</th><th>Status</th></tr></thead><tbody>' +
            x.betalingen.map(function (p) { return '<tr><td>' + fdate(p.date) + '</td><td>' + esc(soort(p.kind)) + '</td><td>' + money(p.amount) + '</td><td>' + (p.status === 'Uitbetaald' ? '<span class="badge green">Betaald</span>' : '<span class="badge">Gepland</span>') + '</td></tr>'; }).join('') +
            '</tbody></table>') : '') +
          (projDocs.length ? subblock('Documenten',
            '<ul class="timeline">' + projDocs.map(function (doc) { return '<li><a href="' + esc(doc.url || doc.file) + '" download="' + esc(doc.name || 'document') + '" target="_blank" rel="noopener">' + esc(doc.name || 'Document') + ' ↗</a></li>'; }).join('') + '</ul>') : '') +
        '</div>';
    });

    html += contractsHtml;
    html += '<p class="foot">Dit overzicht toont de administratie van HomeINN B.V. bij uw lening. De vervaldatum en de volgende rentebetaling zijn berekend uit de stortingsdatum en de looptijd; de afspraken zelf staan in uw leningsovereenkomst. Klopt er iets niet? Laat het ons weten. © HomeINN B.V. · Rotterdam</p>';
    app.innerHTML = html;
  }

  /* Leningsovereenkomsten: ter inzage en om te downloaden. Ondertekening gaat met de hand of met een
     gekwalificeerde elektronische handtekening, buiten dit portaal; een getypte naam is geen handtekening. */
  function contractsSection(contracts) {
    if (!contracts || !contracts.length) return '';
    return contracts.map(function (c) {
      var signed = c.status === 'Getekend';
      var titel = c.type === LENING_TYPE ? LENING_TITEL : (c.type || 'Overeenkomst');
      return '<div class="card">' +
        '<p class="eyebrow">' + esc(titel) + (c.ref ? ' · ' + esc(c.ref) : '') + '</p>' +
        '<h2>' + (signed ? 'Ondertekend' : 'Ter inzage') + '</h2>' +
        '<div class="contract-doc">' + (c.body_html || '<p class="muted">Geen inhoud.</p>') + '</div>' +
        '<button class="printbtn" type="button" style="margin:8px 0;background:transparent;border:1px solid var(--line);border-radius:9px;padding:9px 15px;font:inherit;font-weight:700;color:var(--navy);cursor:pointer">Download / print</button>' +
        (signed
          ? '<p class="muted">✔ Ondertekend' + (c.signed_at ? ' op ' + fdate(c.signed_at) : '') + (c.signed_name ? ' door ' + esc(c.signed_name) : '') + '.</p>'
          : '<p class="muted">Deze overeenkomst tekent u met de hand of met een gekwalificeerde elektronische handtekening; wij sturen u de stukken.</p>') +
        '</div>';
    }).join('');
  }

  // Overeenkomst downloaden/printen (gedelegeerd)
  app.addEventListener('click', function (e) {
    var pb = e.target.closest ? e.target.closest('.printbtn') : null;
    if (!pb) return;
    var card = pb.closest('.card'); var doc = card ? card.querySelector('.contract-doc') : null;
    if (doc) printContractDoc(doc.innerHTML);
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
