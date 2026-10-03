import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// HomeINN notificaties via Resend. Niet-staf mag alleen de operator pingen (anti-misbruik).
// v2 (20 september 2026): elke verzending wordt gelogd in hios_emails voor het adminpaneel.
// v3 (3 oktober 2026): inloggen maakt een account aan (signup staat open), dus 'ingelogd' zegt
//   niets. Daarom:
//   * staf = rol eigenaar/team ÉN actief, net als public.hios_is_staff(); een geblokkeerd
//     teamlid mailt niet meer;
//   * niet-staf moet huurder zijn (gekoppeld aan een woning). Huurders.js is de enige niet-staf
//     aanroeper (onderhoudsmelding en bericht op een melding);
//   * van niet-staf gaat alleen PLATTE TEKST door (geen eigen HTML of links vanaf ons
//     geverifieerde domein), met de afzender erbij, en hoogstens MAX_PER_UUR keer per uur.
//     Het soort ('kind') bepaalt de server, zodat niemand de daglimieten van lead-notify kan
//     vervuilen met valse 'lead-bevestiging'-regels.

const MAX_PER_UUR = 10
const MAX_TEKST = 2000

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const eenRegel = (s: unknown, max: number) =>
  String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

// HTML uit het huurdersportaal terug naar platte tekst: alinea's en regeleinden blijven,
// tags verdwijnen, entiteiten worden teruggezet (&amp; als laatste), daarna escapen we opnieuw.
function naarPlatteTekst(html: string) {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(url, service)
    const { data: prof } = await admin.from('hios_profiles').select('role, active').eq('id', user.id).maybeSingle()
    const staff = !!(prof && prof.active === true && (prof.role === 'eigenaar' || prof.role === 'team'))

    const body = await req.json().catch(() => ({}))
    const operatorEmail = Deno.env.get('OPERATOR_EMAIL') || 'info@homeinn.nl'

    let to: string, subject: string, html: string, kind: string
    if (staff) {
      // staf mag naar een opgegeven adres en met eigen HTML (portaal en adminpaneel)
      to = String(body.to || operatorEmail).trim()
      subject = eenRegel(body.subject || 'HomeINN melding', 160) || 'HomeINN melding'
      html = String(body.html || body.text || '')
      kind = eenRegel(body.kind || 'notify', 40) || 'notify'
    } else {
      const { data: woning } = await admin.from('hios_properties').select('id').eq('tenant_profile_id', user.id).limit(1)
      if (!woning || !woning.length) return json({ error: 'alleen staf en huurders kunnen meldingen sturen' }, 403)

      const { count } = await admin.from('hios_emails')
        .select('id', { count: 'exact', head: true })
        .eq('meta->>uid', user.id)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      if ((count || 0) >= MAX_PER_UUR) return json({ error: 'te veel meldingen; probeer het over een uur opnieuw' }, 429)

      to = operatorEmail
      subject = eenRegel(body.subject || 'HomeINN melding', 160) || 'HomeINN melding'
      const tekst = naarPlatteTekst(String(body.text || body.html || '')).slice(0, MAX_TEKST)
      html = `<p style="white-space:pre-wrap">${esc(tekst)}</p>` +
        `<p style="color:#7b8695;font-size:12px">Verstuurd vanuit het huurdersportaal door ${esc(user.email || user.id)}.</p>`
      kind = 'huurder-melding'
    }
    if (!to) return json({ error: 'no recipient (OPERATOR_EMAIL niet ingesteld)' }, 400)

    const log = (status: string, extra: Record<string, unknown> = {}) =>
      admin.from('hios_emails').insert({
        kind, to_email: to, subject, status,
        provider_id: (extra.provider_id as string) || null,
        error: (extra.error as string) || null,
        meta: { by: user.email || null, uid: user.id, staff }
      })

    const key = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('FROM_EMAIL') || 'HomeINN <onboarding@resend.dev>'
    if (!key) {
      await log('overgeslagen', { error: 'RESEND_API_KEY niet ingesteld' })
      return json({ skipped: true, reason: 'RESEND_API_KEY niet ingesteld' })
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html: html || esc(subject) })
    })
    const out = await r.json().catch(() => ({}))
    await log(r.ok ? 'verzonden' : 'mislukt', {
      provider_id: out?.id, error: r.ok ? null : JSON.stringify(out).slice(0, 500)
    })
    return json({ ok: r.ok, result: out }, r.ok ? 200 : 502)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
