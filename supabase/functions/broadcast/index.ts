import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// HomeINN bulk-mailing (nieuwsbrief). ALLEEN staff. Verstuurt per ontvanger (privacy).
// v2 (20 september 2026): elke ontvanger wordt gelogd in hios_emails, zodat het
// adminpaneel laat zien wie wat heeft gekregen en welke adressen faalden.
Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })
    const admin = createClient(url, service)
    const { data: prof } = await admin.from('hios_profiles').select('role').eq('id', user.id).maybeSingle()
    const staff = !!(prof && (prof.role === 'eigenaar' || prof.role === 'team'))
    if (!staff) return new Response(JSON.stringify({ error: 'alleen eigenaar/team mag mailen' }), { status: 403, headers: cors })

    const body = await req.json().catch(() => ({}))
    const subject = String(body.subject || 'HomeINN').slice(0, 160)
    const html = String(body.html || '')
    const kind = String(body.kind || 'broadcast').slice(0, 40)
    let recipients: string[] = Array.isArray(body.recipients) ? body.recipients : []
    // ontdubbel + valideer + cap
    const seen = new Set<string>()
    recipients = recipients
      .map((e) => String(e || '').trim().toLowerCase())
      .filter((e) => /.+@.+\..+/.test(e) && !seen.has(e) && (seen.add(e), true))
      .slice(0, 500)
    if (!recipients.length) return new Response(JSON.stringify({ error: 'geen geldige ontvangers' }), { status: 400, headers: cors })

    const key = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('FROM_EMAIL') || 'HomeINN <onboarding@resend.dev>'
    if (!key) {
      await admin.from('hios_emails').insert(recipients.map((to) => ({
        kind, to_email: to, subject, status: 'overgeslagen',
        error: 'RESEND_API_KEY niet ingesteld', meta: { by: user.email || null }
      })))
      return new Response(JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY niet ingesteld', wouldSend: recipients.length }), { headers: cors })
    }

    let sent = 0, failed = 0
    const rows: Record<string, unknown>[] = []
    for (const to of recipients) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, subject, html })
        })
        const out = await r.json().catch(() => ({}))
        r.ok ? sent++ : failed++
        rows.push({
          kind, to_email: to, subject, status: r.ok ? 'verzonden' : 'mislukt',
          provider_id: out?.id || null, error: r.ok ? null : JSON.stringify(out).slice(0, 500),
          meta: { by: user.email || null }
        })
      } catch (e) {
        failed++
        rows.push({ kind, to_email: to, subject, status: 'mislukt', error: String(e).slice(0, 500), meta: { by: user.email || null } })
      }
    }
    if (rows.length) await admin.from('hios_emails').insert(rows)
    return new Response(JSON.stringify({ ok: true, sent, failed, total: recipients.length }), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
