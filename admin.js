/* HomeINN Admin — centraal cloudoverzicht.
   ---------------------------------------------------------------------------
   Waar HomeINN OS (portaal.html) local-first werkt op localStorage, leest dit
   paneel uitsluitend de CLOUD (Supabase). Het is daarmee het enige scherm dat
   laat zien wat er ECHT centraal staat: aanvragen die op een ander apparaat
   binnenkwamen, verstuurde e-mail, huurdersmeldingen, rollen en systeemstatus.

   Toegang: magic link + rolcontrole. De RLS-policies (hios_is_staff()) zijn de
   echte beveiliging; de gate hier is alleen de nette voordeur.
   Versie 1.0 — 20 september 2026. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';

  var sb = null, me = null;
  var data = { leads: [], emails: [], properties: [], projects: [], investors: [], maintenance: [], contracts: [], invoices: [], costs: [], loans: [], profiles: [], state: null };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function euro(n) {
    return '€ ' + (Number(n) || 0).toLocaleString('nl-NL', { maximumFractionDigits: 0 });
  }
  function datum(v) {
    if (!v) return '—';
    var d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  var toastTimer = null;
  function toast(msg, isError) {
    var t = $('#toast');
    t.textContent = msg;
    t.style.background = isError ? '#b3261e' : '';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3600);
  }

  /* — Tabelhulp: één renderer voor alle overzichten ——————————————————— */
  function table(container, kolommen, rijen, leegtekst) {
    var el = typeof container === 'string' ? $(container) : container;
    if (!el) return;
    if (!rijen.length) { el.innerHTML = '<p class="empty">' + esc(leegtekst || 'Nog niets te tonen.') + '</p>'; return; }
    var head = kolommen.map(function (k) { return '<th>' + esc(k.label) + '</th>'; }).join('');
    var body = rijen.map(function (r, i) {
      return '<tr>' + kolommen.map(function (k) {
        var v = k.cel(r, i);
        return '<td' + (k.wrap ? ' class="wrapcell"' : '') + '>' + (v == null ? '—' : v) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    el.innerHTML = '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function badge(tekst, kleur) { return '<span class="badge ' + (kleur || 'gray') + '">' + esc(tekst) + '</span>'; }

  /* — Inloggen ————————————————————————————————————————————————————————— */
  function client() {
    if (!sb && window.supabase) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return sb;
  }

  async function gateInit() {
    var c = client();
    if (!c) { $('#gate-msg').textContent = 'De cloudbibliotheek kon niet laden. Controleer je verbinding.'; return; }

    $('#gate-send').addEventListener('click', async function () {
      var email = ($('#gate-email').value || '').trim();
      var msg = $('#gate-msg');
      msg.className = 'gate-msg';
      if (!/.+@.+\..+/.test(email)) { msg.className = 'gate-msg err'; msg.textContent = 'Vul een geldig e-mailadres in.'; return; }
      this.disabled = true;
      try {
        var r = await c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + location.pathname } });
        if (r.error) throw r.error;
        msg.textContent = 'Inloglink verstuurd naar ' + email + '. Open hem op dit apparaat.';
      } catch (e) {
        msg.className = 'gate-msg err';
        msg.textContent = 'Inloggen mislukt: ' + (e.message || e);
      }
      this.disabled = false;
    });
    $('#gate-email').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#gate-send').click(); });

    c.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') { toonGate(); return; }
      controleer();
    });
    await controleer();
  }

  async function controleer() {
    var c = client();
    var s = await c.auth.getSession();
    var user = s && s.data && s.data.session ? s.data.session.user : null;
    if (!user) { toonGate(); return; }
    var pr = await c.from('hios_profiles').select('*').eq('id', user.id).maybeSingle();
    me = (pr && pr.data) || { id: user.id, email: user.email, role: 'onbekend' };
    if (me.role !== 'eigenaar' && me.role !== 'team') {
      $('#gate-msg').className = 'gate-msg err';
      $('#gate-msg').textContent = 'Je bent ingelogd als ' + (me.email || '') + ', maar dit account heeft geen eigenaar- of teamrol. Vraag de eigenaar om toegang.';
      toonGate();
      return;
    }
    $('#gate').hidden = true;
    $('#shell-nav').hidden = false;
    $('#app').hidden = false;
    $('#me-email').textContent = me.email || '—';
    $('#me-role').textContent = 'Rol: ' + me.role;
    await laadAlles();
  }

  function toonGate() {
    // Sluit de poort én gooi alles weg wat al getekend was: na uitloggen of bij een
    // verlopen sessie mag er geen enkele rij meer in de DOM achterblijven.
    me = null;
    Object.keys(data).forEach(function (k) { data[k] = Array.isArray(data[k]) ? [] : null; });
    $$('#app .panel div[id], #app .kpi-grid, #app .adm-health').forEach(function (el) { el.innerHTML = ''; });
    $('#me-email').textContent = '—';
    $('#me-role').textContent = '—';
    $('#gate').hidden = false;
    $('#shell-nav').hidden = true;
    $('#app').hidden = true;
  }

  /* — Data ophalen (alles in één ronde) ————————————————————————————————— */
  async function laadAlles() {
    var c = client();
    function haal(tabel, select, order) {
      var q = c.from(tabel).select(select || '*');
      if (order) q = q.order(order, { ascending: false });
      return q.then(function (r) { return r.error ? [] : (r.data || []); });
    }
    var res = await Promise.all([
      haal('hios_leads', '*', 'created_at'),
      haal('hios_emails', '*', 'created_at'),
      haal('hios_properties'),
      haal('hios_projects'),
      haal('hios_investors'),
      haal('hios_maintenance', 'id, descr, status, created_at, photo_path, property:hios_properties(address)', 'created_at'),
      haal('hios_contracts', '*', 'created_at'),
      haal('hios_invoices'),
      haal('hios_costs'),
      haal('hios_loans'),
      haal('hios_profiles'),
      c.from('hios_state').select('updated_at').eq('id', 'main').maybeSingle().then(function (r) { return (r && r.data) || null; })
    ]);
    data.leads = res[0]; data.emails = res[1]; data.properties = res[2]; data.projects = res[3];
    data.investors = res[4]; data.maintenance = res[5]; data.contracts = res[6]; data.invoices = res[7];
    data.costs = res[8]; data.loans = res[9]; data.profiles = res[10]; data.state = res[11];
    tekenAlles();
  }

  function tekenAlles() {
    tekenDashboard(); tekenLeads(); tekenEmails(); tekenPanden(); tekenProjecten();
    tekenOnderhoud(); tekenInvesteerders(); tekenFinancieel(); tekenContracten();
    tekenGebruikers(); tekenSysteem();
  }

  /* — Dashboard ———————————————————————————————————————————————————————— */
  function kpi(label, waarde, sub) {
    return '<article class="kpi"><span class="mini-label">' + esc(label) + '</span><strong>' + waarde + '</strong>' + (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') + '</article>';
  }
  function tekenDashboard() {
    var nieuw = data.leads.filter(function (l) { return (l.status || 'nieuw') === 'nieuw'; }).length;
    var mislukt = data.emails.filter(function (e) { return e.status !== 'verzonden'; }).length;
    var openOnderhoud = data.maintenance.filter(function (m) { return m.status !== 'Afgehandeld' && m.status !== 'Gereed'; }).length;
    var teTekenen = data.contracts.filter(function (k) { return k.status !== 'Getekend'; }).length;
    var inleg = data.investors.reduce(function (s, i) { return s + (Number(i.bedrag) || 0); }, 0);
    $('#kpis').innerHTML =
      kpi('Aanvragen open', nieuw, data.leads.length + ' totaal') +
      kpi('Panden', data.properties.length, 'in de cloud') +
      kpi('Projecten', data.projects.length, data.projects.filter(function (p) { return p.published; }).length + ' gepubliceerd') +
      kpi('Investeerdersinleg', euro(inleg), data.investors.length + ' deelnames') +
      kpi('Onderhoud open', openOnderhoud, data.maintenance.length + ' meldingen') +
      kpi('E-mail niet bezorgd', mislukt, data.emails.length + ' verzendingen');

    table('#recent-leads', [
      { label: 'Datum', cel: function (l) { return datum(l.created_at); } },
      { label: 'Type', cel: function (l) { return esc(l.type); } },
      { label: 'Naam', cel: function (l) { return esc(l.name); } },
      { label: 'Contact', cel: function (l) { return esc(l.email || l.phone); } },
      { label: 'Status', cel: function (l) { return badge(l.status || 'nieuw', (l.status || 'nieuw') === 'nieuw' ? 'gold' : 'green'); } }
    ], data.leads.slice(0, 5), 'Nog geen aanvragen binnengekomen.');

    table('#recent-mail', [
      { label: 'Datum', cel: function (m) { return datum(m.created_at); } },
      { label: 'Soort', cel: function (m) { return esc(m.kind); } },
      { label: 'Aan', cel: function (m) { return esc(m.to_email); } },
      { label: 'Onderwerp', cel: function (m) { return esc(m.subject); }, wrap: true },
      { label: 'Status', cel: function (m) { return badge(m.status, m.status === 'verzonden' ? 'green' : m.status === 'mislukt' ? 'red' : 'gray'); } }
    ], data.emails.slice(0, 5), 'Er is nog geen e-mail verstuurd.');
  }

  /* — Aanvragen ————————————————————————————————————————————————————————— */
  function gefilterdeLeads() {
    var q = ($('#lead-q').value || '').toLowerCase();
    var st = $('#lead-status').value;
    var ty = $('#lead-type').value;
    return data.leads.filter(function (l) {
      if (st && (l.status || 'nieuw') !== st) return false;
      if (ty && l.type !== ty) return false;
      if (!q) return true;
      return [l.name, l.email, l.phone, l.subject, l.message, l.source, l.portfolio].join(' ').toLowerCase().indexOf(q) > -1;
    });
  }
  function tekenLeads() {
    var typen = {};
    data.leads.forEach(function (l) { if (l.type) typen[l.type] = 1; });
    var sel = $('#lead-type'), huidig = sel.value;
    sel.innerHTML = '<option value="">Alle typen</option>' + Object.keys(typen).sort().map(function (t) {
      return '<option' + (t === huidig ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');

    var statussen = ['nieuw', 'in behandeling', 'afgerond', 'geen interesse'];
    table('#leads-table', [
      { label: 'Datum', cel: function (l) { return datum(l.created_at); } },
      { label: 'Type', cel: function (l) { return esc(l.type); } },
      { label: 'Naam', cel: function (l) { return esc(l.name); } },
      { label: 'Contact', cel: function (l) {
        var uit = [];
        if (l.email) uit.push('<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>');
        if (l.phone) uit.push(esc(l.phone));
        return uit.join('<br>') || '—';
      } },
      { label: 'Bericht', wrap: true, cel: function (l) {
        return esc([l.subject, l.portfolio, l.message].filter(Boolean).join(' — ')) || '—';
      } },
      { label: 'Bron', cel: function (l) { return esc(l.source); } },
      { label: 'Gemeld', cel: function (l) { return l.notified_at ? badge('ja', 'green') : badge('nee', 'gray'); } },
      { label: 'Status', cel: function (l) {
        return '<select data-lead-status="' + l.id + '">' + statussen.map(function (s) {
          return '<option' + ((l.status || 'nieuw') === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select>';
      } },
      { label: 'Notitie', cel: function (l) {
        return '<input type="text" data-lead-note="' + l.id + '" value="' + esc(l.note || '') + '" placeholder="Notitie…">';
      } },
      { label: '', cel: function (l) {
        return '<button class="btn secondary slim" data-lead-del="' + l.id + '">Verwijder</button>';
      } }
    ], gefilterdeLeads(), 'Geen aanvragen die aan dit filter voldoen.');
  }

  /* — E-maillog ————————————————————————————————————————————————————————— */
  function tekenEmails() {
    var q = ($('#mail-q').value || '').toLowerCase();
    var st = $('#mail-status').value;
    var rijen = data.emails.filter(function (m) {
      if (st && m.status !== st) return false;
      if (!q) return true;
      return [m.to_email, m.subject, m.kind].join(' ').toLowerCase().indexOf(q) > -1;
    });
    table('#email-table', [
      { label: 'Datum', cel: function (m) { return datum(m.created_at); } },
      { label: 'Soort', cel: function (m) { return esc(m.kind); } },
      { label: 'Aan', cel: function (m) { return esc(m.to_email); } },
      { label: 'Onderwerp', wrap: true, cel: function (m) { return esc(m.subject); } },
      { label: 'Status', cel: function (m) { return badge(m.status, m.status === 'verzonden' ? 'green' : m.status === 'mislukt' ? 'red' : 'gray'); } },
      { label: 'Toelichting', wrap: true, cel: function (m) { return esc(m.error || m.provider_id || ''); } }
    ], rijen, 'Nog geen verzendingen gelogd.');
  }

  /* — Vastgoed ————————————————————————————————————————————————————————— */
  function tekenPanden() {
    table('#panden-table', [
      { label: 'Ref', cel: function (p) { return esc(p.ref); } },
      { label: 'Adres', cel: function (p) { return esc(p.address); } },
      { label: 'Plaats', cel: function (p) { return esc(p.city); } },
      { label: 'Type', cel: function (p) { return esc(p.ptype); } },
      { label: 'Status', cel: function (p) { return badge(p.status || '—', 'blue'); } },
      { label: 'Huurder', cel: function (p) { return esc(p.tenant_email || ''); } },
      { label: 'Maandhuur', cel: function (p) { return p.data && p.data.maandhuur ? euro(p.data.maandhuur) : '—'; } }
    ], data.properties, 'Nog geen panden gesynchroniseerd vanuit HomeINN OS.');
  }
  function tekenProjecten() {
    table('#projecten-table', [
      { label: 'Ref', cel: function (p) { return esc(p.ref); } },
      { label: 'Project', cel: function (p) { return esc(p.name); } },
      { label: 'Status', cel: function (p) { return badge(p.status || '—', 'blue'); } },
      { label: 'Op de website', cel: function (p) { return p.published ? badge('gepubliceerd', 'green') : badge('intern', 'gray'); } },
      { label: 'Investeerders', cel: function (p) {
        return String(data.investors.filter(function (i) { return i.project_id === p.id; }).length);
      } }
    ], data.projects, 'Nog geen projecten in de cloud.');
  }
  function tekenOnderhoud() {
    var statussen = ['Nieuw', 'In behandeling', 'Ingepland', 'Afgehandeld'];
    table('#onderhoud-table', [
      { label: 'Datum', cel: function (m) { return datum(m.created_at); } },
      { label: 'Pand', cel: function (m) { return esc(m.property ? m.property.address : ''); } },
      { label: 'Melding', wrap: true, cel: function (m) { return esc(m.descr); } },
      { label: 'Foto', cel: function (m) { return m.photo_path ? '<button class="btn secondary slim" data-foto="' + esc(m.photo_path) + '">Bekijk</button>' : '—'; } },
      { label: 'Status', cel: function (m) {
        var lijst = statussen.indexOf(m.status) > -1 ? statussen : [m.status].concat(statussen);
        return '<select data-maint-status="' + m.id + '">' + lijst.map(function (s) {
          return '<option' + (m.status === s ? ' selected' : '') + '>' + esc(s) + '</option>';
        }).join('') + '</select>';
      } }
    ], data.maintenance, 'Geen onderhoudsmeldingen.');
  }
  function tekenInvesteerders() {
    var projectNaam = {};
    data.projects.forEach(function (p) { projectNaam[p.id] = p.name; });
    table('#investeerders-table', [
      { label: 'Naam', cel: function (i) { return esc(i.naam); } },
      { label: 'E-mail', cel: function (i) { return esc(i.email || ''); } },
      { label: 'Project', cel: function (i) { return esc(projectNaam[i.project_id] || '—'); } },
      { label: 'Inleg', cel: function (i) { return euro(i.bedrag); } },
      { label: 'Rendement', cel: function (i) { return (Number(i.rendement_pct) || 0) + '%'; } },
      { label: 'WWFT', cel: function (i) { return i.wwft ? badge('akkoord', 'green') : badge('open', 'red'); } },
      { label: 'Portaal', cel: function (i) { return i.profile_id ? badge('gekoppeld', 'green') : badge('nog niet', 'gray'); } }
    ], data.investors, 'Nog geen investeerders.');
  }

  /* — Financieel ———————————————————————————————————————————————————————— */
  function tekenFinancieel() {
    var open = data.invoices.filter(function (f) { return f.status !== 'Betaald'; });
    var openBedrag = open.reduce(function (s, f) { return s + (Number(f.amount) || 0); }, 0);
    var kosten = data.costs.reduce(function (s, k) { return s + (Number(k.amount) || 0); }, 0);
    var schuld = data.loans.reduce(function (s, l) { return s + (Number(l.bedrag) || 0); }, 0);
    $('#fin-kpis').innerHTML =
      kpi('Openstaand', euro(openBedrag), open.length + ' facturen') +
      kpi('Kosten geboekt', euro(kosten), data.costs.length + ' posten') +
      kpi('Financiering', euro(schuld), data.loans.length + ' leningen');

    table('#facturen-table', [
      { label: 'Datum', cel: function (f) { return f.date || '—'; } },
      { label: 'Soort', cel: function (f) { return esc(f.soort); } },
      { label: 'Debiteur', cel: function (f) { return esc(f.debiteur || ''); } },
      { label: 'Omschrijving', wrap: true, cel: function (f) { return esc(f.descr); } },
      { label: 'Bedrag', cel: function (f) { return euro(f.amount); } },
      { label: 'Vervalt', cel: function (f) { return f.due || '—'; } },
      { label: 'Status', cel: function (f) { return badge(f.status || '—', f.status === 'Betaald' ? 'green' : 'gold'); } }
    ], data.invoices, 'Geen facturen gesynchroniseerd.');

    table('#kosten-table', [
      { label: 'Datum', cel: function (k) { return k.date || '—'; } },
      { label: 'Omschrijving', wrap: true, cel: function (k) { return esc(k.descr); } },
      { label: 'Categorie', cel: function (k) { return esc(k.category); } },
      { label: 'Bedrag', cel: function (k) { return euro(k.amount); } },
      { label: 'Btw', cel: function (k) { return (k.btw_pct == null ? 21 : k.btw_pct) + '%'; } },
      { label: 'Status', cel: function (k) { return badge(k.status || '—', k.status === 'Betaald' ? 'green' : 'gold'); } }
    ], data.costs, 'Geen kosten gesynchroniseerd.');

    table('#leningen-table', [
      { label: 'Soort', cel: function (l) { return esc(l.soort); } },
      { label: 'Bedrag', cel: function (l) { return euro(l.bedrag); } },
      { label: 'Rente', cel: function (l) { return (Number(l.rente_pct) || 0) + '%'; } },
      { label: 'Aflossing', cel: function (l) { return euro(l.aflossing); } },
      { label: 'Loopt', cel: function (l) { return (l.start || '—') + ' → ' + (l.eind || '—'); } }
    ], data.loans, 'Geen financieringen gesynchroniseerd.');
  }

  function tekenContracten() {
    table('#contracten-table', [
      { label: 'Datum', cel: function (k) { return datum(k.created_at); } },
      { label: 'Soort', cel: function (k) { return esc(k.type); } },
      { label: 'Ref', cel: function (k) { return esc(k.ref); } },
      { label: 'Wederpartij', cel: function (k) { return esc(k.party_email || ''); } },
      { label: 'Bedrag', cel: function (k) { return k.amount ? euro(k.amount) : '—'; } },
      { label: 'Status', cel: function (k) { return badge(k.status || '—', k.status === 'Getekend' ? 'green' : 'gold'); } },
      { label: 'Getekend', cel: function (k) { return k.signed_at ? datum(k.signed_at) + '<br><small>' + esc(k.signed_name || '') + '</small>' : '—'; } }
    ], data.contracts, 'Nog geen contracten verstuurd.');
  }

  /* — Gebruikers ————————————————————————————————————————————————————————— */
  function tekenGebruikers() {
    var rollen = ['eigenaar', 'team', 'investeerder', 'huurder', 'koper', 'verkoper'];
    table('#gebruikers-table', [
      { label: 'E-mail', cel: function (p) { return esc(p.email); } },
      { label: 'Naam', cel: function (p) { return esc(p.full_name || ''); } },
      { label: 'Sinds', cel: function (p) { return datum(p.created_at); } },
      { label: 'Actief', cel: function (p) { return p.active === false ? badge('geblokkeerd', 'red') : badge('actief', 'green'); } },
      { label: 'Rol', cel: function (p) {
        if (p.id === (me && me.id)) return badge(p.role + ' (jij)', 'blue');
        var lijst = rollen.indexOf(p.role) > -1 ? rollen : [p.role].concat(rollen);
        return '<select data-role="' + p.id + '">' + lijst.map(function (r) {
          return '<option' + (p.role === r ? ' selected' : '') + '>' + esc(r) + '</option>';
        }).join('') + '</select>';
      } }
    ], data.profiles, 'Nog geen gebruikers geregistreerd.');
  }

  /* — Systeem ————————————————————————————————————————————————————————— */
  function tekenSysteem() {
    var mailOk = data.emails.filter(function (e) { return e.status === 'verzonden'; }).length;
    var overgeslagen = data.emails.filter(function (e) { return e.status === 'overgeslagen'; }).length;
    var resend = mailOk > 0 ? badge('actief', 'green')
      : overgeslagen > 0 ? badge('sleutel ontbreekt', 'red')
      : badge('nog niet gebruikt', 'gray');
    var regels = [
      ['Cloudverbinding', badge('verbonden', 'green')],
      ['Ingelogd als', esc(me ? me.email : '—') + ' · ' + esc(me ? me.role : '')],
      ['Resend (e-mail)', resend + (overgeslagen ? ' <small>' + overgeslagen + ' mail overgeslagen</small>' : '')],
      ['Automatische lead-melding', data.leads.filter(function (l) { return l.notified_at; }).length + ' van ' + data.leads.length + ' aanvragen gemeld'],
      ['Laatste OS-back-up', data.state ? datum(data.state.updated_at) : 'nog nooit — maak een back-up in HomeINN OS → Instellingen']
    ];
    $('#health').innerHTML = regels.map(function (r) {
      return '<div><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join('');

    table('#counts-table', [
      { label: 'Tabel', cel: function (r) { return esc(r[0]); } },
      { label: 'Records', cel: function (r) { return String(r[1]); } }
    ], [
      ['Aanvragen', data.leads.length], ['E-mail', data.emails.length], ['Panden', data.properties.length],
      ['Projecten', data.projects.length], ['Investeerders', data.investors.length], ['Onderhoud', data.maintenance.length],
      ['Contracten', data.contracts.length], ['Facturen', data.invoices.length], ['Kosten', data.costs.length],
      ['Financieringen', data.loans.length], ['Gebruikers', data.profiles.length]
    ]);
  }

  /* — Acties ————————————————————————————————————————————————————————— */
  async function wijzig(tabel, id, velden, melding) {
    var r = await client().from(tabel).update(velden).eq('id', id);
    if (r.error) { toast('Opslaan mislukt: ' + r.error.message, true); return false; }
    toast(melding || 'Opgeslagen.');
    return true;
  }

  function bindActies() {
    // navigatie
    $$('.nav-item').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.nav-item').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var v = b.dataset.view;
        $$('.view').forEach(function (s) { s.classList.toggle('active', s.id === v); });
        $('#view-title').textContent = b.textContent;
        location.hash = v;
        window.scrollTo(0, 0);
      });
    });
    if (location.hash) {
      var doel = $$('.nav-item').filter(function (b) { return '#' + b.dataset.view === location.hash; })[0];
      if (doel) doel.click();
    }

    $('#refresh-btn').addEventListener('click', function () { laadAlles().then(function () { toast('Bijgewerkt.'); }); });
    $('#signout-btn').addEventListener('click', async function () {
      await client().auth.signOut();
      toonGate();
      location.replace(location.pathname);   // harde herstart: geen resten in geheugen of hash
    });

    ['#lead-q', '#lead-status', '#lead-type'].forEach(function (s) {
      $(s).addEventListener('input', tekenLeads);
    });
    ['#mail-q', '#mail-status'].forEach(function (s) { $(s).addEventListener('input', tekenEmails); });

    $('#lead-export').addEventListener('click', function () {
      var rijen = gefilterdeLeads();
      var kop = ['datum', 'type', 'naam', 'email', 'telefoon', 'onderwerp', 'bericht', 'bron', 'status', 'notitie'];
      var csv = [kop.join(';')].concat(rijen.map(function (l) {
        return [l.created_at, l.type, l.name, l.email, l.phone, l.subject, (l.message || '').replace(/[\r\n;]+/g, ' '), l.source, l.status, l.note || '']
          .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';');
      })).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'homeinn-aanvragen-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // gedelegeerde handlers voor alle dynamisch getekende tabellen
    document.addEventListener('change', async function (e) {
      var t = e.target;
      if (t.dataset.leadStatus) {
        var l = data.leads.filter(function (x) { return x.id === t.dataset.leadStatus; })[0];
        if (await wijzig('hios_leads', t.dataset.leadStatus, { status: t.value, handled: t.value === 'afgerond' }, 'Status bijgewerkt.') && l) {
          l.status = t.value; tekenDashboard();
        }
      }
      if (t.dataset.maintStatus) {
        var m = data.maintenance.filter(function (x) { return x.id === t.dataset.maintStatus; })[0];
        if (await wijzig('hios_maintenance', t.dataset.maintStatus, { status: t.value }, 'Melding bijgewerkt.') && m) {
          m.status = t.value; tekenDashboard();
        }
      }
      if (t.dataset.role) {
        var p = data.profiles.filter(function (x) { return x.id === t.dataset.role; })[0];
        if (await wijzig('hios_profiles', t.dataset.role, { role: t.value }, 'Rol gewijzigd.') && p) p.role = t.value;
      }
    });

    document.addEventListener('blur', async function (e) {
      var t = e.target;
      if (t && t.dataset && t.dataset.leadNote) {
        var l = data.leads.filter(function (x) { return x.id === t.dataset.leadNote; })[0];
        if (l && (l.note || '') !== t.value) {
          if (await wijzig('hios_leads', t.dataset.leadNote, { note: t.value }, 'Notitie opgeslagen.')) l.note = t.value;
        }
      }
    }, true);

    document.addEventListener('click', async function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.leadDel) {
        if (!confirm('Deze aanvraag definitief verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;
        var r = await client().from('hios_leads').delete().eq('id', t.dataset.leadDel);
        if (r.error) { toast('Verwijderen mislukt: ' + r.error.message, true); return; }
        data.leads = data.leads.filter(function (x) { return x.id !== t.dataset.leadDel; });
        tekenLeads(); tekenDashboard(); toast('Aanvraag verwijderd.');
      }
      if (t.dataset && t.dataset.foto) {
        var s = await client().storage.from('onderhoud').createSignedUrl(t.dataset.foto, 3600);
        if (s && s.data) window.open(s.data.signedUrl, '_blank', 'noopener');
        else toast('Foto kon niet worden geopend.', true);
      }
      if (t.dataset && t.dataset.fill) {
        var adressen = [];
        if (t.dataset.fill === 'leads') adressen = data.leads.map(function (l) { return l.email; });
        if (t.dataset.fill === 'investeerders') adressen = data.investors.map(function (i) { return i.email; });
        if (t.dataset.fill === 'gebruikers') adressen = data.profiles.map(function (p) { return p.email; });
        adressen = adressen.filter(function (a) { return a && /.+@.+\..+/.test(a); });
        adressen = adressen.filter(function (a, i) { return adressen.indexOf(a) === i; });
        $('#bulk-to').value = adressen.join('\n');
        toast(adressen.length + ' adressen ingevuld.');
      }
    });

    $('#one-send').addEventListener('click', function () {
      var to = ($('#one-to').value || '').trim();
      if (!/.+@.+\..+/.test(to)) { toast('Vul een geldig e-mailadres in.', true); return; }
      stuur({ to: to, subject: $('#one-subject').value || 'Bericht van HomeINN', html: $('#one-body').value, kind: 'handmatig' }, this);
    });

    $('#test-mail').addEventListener('click', function () {
      stuur({
        to: me.email, kind: 'test', subject: 'HomeINN testmail',
        html: '<p>Dit is een testbericht uit het adminpaneel. Als je dit leest, werkt Resend.</p>'
      }, this);
    });

    $('#bulk-send').addEventListener('click', async function () {
      var lijst = ($('#bulk-to').value || '').split(/[\s,;]+/).filter(function (a) { return /.+@.+\..+/.test(a); });
      if (!lijst.length) { toast('Geen geldige ontvangers.', true); return; }
      if (!confirm('Verstuur deze mail naar ' + lijst.length + ' ontvangers?')) return;
      this.disabled = true;
      try {
        var r = await client().functions.invoke('broadcast', {
          body: { recipients: lijst, subject: $('#bulk-subject').value || 'HomeINN', html: $('#bulk-body').value, kind: 'nieuwsbrief' }
        });
        if (r.error) throw r.error;
        var d = r.data || {};
        toast(d.skipped ? 'Niet verstuurd: ' + d.reason : 'Verstuurd: ' + d.sent + ' gelukt, ' + d.failed + ' mislukt.', !!d.skipped);
      } catch (err) { toast('Versturen mislukt: ' + (err.message || err), true); }
      this.disabled = false;
      data.emails = await client().from('hios_emails').select('*').order('created_at', { ascending: false }).then(function (x) { return x.data || []; });
      tekenEmails(); tekenDashboard(); tekenSysteem();
    });
  }

  async function stuur(payload, knop) {
    knop.disabled = true;
    try {
      var r = await client().functions.invoke('notify', { body: payload });
      if (r.error) throw r.error;
      var d = r.data || {};
      toast(d.skipped ? 'Niet verstuurd: ' + d.reason : 'Mail verstuurd naar ' + payload.to + '.', !!d.skipped);
    } catch (err) {
      toast('Versturen mislukt: ' + (err.message || err), true);
    }
    knop.disabled = false;
    data.emails = await client().from('hios_emails').select('*').order('created_at', { ascending: false }).then(function (x) { return x.data || []; });
    tekenEmails(); tekenDashboard(); tekenSysteem();
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindActies();
    gateInit();
  });
})();
