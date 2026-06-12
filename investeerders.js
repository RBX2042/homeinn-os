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

    if (!investments.length) {
      app.innerHTML =
        '<div class="card"><p class="eyebrow">Welkom</p><h1>Nog geen investeringen</h1>' +
        '<p class="muted">Aan dit account zijn nog geen investeringen gekoppeld. Zodra HomeINN je inleg registreert met dit e-mailadres (' + esc(user.email) + ') verschijnt die hier automatisch. Vragen? Neem contact op met HomeINN.</p></div>';
      return;
    }

    var totaalInleg = investments.reduce(function (s, i) { return s + (Number(i.bedrag) || 0); }, 0);
    var verwachtRendement = investments.reduce(function (s, i) { return s + (Number(i.bedrag) || 0) * (Number(i.rendement_pct) || 0) / 100; }, 0);
    var uitbetaald = payouts.filter(function (p) { return p.status === 'Uitbetaald'; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);

    var html =
      '<div class="kpis">' +
        kpi('Totaal ingelegd', money(totaalInleg)) +
        kpi('Verwacht rendement / jaar', money(verwachtRendement)) +
        kpi('Reeds uitbetaald', money(uitbetaald)) +
        kpi('Projecten', String(investments.length)) +
      '</div>';

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
            '<ul class="timeline">' + projDocs.map(function (doc) { return '<li><a href="' + esc(doc.url) + '" target="_blank" rel="noopener">' + esc(doc.name || 'Document') + ' ↗</a></li>'; }).join('') + '</ul>') : '') +
        '</div>';
    });

    html += '<p class="foot">Bedragen zijn indicatief. Aan dit overzicht kunnen geen rechten worden ontleend. © HomeINN · Rotterdam</p>';
    app.innerHTML = html;
  }

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
