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
  var recoveryMode = false; // staat aan tijdens een wachtwoord-reset (niet doorsturen)

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brand() { return '<div class="brand"><img src="assets/logo-dark.png?v=20260614" alt="HomeINN"></div>'; }
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
          '<button class="btn secondary" type="button" id="magic">Stuur inloglink (zonder wachtwoord)</button></form>' +
          '<p class="foot" style="margin-top:8px"><a href="#" id="forgot">Wachtwoord vergeten of nog geen wachtwoord?</a></p><div class="status" id="status"></div>') +
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
    var fg = document.getElementById('forgot');
    if (fg) fg.addEventListener('click', function (e) {
      e.preventDefault();
      var em = document.getElementById('email');
      renderForgot(em ? em.value.trim() : '');
    });
  }

  // Stuurt een reset-link; daarmee kan de gebruiker (ook voor de eerste keer) een wachtwoord kiezen.
  function renderForgot(prefill) {
    card.innerHTML = brand() +
      '<p class="eyebrow">HomeINN portaal</p><h1>Wachtwoord instellen</h1>' +
      '<p class="intro">Vul je e-mailadres in — we sturen je een link waarmee je een (nieuw) wachtwoord kiest.</p>' +
      '<form id="ff"><label for="femail">E-mailadres</label>' +
      '<input id="femail" type="email" required placeholder="jouw@email.nl" autocomplete="email" value="' + esc(prefill || '') + '">' +
      '<button class="btn primary" type="submit">Stuur reset-link</button>' +
      '<button class="btn secondary" type="button" id="backlogin">Terug naar inloggen</button></form><div class="status" id="status"></div>';
    var ff = document.getElementById('ff');
    function fail(err) { var s = document.getElementById('status'); if (s) s.textContent = 'Mislukt: ' + (err.message || err); }
    if (ff) ff.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('femail').value.trim();
      if (!email) return;
      document.getElementById('status').textContent = 'Bezig…';
      client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
        .then(function (r) {
          if (r.error) throw r.error;
          card.innerHTML = brand() + '<p class="eyebrow">HomeINN portaal</p><h1>Check je e-mail</h1>' +
            '<p class="intro">Als er een account bestaat voor ' + esc(email) + ', is er een link verstuurd om je wachtwoord in te stellen. Open die link op dit apparaat.</p>' +
            '<p class="foot"><a href="#" id="backlogin2">← terug naar inloggen</a></p>';
          var b2 = document.getElementById('backlogin2');
          if (b2) b2.addEventListener('click', function (ev) { ev.preventDefault(); renderLogin(false); });
        }).catch(fail);
    });
    var bl = document.getElementById('backlogin');
    if (bl) bl.addEventListener('click', function () { renderLogin(false); });
  }

  // Wachtwoord kiezen na het openen van een reset-link (PASSWORD_RECOVERY-sessie).
  function renderSetPassword() {
    card.innerHTML = brand() +
      '<p class="eyebrow">HomeINN portaal</p><h1>Kies een wachtwoord</h1>' +
      '<p class="intro">Stel een wachtwoord in voor je account — hiermee log je voortaan in.</p>' +
      '<form id="sp"><label for="np">Nieuw wachtwoord</label>' +
      '<input id="np" type="password" required minlength="8" placeholder="minimaal 8 tekens" autocomplete="new-password">' +
      '<label for="np2">Herhaal wachtwoord</label>' +
      '<input id="np2" type="password" required minlength="8" autocomplete="new-password">' +
      '<button class="btn primary" type="submit">Wachtwoord opslaan</button></form><div class="status" id="status"></div>';
    var sp = document.getElementById('sp');
    function fail(err) { var s = document.getElementById('status'); if (s) s.textContent = 'Mislukt: ' + (err.message || err); }
    if (sp) sp.addEventListener('submit', function (e) {
      e.preventDefault();
      var p1 = document.getElementById('np').value, p2 = document.getElementById('np2').value;
      if (p1.length < 8) { fail({ message: 'gebruik minimaal 8 tekens' }); return; }
      if (p1 !== p2) { fail({ message: 'de wachtwoorden komen niet overeen' }); return; }
      document.getElementById('status').textContent = 'Opslaan…';
      client.auth.updateUser({ password: p1 })
        .then(function (r) {
          if (r.error) throw r.error;
          recoveryMode = false;
          card.innerHTML = brand() + '<p class="eyebrow">HomeINN portaal</p><h1>Gelukt</h1>' +
            '<p class="intro"><span class="hi-spin"></span>Wachtwoord ingesteld — je wordt doorgestuurd…</p>';
          return client.auth.getUser();
        })
        .then(function (res) { var u = res && res.data ? res.data.user : null; if (u) routeAfterLogin(u); else renderLogin(false); })
        .catch(fail);
    });
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
    card.innerHTML = brand() + '<p class="intro"><span class="hi-spin"></span>Een moment — we sturen je door…</p>';
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
    // alleen een échte koopovereenkomst maakt iemand een 'koper' — hios_contracts
    // bevat ook huur-/investerings-/aannemingsovereenkomsten op hetzelfde e-mailadres.
    var con = await client.from('hios_contracts').select('id').eq('type', 'Koopovereenkomst').limit(1);
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
    // Aankomst via een e-maillink (magic-link óf wachtwoord-reset): Supabase verwerkt de
    // link en vuurt onAuthStateChange (SIGNED_IN of PASSWORD_RECOVERY). Niet zelf routeren
    // — anders sturen we een reset-gebruiker door vóór hij een wachtwoord kan kiezen.
    if (/[?&#](code|access_token|type)=/.test(location.href)) {
      card.innerHTML = brand() + '<p class="intro"><span class="hi-spin"></span>Een moment…</p>';
      return;
    }
    var res = await client.auth.getUser();
    var user = res && res.data ? res.data.user : null;
    if (user) routeAfterLogin(user); else renderLogin(false);
  }

  if (client) client.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') { recoveryMode = true; renderSetPassword(); return; }
    if (recoveryMode) return; // blijf op het wachtwoord-scherm tot het is opgeslagen
    if (session && session.user) routeAfterLogin(session.user);
  });
  boot();
})();
