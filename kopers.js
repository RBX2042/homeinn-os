/* HomeINN — Kopersportaal. Magic-link login. Toont de koper z'n dossier (koopovereenkomst
   + status) en laat de koopovereenkomst digitaal ondertekenen (RLS-afgeschermd). */
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
    app.innerHTML = '<div class="card login-card"><p class="eyebrow">Even niet bereikbaar</p><h1>Portaal niet beschikbaar</h1><p class="muted">Er kon geen verbinding worden gemaakt. Probeer het later opnieuw.</p></div>';
  }

  function renderLogin(sent) {
    who.innerHTML = '';
    app.innerHTML =
      '<div class="card login-card"><p class="eyebrow">Kopersportaal</p><h1>Inloggen</h1>' +
      (sent
        ? '<p class="muted">We hebben je een inloglink gemaild. Open die link op dit apparaat om in te loggen.</p>'
        : '<p class="muted">Vul je e-mailadres in — je ontvangt een beveiligde inloglink (geen wachtwoord). Gebruik het adres dat bij HomeINN bekend is.</p>' +
          '<form id="login-form"><label for="email">E-mailadres</label>' +
          '<input id="email" type="email" required placeholder="jouw@email.nl" autocomplete="email">' +
          '<button class="btn primary" type="submit" style="margin-top:16px;width:100%">Stuur inloglink</button></form>') +
      '</div><p class="foot">© HomeINN · Rotterdam — <a href="homeinn-public.html">terug naar de website</a></p>';
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
    app.innerHTML = '<div class="card"><p class="muted">Je dossier wordt geladen…</p></div>';

    var cRes = await client.from('hios_contracts').select('*').eq('type', 'Koopovereenkomst').order('created_at', { ascending: false });
    if (cRes.error) { app.innerHTML = '<div class="card"><p class="empty">Kon je dossier niet laden: ' + esc(cRes.error.message) + '</p></div>'; return; }
    var contracts = cRes.data || [];

    if (!contracts.length) {
      app.innerHTML =
        '<div class="card"><p class="eyebrow">Welkom</p><h1>Nog geen dossier</h1>' +
        '<p class="muted">Aan dit account (' + esc(user.email) + ') is nog geen koopdossier gekoppeld. Zodra HomeINN je koopovereenkomst klaarzet, verschijnt die hier ter ondertekening. Vragen? Neem contact op met HomeINN.</p></div>';
      return;
    }

    var open = contracts.filter(function (c) { return c.status !== 'Getekend'; }).length;
    var html =
      '<div class="card"><p class="eyebrow">Jouw koopdossier</p><h1>Welkom bij HomeINN</h1>' +
      '<p class="muted">Hieronder vind je je overeenkomst(en). ' + (open ? open + ' wacht(en) op je digitale handtekening.' : 'Alles is ondertekend — bedankt!') + '</p></div>';

    html += contracts.map(function (c) {
      var signed = c.status === 'Getekend';
      return '<div class="card">' +
        '<p class="eyebrow">' + esc(c.type || 'Overeenkomst') + (c.ref ? ' · ' + esc(c.ref) : '') + '</p>' +
        '<h2>' + (c.amount ? 'Bedrag: ' + money(c.amount) + ' ' : '') + '<span class="badge ' + (signed ? 'green' : 'gold') + '">' + esc(c.status) + '</span></h2>' +
        '<div class="contract-doc">' + (c.body_html || '<p class="muted">Geen inhoud.</p>') + '</div>' +
        '<button class="printbtn" type="button" style="margin:8px 0;background:transparent;border:1px solid var(--line);border-radius:9px;padding:9px 15px;font:inherit;font-weight:700;color:var(--navy);cursor:pointer">Download / print</button>' +
        (signed
          ? '<p class="muted">✔ Digitaal ondertekend op ' + fdate(c.signed_at) + (c.signed_name ? ' door ' + esc(c.signed_name) : '') + '.</p>'
          : '<label>Volledige naam (geldt als digitale handtekening)</label>' +
            '<input type="text" class="signname" placeholder="Voor- en achternaam">' +
            '<button class="btn primary signbtn" data-id="' + esc(c.id) + '" style="margin-top:10px">Akkoord &amp; digitaal ondertekenen</button>') +
        '</div>';
    }).join('');

    html += '<p class="foot">Aan dit overzicht kunnen geen rechten worden ontleend. © HomeINN · Rotterdam</p>';
    app.innerHTML = html;
  }

  function printContractDoc(html) {
    var w = window.open('', '_blank');
    if (!w) { toast('Sta pop-ups toe om te downloaden/printen.'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>HomeINN contract</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:800px;margin:24px auto;padding:0 18px;line-height:1.5}h1{font-size:20px;color:#0b1e30}h2{font-size:14px;color:#0b1e30;margin:14px 0 4px}img{max-width:140px;height:auto}table{width:100%;border-collapse:collapse}.doc-sign{display:flex;gap:40px;margin-top:34px}.doc-sign>div{flex:1}.doc-sign .line{border-top:1px solid #555;margin-top:42px;padding-top:4px;color:#666;font-size:12px}</style></head><body>' + html + '<scr' + 'ipt>window.onload=function(){setTimeout(function(){window.print();},150);}</scr' + 'ipt></body></html>');
    w.document.close();
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

  async function boot() {
    if (!client) { renderUnavailable(); return; }
    var res = await client.auth.getUser();
    var user = res && res.data ? res.data.user : null;
    if (user) renderDashboard(user); else renderLogin(false);
  }

  if (client) client.auth.onAuthStateChange(function () { boot(); });
  boot();
})();
