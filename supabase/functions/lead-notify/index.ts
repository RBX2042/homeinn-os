import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* HomeINN — lead-notify
   Wordt aangeroepen door de database-trigger op hios_leads (pg_net), dus zonder JWT.
   Beveiliging zit in de idempotentie: er gaat alleen mail uit voor een lead die
   (a) bestaat, (b) nog geen notified_at heeft en (c) niet ouder is dan een dag en niet in de
   toekomst ligt. De lead wordt atomisch geclaimd (notified_at wordt alleen gezet als die nog leeg
   is), dus twee gelijktijdige aanroepen met hetzelfde id sturen nooit dubbel.

   Verstuurt twee mails via Resend:
     1. intern alarm naar OPERATOR_EMAIL (met alle velden + link naar het adminpaneel)
     2. ontvangstbevestiging naar de aanvrager (NL of EN, op basis van de bronpagina)
   Beide worden gelogd in hios_emails, ook als ze mislukken of worden overgeslagen.

   Sinds 3 oktober 2026 betekent notified_at: het interne alarm IS verzonden. Mislukt of
   overgeslagen alarm → notified_at gaat terug naar leeg. Het adminpaneel toont dan terecht
   'Gemeld: nee', en een latere aanroep met hetzelfde lead_id probeert het alarm opnieuw
   (hoogstens MAX_ALARM_POGINGEN keer). De bevestiging gaat per lead hoogstens één keer uit.

   Daglimieten: het gratis Resend-plan geeft ca. 100 mails per dag voor ALLE mail, dus ook voor
   notify/broadcast (contracten, betalingsberichten aan geldgevers). Een golf nep-aanvragen mag
   dat niet opmaken. Per 24 uur gaan er hoogstens MAX_ALARMEN_PER_DAG alarmen en
   MAX_BEVESTIGINGEN_PER_DAG bevestigingen uit; daarboven komt 'overgeslagen' in hios_emails en
   staat de aanvraag gewoon in het adminpaneel. De structurele rem (limiet per IP vóór de insert)
   hoort in een aparte edge function. */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const DAG = 86400000
const MAX_ALARMEN_PER_DAG = 50
const MAX_BEVESTIGINGEN_PER_DAG = 30
const MAX_ALARM_POGINGEN = 3
const MAX_PER_ONTVANGER_PER_DAG = 5

const geldigAdres = (a: unknown) => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i.test(String(a || ''))
const isUuid = (s: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''))

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// Eén regel platte tekst: geen stuurtekens of regeleinden in een onderwerpregel.
const eenRegel = (s: unknown, max: number) =>
  String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

function shell(inner: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f4f5f7;padding:28px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
      <div style="background:#0f1b2d;padding:18px 24px;color:#b8933a;font-weight:700;letter-spacing:.08em;font-size:13px">HOMEINN</div>
      <div style="padding:24px;color:#16202e;font-size:15px;line-height:1.6">${inner}</div>
      <div style="padding:14px 24px;border-top:1px solid #eef0f3;color:#7b8695;font-size:12px">
        HomeINN · <a href="https://homeinn.nl" style="color:#7b8695">homeinn.nl</a> · info@homeinn.nl
      </div>
    </div></div>`
}

function internHtml(l: Record<string, unknown>, adminUrl: string) {
  const rij = (k: string, v: unknown) =>
    v ? `<tr><td style="padding:4px 12px 4px 0;color:#7b8695;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>` : ''
  return shell(`
    <p style="margin:0 0 4px;color:#7b8695;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Nieuwe aanvraag</p>
    <h1 style="margin:0 0 16px;font-size:20px">${esc(l.type || 'Aanvraag')}</h1>
    <table style="border-collapse:collapse;font-size:14px">
      ${rij('Naam', l.name)}${rij('E-mail', l.email)}${rij('Telefoon', l.phone)}
      ${rij('Onderwerp', l.subject)}${rij('Portefeuille', l.portfolio)}${rij('Bron', l.source)}
    </table>
    ${l.message ? `<p style="margin:16px 0 0;white-space:pre-wrap;background:#f7f8fa;border-radius:10px;padding:14px">${esc(l.message)}</p>` : ''}
    <p style="margin:22px 0 0">
      <a href="${esc(adminUrl)}" style="background:#b8933a;color:#0f1b2d;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px;display:inline-block">Openen in adminpaneel</a>
    </p>`)
}

// Alleen iets dat als voornaam leest komt in de aanhef: letters (met eventuele accenten),
// ' ’ of -, hoogstens 30 tekens en hooguit één punt aan het eind ('Joh.'). Een punt midden in het
// woord kan niet: dat leest als domeinnaam ('geblokkeerd.nl') en wordt door mailprogramma's tot
// link gemaakt. Zo kan niemand via het naamveld een zin of link ('Uw-account-is-geblokkeerd:
// ga-naar-…') vanaf ons geverifieerde domein naar een willekeurig adres sturen.
function voornaam(l: Record<string, unknown>) {
  const eerste = String(l.name || '').trim().split(/\s+/)[0] || ''
  return /^\p{L}[\p{L}\p{M}'’-]{0,29}\.?$/u.test(eerste) ? eerste : ''
}

// De bevestiging herhaalt het bericht bewust NIET: dat bericht stelt de website samen
// (met interne, Nederlandse labels) en hios_leads staat open voor anon, dus anders kan
// iedereen via ons geverifieerde domein willekeurige tekst naar een willekeurig adres sturen.
function bevestigingHtml(l: Record<string, unknown>, en: boolean) {
  const naam = voornaam(l)
  return en
    ? shell(`<h1 style="margin:0 0 12px;font-size:20px">Thank you${naam ? ', ' + esc(naam) : ''}</h1>
        <p style="margin:0 0 12px">We have received your request and will get back to you within four hours on working days.</p>
        <p style="margin:20px 0 0">Kind regards,<br><strong>HomeINN</strong></p>`)
    : shell(`<h1 style="margin:0 0 12px;font-size:20px">Bedankt${naam ? ', ' + esc(naam) : ''}</h1>
        <p style="margin:0 0 12px">We hebben uw aanvraag ontvangen en nemen binnen vier uur op werkdagen contact met u op.</p>
        <p style="margin:20px 0 0">Met vriendelijke groet,<br><strong>HomeINN</strong></p>`)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { lead_id } = await req.json().catch(() => ({ lead_id: null }))
    if (!isUuid(lead_id)) return json({ error: 'lead_id ontbreekt of is ongeldig' }, 400)

    const { data: lead } = await admin.from('hios_leads').select('*').eq('id', lead_id).maybeSingle()
    if (!lead) return json({ skipped: 'lead niet gevonden' })
    if (lead.notified_at) return json({ skipped: 'al gemeld' })
    const aangemaakt = new Date(lead.created_at).getTime()
    if (!(aangemaakt >= Date.now() - DAG)) return json({ skipped: 'te oud' })
    // Een tijdstip in de toekomst komt alleen uit een vervalste rij (anon kan created_at sinds
    // 3 oktober 2026 niet meer zelf zetten). Zo'n rij levert nooit mail op.
    if (aangemaakt > Date.now() + 5 * 60000) return json({ skipped: 'tijdstip in de toekomst' })

    // Atomisch claimen: alleen de aanroep die notified_at van leeg naar gevuld zet, gaat door.
    const { data: claim, error: claimFout } = await admin.from('hios_leads')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', lead_id)
      .is('notified_at', null)
      .select('id')
    if (claimFout) return json({ error: 'claimen mislukt: ' + claimFout.message }, 500)
    if (!claim || !claim.length) return json({ skipped: 'al gemeld' })
    const vrijgeven = () => admin.from('hios_leads').update({ notified_at: null }).eq('id', lead_id)

    // Vanaf hier geldt: is het alarm aan het eind niet verzonden (ook bij een onverwachte fout),
    // dan gaat de claim terug, zodat 'Gemeld' in het adminpaneel klopt en een herhaalde aanroep
    // het alarm opnieuw kan proberen.
    let alarm = 'mislukt'
    try {
      // Eerdere pogingen voor deze lead. Pas NA de claim lezen: wie de claim heeft, ziet zo alles
      // wat een eerdere aanroep heeft gelogd voordat die de claim weer vrijgaf.
      const { data: eerder, error: eerderFout } = await admin.from('hios_emails').select('kind, status').eq('meta->>lead_id', lead_id)
      // Kunnen we de eerdere pogingen niet lezen, dan sturen we niets: anders kan een alarm dat al
      // is verzonden opnieuw uitgaan. De claim gaat terug (finally) en de lead blijft 'Gemeld: nee'.
      if (eerderFout) throw new Error('eerdere pogingen lezen mislukt: ' + eerderFout.message)
      const pogingen = (kind: string) =>
        ((eerder || []) as { kind: string; status: string }[]).filter((e) => e.kind === kind)
      if (pogingen('lead-alert').some((e) => e.status === 'verzonden')) {
        alarm = 'verzonden'   // het alarm is er al: claim laten staan
        return json({ skipped: 'al gemeld' })
      }
      // Na MAX_ALARM_POGINGEN geven we het op; finally geeft de claim vrij ('Gemeld: nee').
      if (pogingen('lead-alert').length >= MAX_ALARM_POGINGEN) return json({ skipped: 'maximaal aantal pogingen bereikt' })

      // Anti-misbruik: hios_leads staat open voor anon (dat moet, de website vult hem),
      // dus zonder rem zou iemand ons kunnen gebruiken om een willekeurig adres te
      // bestoken met bevestigingsmails. De database begrenst al het aantal inzendingen
      // per uur (private.hios_lead_rate_ok); hier begrenzen we het per ONTVANGER.
      // Een telling die niet lukt telt voor de bevestiging als 'limiet bereikt' (die kan misbruikt
      // worden, dus liever geen mail dan een ongelimiteerde), maar niet voor het interne alarm
      // (dat willen we juist wél kwijt als de teller hapert).
      async function magNaar(adres: string) {
        const { count, error } = await admin.from('hios_emails')
          .select('id', { count: 'exact', head: true })
          .eq('to_email', adres)
          .gte('created_at', new Date(Date.now() - DAG).toISOString())
        if (error || count === null) return false
        return count < MAX_PER_ONTVANGER_PER_DAG
      }
      async function verzondenAfgelopenDag(kind: string, bijFout: number) {
        const { count, error } = await admin.from('hios_emails')
          .select('id', { count: 'exact', head: true })
          .eq('kind', kind)
          .eq('status', 'verzonden')
          .gte('created_at', new Date(Date.now() - DAG).toISOString())
        return error || count === null ? bijFout : count
      }

      const key = Deno.env.get('RESEND_API_KEY')
      const from = Deno.env.get('FROM_EMAIL') || 'HomeINN <onboarding@resend.dev>'
      const operator = Deno.env.get('OPERATOR_EMAIL') || 'info@homeinn.nl'
      const adminUrl = (Deno.env.get('ADMIN_URL') || 'https://homeinn.nl/admin.html') + '#leads'
      const en = /-en(\.html)?$/.test(String(lead.source || '')) || /\/en\//.test(String(lead.source || ''))

      async function log(kind: string, to: string, subject: string, status: string, error: string | null, providerId: string | null = null) {
        await admin.from('hios_emails').insert({ kind, to_email: to, subject, status, provider_id: providerId, error, meta: { lead_id } })
      }

      async function verstuur(kind: string, to: string, subject: string, html: string): Promise<string> {
        if (!to) return 'overgeslagen'
        if (!key) {
          await log(kind, to, subject, 'overgeslagen', 'RESEND_API_KEY niet ingesteld')
          return 'overgeslagen'
        }
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            // Alarm: antwoorden gaat naar de aanvrager. Bevestiging: een antwoord van de
            // aanvrager moet bij ons aankomen, niet op het (no-reply) afzendadres.
            body: JSON.stringify({ from, to, subject, html, reply_to: kind === 'lead-alert' ? (geldigAdres(lead.email) ? lead.email : undefined) : operator })
          })
          const out = await r.json().catch(() => ({}))
          const status = r.ok ? 'verzonden' : 'mislukt'
          await log(kind, to, subject, status, r.ok ? null : JSON.stringify(out).slice(0, 500), out?.id || null)
          return status
        } catch (e) {
          await log(kind, to, subject, 'mislukt', String(e).slice(0, 500))
          return 'mislukt'
        }
      }

      // 1. Intern alarm
      const alarmOnderwerp = eenRegel(
        `Nieuwe aanvraag: ${eenRegel(lead.type, 60) || 'Contact'}${lead.name ? ' — ' + eenRegel(lead.name, 80) : ''}`, 160)
      if (await verzondenAfgelopenDag('lead-alert', 0) >= MAX_ALARMEN_PER_DAG) {
        await log('lead-alert', operator, alarmOnderwerp, 'overgeslagen',
          `daglimiet van ${MAX_ALARMEN_PER_DAG} alarmen bereikt; de aanvraag staat in het adminpaneel`)
        alarm = 'overgeslagen'
      } else {
        alarm = await verstuur('lead-alert', operator, alarmOnderwerp, internHtml(lead, adminUrl))
      }

      // 2. Bevestiging aan de aanvrager: hoogstens één poging per lead.
      // Strikte adrescontrole: geen bevestiging naar iets dat niet als e-mailadres leest.
      // Genormaliseerd (trim + kleine letters), zodat de limiet per ontvanger in magNaar
      // niet met hoofdletter-varianten van hetzelfde adres te omzeilen is.
      const aan = String(lead.email || '').trim().toLowerCase()
      if (!pogingen('lead-bevestiging').length && geldigAdres(aan) && await magNaar(aan)) {
        const onderwerp = en ? 'We received your request — HomeINN' : 'Wij hebben uw aanvraag ontvangen — HomeINN'
        if (await verzondenAfgelopenDag('lead-bevestiging', MAX_BEVESTIGINGEN_PER_DAG) >= MAX_BEVESTIGINGEN_PER_DAG) {
          await log('lead-bevestiging', aan, onderwerp, 'overgeslagen',
            `daglimiet van ${MAX_BEVESTIGINGEN_PER_DAG} bevestigingen bereikt`)
        } else {
          await verstuur('lead-bevestiging', aan, onderwerp, bevestigingHtml(lead, en))
        }
      }

      return json({ ok: alarm === 'verzonden', alarm })
    } finally {
      if (alarm !== 'verzonden') await vrijgeven()
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
