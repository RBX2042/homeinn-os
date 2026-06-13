/* HomeINN OS — cloud-sync laag (Supabase).
   Optioneel en local-first: de app werkt volledig zonder. localStorage blijft de werkbron;
   deze laag pusht naar de hios_*-tabellen zodat de portalen (RLS-afgeschermd) kunnen lezen. */
(function () {
  var SUPABASE_URL = 'https://evguvdpuidyvkiinzvys.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JZcuyhVWabuo33MZ8qGTDg_wwMth0zC';
  var client = null, profile = null, lastSync = null;
  var listeners = [];

  function available() { return !!(window.supabase && window.supabase.createClient); }
  function get() {
    if (!client && available()) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return client;
  }
  function notify() { listeners.forEach(function (fn) { try { fn(window.HCloud.status()); } catch (e) {} }); }

  async function loadProfile() {
    var c = get(); if (!c) return null;
    var res = await c.auth.getUser();
    var user = res && res.data ? res.data.user : null;
    if (!user) { profile = null; return null; }
    var pr = await c.from('hios_profiles').select('*').eq('id', user.id).maybeSingle();
    profile = (pr && pr.data) ? pr.data : { id: user.id, email: user.email, role: 'investeerder' };
    return profile;
  }

  window.HCloud = {
    available: available,
    status: function () {
      return {
        ready: available(),
        email: profile ? profile.email : null,
        role: profile ? profile.role : null,
        staff: !!(profile && (profile.role === 'eigenaar' || profile.role === 'team')),
        lastSync: lastSync
      };
    },
    onChange: function (fn) { listeners.push(fn); },
    init: async function () {
      var c = get(); if (!c) { notify(); return; }
      c.auth.onAuthStateChange(async function () { await loadProfile(); notify(); });
      await loadProfile(); notify();
    },
    signIn: async function (email) {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar (geen verbinding?).');
      var redirect = location.origin + location.pathname;
      var r = await c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect } });
      if (r.error) throw r.error;
    },
    signOut: async function () { var c = get(); if (c) { await c.auth.signOut(); profile = null; notify(); } },

    /* Push de operator-data naar de cloud (alleen voor eigenaar/team). */
    pushAll: async function (state) {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      var st = window.HCloud.status();
      if (!st.email) throw new Error('Log eerst in om te synchroniseren.');
      if (!st.staff) throw new Error('Alleen een eigenaar/team-account mag synchroniseren.');

      var props = state.properties.map(function (p) {
        return { local_id: p.id, ref: p.ref, address: p.address, city: p.city, ptype: p.ptype, status: p.status, tenant_email: p.huurderEmail || null, data: p };
      });
      if (props.length) { var r1 = await c.from('hios_properties').upsert(props, { onConflict: 'local_id' }); if (r1.error) throw r1.error; }

      var projs = state.projects.map(function (pr) {
        return { local_id: pr.id, ref: pr.ref, name: pr.name, status: pr.status, published: !!pr.publish, data: pr };
      });
      if (projs.length) { var r2 = await c.from('hios_projects').upsert(projs, { onConflict: 'local_id' }); if (r2.error) throw r2.error; }

      // koppel lokale project-id → cloud-uuid voor de onderliggende rijen
      var cp = await c.from('hios_projects').select('id,local_id');
      if (cp.error) throw cp.error;
      var pid = {}; (cp.data || []).forEach(function (r) { pid[r.local_id] = r.id; });

      var investors = [], updates = [];
      state.projects.forEach(function (pr) {
        var cpid = pid[pr.id]; if (!cpid) return;
        (pr.investeerders || []).forEach(function (i) {
          investors.push({ local_id: i.id, project_id: cpid, naam: i.naam, email: i.email || null, bedrag: Number(i.bedrag) || 0, rendement_pct: (pr.invest && Number(pr.invest.rendementPct)) || 0, datum: i.datum || null, wwft: !!i.wwft });
        });
        (pr.updates || []).forEach(function (u) {
          updates.push({ local_id: u.id, project_id: cpid, date: u.date || null, text: u.text });
        });
      });
      if (investors.length) { var r3 = await c.from('hios_investors').upsert(investors, { onConflict: 'local_id' }); if (r3.error) throw r3.error; }
      if (updates.length) { var r4 = await c.from('hios_project_updates').upsert(updates, { onConflict: 'local_id' }); if (r4.error) throw r4.error; }

      // Uitkeringen: koppel lokale investeerder-id → cloud-uuid, dan upsert
      var ci = await c.from('hios_investors').select('id,local_id');
      if (ci.error) throw ci.error;
      var iid = {}; (ci.data || []).forEach(function (r) { iid[r.local_id] = r.id; });
      var payouts = [];
      state.projects.forEach(function (pr) {
        (pr.investeerders || []).forEach(function (i) {
          var ciid = iid[i.id]; if (!ciid) return;
          (i.uitkeringen || []).forEach(function (u) {
            payouts.push({ local_id: u.id, investor_id: ciid, date: u.date || null, amount: Number(u.amount) || 0, kind: u.kind || 'overig', status: u.status || 'Gepland', note: u.note || null });
          });
        });
      });
      if (payouts.length) { var r5 = await c.from('hios_investor_payouts').upsert(payouts, { onConflict: 'local_id' }); if (r5.error) throw r5.error; }

      lastSync = new Date().toISOString();
      notify();
      return { panden: props.length, projecten: projs.length, investeerders: investors.length, updates: updates.length };
    },

    /* Haal de door huurders ingediende onderhoudsmeldingen (incl. foto) op uit de cloud. */
    pullMaintenance: async function () {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      var st = window.HCloud.status();
      if (!st.staff) throw new Error('Alleen een eigenaar/team-account kan meldingen ophalen.');
      var r = await c.from('hios_maintenance')
        .select('id, descr, status, created_at, photo_path, property:hios_properties(local_id, address)')
        .order('created_at', { ascending: false });
      if (r.error) throw r.error;
      var rows = r.data || [];
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        var m = rows[i], photoUrl = null;
        if (m.photo_path) {
          var s = await c.storage.from('onderhoud').createSignedUrl(m.photo_path, 3600);
          photoUrl = (s && s.data) ? s.data.signedUrl : null;
        }
        out.push({
          id: m.id,
          localPropertyId: m.property ? m.property.local_id : null,
          address: m.property ? m.property.address : '',
          descr: m.descr, status: m.status, created_at: m.created_at, photoUrl: photoUrl
        });
      }
      return out;
    },

    /* Operator zet de status van een huurder-melding (huurder ziet dit terug in zijn portaal). */
    setMaintenanceStatus: async function (id, status) {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      var r = await c.from('hios_maintenance').update({ status: status }).eq('id', id);
      if (r.error) throw r.error;
    },

    /* Stuur een contract ter ondertekening naar een portaal-gebruiker (op e-mail). */
    sendContract: async function (payload) {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      var st = window.HCloud.status();
      if (!st.staff) throw new Error('Alleen een eigenaar/team-account mag contracten versturen.');
      if (!payload.party_email) throw new Error('Vul eerst een e-mailadres van de wederpartij in.');
      var r = await c.from('hios_contracts').upsert(payload, { onConflict: 'local_id' });
      if (r.error) throw r.error;
    },

    /* Team & toegang: profielen (gebruikers) lezen en rollen beheren (staff-only via RLS). */
    listProfiles: async function () {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      if (!window.HCloud.status().staff) throw new Error('Alleen een eigenaar/team-account kan gebruikers beheren.');
      var r = await c.from('hios_profiles').select('id, email, full_name, role').order('email', { ascending: true });
      if (r.error) throw r.error;
      return r.data || [];
    },
    setRole: async function (profileId, role) {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      if (!window.HCloud.status().staff) throw new Error('Geen rechten.');
      var r = await c.from('hios_profiles').update({ role: role }).eq('id', profileId);
      if (r.error) throw r.error;
    },
    myId: function () {
      // id van de ingelogde gebruiker (best-effort, via het geladen profiel)
      return profile ? profile.id : null;
    },

    /* Verstuur een notificatie-e-mail via de 'notify' edge function (Resend).
       Faalt stil als de cloud/Resend nog niet is geconfigureerd — breekt de app nooit. */
    notify: function (payload) {
      var c = get(); if (!c || !c.functions) return Promise.resolve();
      return c.functions.invoke('notify', { body: payload }).catch(function () { });
    },

    /* Volledige werkstaat naar de cloud back-uppen / terughalen (staff-only, gedeelde 'main'-rij). */
    saveState: async function (stateObj) {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      if (!window.HCloud.status().staff) throw new Error('Log in als eigenaar/team.');
      var r = await c.from('hios_state').upsert({ id: 'main', data: stateObj, updated_at: new Date().toISOString(), updated_by: profile ? profile.id : null }, { onConflict: 'id' });
      if (r.error) throw r.error;
    },
    loadState: async function () {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      if (!window.HCloud.status().staff) throw new Error('Log in als eigenaar/team.');
      var r = await c.from('hios_state').select('data, updated_at').eq('id', 'main').maybeSingle();
      if (r.error) throw r.error;
      return r.data; // { data, updated_at } of null
    },

    /* Bulk-mailing (nieuwsbrief) via de 'broadcast' edge function (staff-only). */
    broadcast: async function (payload) {
      var c = get(); if (!c || !c.functions) throw new Error('Cloud niet beschikbaar.');
      if (!window.HCloud.status().staff) throw new Error('Log in als eigenaar/team om te mailen.');
      var r = await c.functions.invoke('broadcast', { body: payload });
      if (r.error) throw r.error;
      return r.data;
    },

    /* Haal de ondertekenstatus van verstuurde contracten op (voor terugkoppeling in het OS). */
    pullContracts: async function () {
      var c = get(); if (!c) throw new Error('Cloud niet beschikbaar.');
      var st = window.HCloud.status();
      if (!st.staff) return [];
      var r = await c.from('hios_contracts').select('local_id, status, signed_at, signed_name, party_email');
      if (r.error) throw r.error;
      return r.data || [];
    }
  };
})();
