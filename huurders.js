/* HomeINN — Huurdersportaal.
   Magic-link login. Toont via een veilige RPC alleen de CONTRACTgegevens van de huurder
   (nooit aankoop/financiering/winst van het pand) en laat onderhoud melden (RLS-afgeschermd). */
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
      '<div class="card login-card">' +
        '<p class="eyebrow">Huurdersportaal</p><h1>Inloggen</h1>' +
        (sent
          ? '<p class="muted">We hebben je een inloglink gemaild. Open die link op dit apparaat om in te loggen.</p>'
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

  async function loadMaintenance() {
    var r = await client.from('hios_maintenance').select('*').order('created_at', { ascending: false });
    var rows = (r && r.data) || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].photo_path) {
        var s = await client.storage.from('onderhoud').createSignedUrl(rows[i].photo_path, 3600);
        rows[i]._photoUrl = (s && s.data) ? s.data.signedUrl : null;
      }
    }
    return rows;
  }

  async function renderDashboard(user) {
    who.innerHTML = '<span>' + esc(user.email) + '</span><button class="btn ghost slim" id="logout">Uitloggen</button>';
    document.getElementById('logout').addEventListener('click', function () { client.auth.signOut(); });
    app.innerHTML = '<div class="card"><p class="muted">Je gegevens worden geladen…</p></div>';

    var tenRes = await client.rpc('hios_my_tenancy');
    if (tenRes.error) { app.innerHTML = '<div class="card"><p class="empty">Kon je gegevens niet laden: ' + esc(tenRes.error.message) + '</p></div>'; return; }
    var ten = (tenRes.data && tenRes.data[0]) || null;

    if (!ten) {
      app.innerHTML =
        '<div class="card"><p class="eyebrow">Welkom</p><h1>Geen woning gekoppeld</h1>' +
        '<p class="muted">Aan dit account (' + esc(user.email) + ') is nog geen huurwoning gekoppeld. Zodra HomeINN je als huurder registreert met dit e-mailadres verschijnt je woning hier. Vragen? Neem contact op met HomeINN.</p></div>';
      return;
    }

    var maint = await loadMaintenance();
    var contRes = await client.from('hios_contracts').select('*').eq('type', 'Huurovereenkomst').order('created_at', { ascending: false });
    var contracts = (contRes && contRes.data) || [];
    var indexNote = ten.index_pct ? ' · indexering ' + Number(ten.index_pct).toLocaleString('nl-NL') + '%/jaar' : '';

    app.innerHTML =
      '<div class="card">' +
        '<p class="eyebrow">Jouw woning</p>' +
        '<h1>' + esc(ten.address) + ', ' + esc(ten.city) + '</h1>' +
        '<table style="margin-top:12px"><tbody>' +
          row('Type', esc(ten.ptype || '—')) +
          row('Maandhuur', '<strong>' + money(ten.maandhuur) + '</strong>' + indexNote) +
          row('Ingangsdatum', fdate(ten.ingang)) +
          row('Einddatum contract', ten.eind ? fdate(ten.eind) : 'Onbepaalde tijd') +
          row('Waarborgsom', money(ten.borg)) +
        '</tbody></table>' +
      '</div>' +
      '<div class="card">' +
        '<p class="eyebrow">Onderhoud</p><h2>Onderhoud melden</h2>' +
        '<p class="muted">Iets kapot of een verzoek? Meld het hieronder — HomeINN pakt het op.</p>' +
        '<form id="maint-form"><label for="descr">Omschrijving</label>' +
        '<textarea id="descr" required placeholder="Bijv. de kraan in de keuken lekt"></textarea>' +
        '<label for="foto">Foto (optioneel)</label><input id="foto" type="file" accept="image/*">' +
        '<button class="btn primary" type="submit" style="margin-top:12px">Verstuur melding</button></form>' +
        '<h2 style="margin-top:22px;font-size:1rem">Jouw meldingen</h2>' +
        (maint.length
          ? '<table><thead><tr><th>Datum</th><th>Melding</th><th>Status</th></tr></thead><tbody>' +
            maint.map(function (m) { return '<tr><td>' + fdate(m.created_at) + '</td><td>' + esc(m.descr) + (m._photoUrl ? '<br><a href="' + esc(m._photoUrl) + '" target="_blank" rel="noopener">📷 foto</a>' : '') + '<br><button class="msgbtn" type="button" data-mid="' + esc(m.id) + '" style="background:transparent;border:0;color:var(--gold);font:inherit;font-weight:700;cursor:pointer;padding:2px 0">💬 Berichten</button><div class="thread" id="th-' + esc(m.id) + '" style="display:none;margin-top:6px"></div></td><td>' + statusBadge(m.status) + '</td></tr>'; }).join('') +
            '</tbody></table>'
          : '<p class="empty">Nog geen meldingen.</p>') +
      '</div>' +
      contractsSection(contracts) +
      '<p class="foot">Aan dit overzicht kunnen geen rechten worden ontleend. © HomeINN · Rotterdam</p>';

    document.getElementById('maint-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var descr = document.getElementById('descr').value.trim();
      if (!descr) return;
      submitMaintenance(descr, user);
    });
  }

  async function submitMaintenance(descr, user) {
    // property_id achterhalen kan de huurder niet rechtstreeks (geen leesrecht op panden);
    // we laten de database de koppeling leggen via een insert met de RLS-helper.
    var pid = await client.rpc('hios_my_property_id');
    if (pid.error || !pid.data) { toast('Kon je woning niet bepalen. Probeer opnieuw of neem contact op.'); return; }
    var photoPath = null;
    var fileInput = document.getElementById('foto');
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) { toast('Foto te groot (max 8 MB).'); return; }
      var safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      var path = user.id + '/' + Date.now() + '-' + safe; // eigen map → RLS staat upload toe
      var up = await client.storage.from('onderhoud').upload(path, file, { upsert: false });
      if (up.error) { toast('Foto uploaden mislukt: ' + up.error.message); } else { photoPath = path; }
    }
    var r = await client.from('hios_maintenance').insert({ property_id: pid.data, descr: descr, photo_path: photoPath });
    if (r.error) { toast('Melden mislukt: ' + r.error.message); return; }
    // operator notificeren (stil falen als Resend nog niet is geconfigureerd)
    if (client.functions) client.functions.invoke('notify', { body: { subject: 'Nieuwe onderhoudsmelding via het huurdersportaal', html: '<p>Een huurder heeft een onderhoudsmelding ingediend:</p><p><strong>' + esc(descr) + '</strong></p><p>Bekijk en handel af in HomeINN OS (Pand → Verhuur & beheer, na Synchroniseren).</p>' } }).catch(function () { });
    toast('Bedankt — je melding is doorgegeven aan HomeINN.');
    renderDashboard(user);
  }

  function row(label, val) { return '<tr><td class="muted">' + esc(label) + '</td><td>' + val + '</td></tr>'; }

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

  // Onderhoud-berichten (huurder ↔ operator)
  app.addEventListener('click', function (e) {
    var mb = e.target.closest ? e.target.closest('.msgbtn') : null;
    if (mb) { toggleThread(mb.getAttribute('data-mid')); return; }
    var sb = e.target.closest ? e.target.closest('.thread-send') : null;
    if (sb) { sendThreadMsg(sb.getAttribute('data-mid')); return; }
  });
  function toggleThread(mid) {
    var el = document.getElementById('th-' + mid); if (!el) return;
    if (el.style.display !== 'none') { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.innerHTML = '<p class="muted" style="font-size:.82rem">Laden…</p>';
    client.from('hios_maintenance_messages').select('*').eq('maintenance_id', mid).order('created_at', { ascending: true }).then(function (r) {
      var msgs = (r && r.data) || [];
      el.innerHTML = (msgs.length ? msgs.map(function (m) { return '<div style="font-size:.82rem;margin:4px 0"><strong>' + (m.author_type === 'operator' ? 'HomeINN' : 'Jij') + '</strong>: ' + esc(m.body) + ' <span class="muted">' + fdate(m.created_at) + '</span></div>'; }).join('') : '<p class="muted" style="font-size:.82rem">Nog geen berichten.</p>')
        + '<div style="display:flex;gap:6px;margin-top:6px"><input id="ti-' + mid + '" placeholder="Bericht aan HomeINN…" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:8px;font:inherit"><button class="btn primary slim thread-send" type="button" data-mid="' + mid + '">Stuur</button></div>';
    });
  }
  function sendThreadMsg(mid) {
    var inp = document.getElementById('ti-' + mid); var body = inp ? inp.value.trim() : '';
    if (!body) return;
    client.from('hios_maintenance_messages').insert({ maintenance_id: mid, author_type: 'huurder', body: body }).then(function (r) {
      if (r.error) { toast('Versturen mislukt: ' + r.error.message); return; }
      if (client.functions) client.functions.invoke('notify', { body: { subject: 'Nieuw bericht van huurder op onderhoudsmelding', html: '<p>Een huurder reageerde op een onderhoudsmelding:</p><p>' + esc(body) + '</p>' } }).catch(function () { });
      toast('Bericht verstuurd.');
      var el = document.getElementById('th-' + mid); if (el) { el.style.display = 'none'; toggleThread(mid); }
    });
  }

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

  function statusBadge(s) {
    var cls = s === 'Afgehandeld' ? 'green' : (s === 'In behandeling' ? 'gold' : 'red');
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }

  async function boot() {
    if (!client) { renderUnavailable(); return; }
    var res = await client.auth.getUser();
    var user = res && res.data ? res.data.user : null;
    if (user) renderDashboard(user); else renderLogin(false);
  }

  if (client) client.auth.onAuthStateChange(function () { boot(); });
  boot();
})();
