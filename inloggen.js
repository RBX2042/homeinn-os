/* HomeINN — centrale login. Magic-link inloggen en daarna automatisch doorsturen
   naar het juiste portaal op basis van rol (eigenaar/team → beheerportaal,
   investeerder → investeerdersportaal, huurder → huurdersportaal). */
(function () {
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';
  var card = document.getElementById('card');
  var client = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brand() { return '<div class="brand"><img src="assets/logo-dark.png?v=20260613" alt="HomeINN"></div>'; }
  function go(url) { location.replace(url); }

  function renderUnavailable() {
    card.innerHTML = brand() + '<h1>Niet beschikbaar</h1><p class="intro">Er kon geen verbinding worden gemaakt. Probeer het later opnieuw.</p><a class="btn secondary" href="homeinn-public.html">Naar de website</a>';
  }

  function renderLogin(sent) {
    card.innerHTML = brand() +
      '<p class="eyebrow">HomeINN portaal</p><h1>Inloggen</h1>' +
      (sent
        ? '<p class="intro">We hebben je een inloglink gemaild. Open die link op dit apparaat om in te loggen.</p><div class="status" id="status"></div>'
        : '<p class="intro">Beheerders loggen in met e-mail + wachtwoord. Investeerders, huurders en kopers kunnen ook een inloglink gebruiken (laat het wachtwoord dan leeg).</p>' +
          '<form id="f"><label for="email">E-mailadres</label><input id="email" type="email" required placeholder="jouw@email.nl" autocomplete="email">' +
          '<label for="pw">Wachtwoord <span class="muted" style="font-weight:400">(optioneel)</span></label><input id="pw" type="password" placeholder="••••••••" autocomplete="current-password">' +
          '<button class="btn primary" type="submit">Inloggen</button>' +
          '<button class="btn secondary" type="button" id="magic">Stuur inloglink (zonder wachtwoord)</button></form><div class="status" id="status"></div>') +
      '<p class="foot"><a href="homeinn-public.html">← terug naar de website</a></p>';
    var f = document.getElementById('f');
    function fail(err) { var s = document.getElementById('status'); if (s) s.textContent = 'Inloggen mislukt: ' + (err.message || err); }
    function sendMagic() {
      var email = document.getElementById('email').value.trim();
      if (!email) { fail({ message: 'vul eerst je e-mailadres in' }); return; }
      client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } })
        .then(function (r) { if (r.error) throw r.error; renderLogin(true); }).catch(fail);
    }
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      var pw = document.getElementById('pw').value;
      if (!email) return;
      if (!pw) { sendMagic(); return; } // geen wachtwoord → inloglink
      document.getElementById('status').textContent = 'Bezig met inloggen…';
      client.auth.signInWithPassword({ email: email, password: pw })
        .then(function (r) { if (r.error) throw r.error; /* onAuthStateChange stuurt door */ })
        .catch(fail);
    });
    var mg = document.getElementById('magic');
    if (mg) mg.addEventListener('click', sendMagic);
  }

  function renderChooser(email, opts) {
    var buttons = '';
    if (opts.staff) buttons += '<a class="btn primary" href="portaal.html">Beheerportaal</a>';
    if (opts.investeerder) buttons += '<a class="btn ' + (buttons ? 'secondary' : 'primary') + '" href="investeerders.html">Investeerdersportaal</a>';
    if (opts.huurder) buttons += '<a class="btn ' + (buttons ? 'secondary' : 'primary') + '" href="huurders.html">Huurdersportaal</a>';
    if (opts.koper) buttons += '<a class="btn ' + (buttons ? 'secondary' : 'primary') + '" href="kopers.html">Kopersportaal</a>';
    if (opts.verkoper) buttons += '<a class="btn ' + (buttons ? 'secondary' : 'primary') + '" href="verkoper.html">Verkopersportaal</a>';
    if (!buttons) buttons = '<p class="intro">Aan dit account (' + esc(email) + ') is nog geen portaal gekoppeld. Neem contact op met HomeINN.</p>';
    card.innerHTML = brand() + '<p class="eyebrow">Welkom</p><h1>Kies je portaal</h1>' +
      '<p class="intro">Je bent ingelogd als ' + esc(email) + '.</p><div class="chooser">' + buttons + '</div>' +
      '<button class="btn secondary" id="logout" style="margin-top:18px">Uitloggen</button>';
    var lo = document.getElementById('logout');
    if (lo) lo.addEventListener('click', function () { client.auth.signOut().then(function () { renderLogin(false); }); });
  }

  async function routeAfterLogin(user) {
    card.innerHTML = brand() + '<p class="intro">Een moment — we sturen je door…</p>';
    // rol bepalen
    var prof = await client.from('hios_profiles').select('role').eq('id', user.id).maybeSingle();
    var role = (prof && prof.data) ? prof.data.role : null;
    var staff = role === 'eigenaar' || role === 'team';
    if (staff) { go('portaal.html'); return; }
    // anders: kijken of er investeringen, een huurwoning en/of een koopdossier aan hangen
    var inv = await client.from('hios_investors').select('id').limit(1);
    var hasInv = !!(inv && inv.data && inv.data.length);
    var ten = await client.rpc('hios_my_tenancy');
    var hasTen = !!(ten && ten.data && ten.data.length);
    var con = await client.from('hios_contracts').select('id').limit(1);
    var hasKoper = !!(con && con.data && con.data.length);
    var dls = await client.from('hios_deals').select('id').limit(1);
    var hasVerkoper = !!(dls && dls.data && dls.data.length);
    var count = (hasInv ? 1 : 0) + (hasTen ? 1 : 0) + (hasKoper ? 1 : 0) + (hasVerkoper ? 1 : 0);
    if (count === 1) {
      if (hasInv) { go('investeerders.html'); return; }
      if (hasTen) { go('huurders.html'); return; }
      if (hasKoper) { go('kopers.html'); return; }
      if (hasVerkoper) { go('verkoper.html'); return; }
    }
    renderChooser(user.email, { staff: false, investeerder: hasInv, huurder: hasTen, koper: hasKoper, verkoper: hasVerkoper });
  }

  async function boot() {
    if (!client) { renderUnavailable(); return; }
    var res = await client.auth.getUser();
    var user = res && res.data ? res.data.user : null;
    if (user) routeAfterLogin(user); else renderLogin(false);
  }

  if (client) client.auth.onAuthStateChange(function (_e, session) { if (session && session.user) routeAfterLogin(session.user); });
  boot();
})();
