/* HomeINN — Verkopersportaal. Wie zijn pand aan HomeINN aanbiedt, volgt hier het dossier
   en het voorstel/bod van HomeINN (RLS: leest alleen eigen deals op e-mail). */
(function () {
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';
  var app = document.getElementById('app'), who = document.getElementById('who'), toastEl = document.getElementById('toast');
  var client = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '€ ' + (Math.round(Number(n) || 0)).toLocaleString('nl-NL'); }
  function fdate(d) { if (!d) return '—'; var p = String(d).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : d; }
  var tt = null; function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('show'); }, 4200); }

  var STAGES = ['Lead', 'Bezichtiging', 'Bod uitgebracht', 'Onder voorbehoud', 'Notaris'];

  function renderLogin(sent) {
    who.innerHTML = '';
    app.innerHTML = '<div class="card login-card"><p class="eyebrow">Verkopersportaal</p><h1>Inloggen</h1>' +
      (sent ? '<p class="muted">We hebben je een inloglink gemaild. Open die link op dit apparaat.</p>'
        : '<p class="muted">Vul het e-mailadres in dat je bij HomeINN hebt gebruikt — je ontvangt een beveiligde inloglink.</p>' +
          '<form id="login-form"><label for="email">E-mailadres</label><input id="email" type="email" required placeholder="jouw@email.nl" autocomplete="email"><button class="btn primary" type="submit" style="margin-top:16px;width:100%">Stuur inloglink</button></form>') +
      '</div><p class="foot">© HomeINN · Rotterdam — <a href="homeinn-public.html">terug naar de website</a></p>';
    var f = document.getElementById('login-form');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault(); var email = document.getElementById('email').value.trim(); if (!email) return;
      client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } })
        .then(function (r) { if (r.error) throw r.error; renderLogin(true); }).catch(function (err) { toast('Inloggen mislukt: ' + (err.message || err)); });
    });
  }

  async function renderDashboard(user) {
    who.innerHTML = '<span>' + esc(user.email) + '</span><button class="btn ghost slim" id="logout">Uitloggen</button>';
    document.getElementById('logout').addEventListener('click', function () { client.auth.signOut(); });
    app.innerHTML = '<div class="card"><p class="muted"><span class="hi-spin"></span>Je dossier wordt geladen…</p></div>';

    var r = await client.from('hios_deals').select('*').order('created_at', { ascending: false });
    if (r.error) { app.innerHTML = '<div class="card"><p class="empty">Kon je dossier niet laden: ' + esc(r.error.message) + '</p></div>'; return; }
    var deals = r.data || [];
    if (!deals.length) {
      app.innerHTML = '<div class="card"><p class="eyebrow">Welkom</p><h1>Nog geen dossier</h1><p class="muted">Aan dit account (' + esc(user.email) + ') is nog geen verkoopdossier gekoppeld. Zodra HomeINN je aanbod registreert met dit e-mailadres, verschijnt het hier. Vragen? Neem contact op met HomeINN.</p></div>';
      return;
    }
    var html = '<div class="card"><p class="eyebrow">Jouw aanbod aan HomeINN</p><h1>Welkom</h1><p class="muted">Hieronder volg je de status van je verkoopdossier en ons voorstel.</p></div>';
    deals.forEach(function (d) {
      var data = d.data || {};
      var idx = STAGES.indexOf(d.status);
      var biedingen = (data.biedingen || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      var laatsteBod = biedingen.find(function (b) { return b.status === 'Uitgebracht' || b.status === 'Geaccepteerd'; }) || biedingen[0];
      html += '<div class="card"><p class="eyebrow">' + esc(d.ref || '') + '</p><h2>' + esc(d.address || '') + (d.city ? ', ' + esc(d.city) : '') + '</h2>' +
        '<div class="steps">' + STAGES.map(function (s, i) { return '<div class="step ' + (i < idx ? 'done' : i === idx ? 'active' : '') + '">' + esc(s) + '</div>'; }).join('') + '</div>' +
        '<table><tbody>' +
        '<tr><td class="muted">Status</td><td><span class="badge">' + esc(d.status || '') + '</span></td></tr>' +
        (d.vraagprijs ? '<tr><td class="muted">Vraagprijs</td><td>' + money(d.vraagprijs) + '</td></tr>' : '') +
        (laatsteBod ? '<tr><td class="muted">Voorstel HomeINN</td><td><strong>' + money(laatsteBod.amount) + '</strong> (' + fdate(laatsteBod.date) + ')' + (laatsteBod.note ? ' · ' + esc(laatsteBod.note) : '') + '</td></tr>' : '<tr><td class="muted">Voorstel HomeINN</td><td class="muted">nog geen bod uitgebracht</td></tr>') +
        '</tbody></table>' +
        '<p class="muted" style="font-size:.82rem;margin-top:12px">Vragen over dit voorstel? Neem contact op met HomeINN — we helpen je graag.</p></div>';
    });
    html += '<p class="foot">Aan dit overzicht kunnen geen rechten worden ontleend. © HomeINN · Rotterdam</p>';
    app.innerHTML = html;
  }

  async function boot() {
    if (!client) { app.innerHTML = '<div class="card login-card"><p class="muted">Niet beschikbaar.</p></div>'; return; }
    var res = await client.auth.getUser(); var user = res && res.data ? res.data.user : null;
    if (user) renderDashboard(user); else renderLogin(false);
  }
  if (client) client.auth.onAuthStateChange(function () { boot(); });
  boot();
})();
