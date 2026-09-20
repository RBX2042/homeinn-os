import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// HomeINN notificaties via Resend. Niet-staf mag alleen de operator pingen (anti-misbruik).
// v2 (20 september 2026): elke verzending wordt gelogd in hios_emails voor het adminpaneel.
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

    const body = await req.json().catch(() => ({}))
    const operatorEmail = Deno.env.get('OPERATOR_EMAIL') || 'info@homeinn.nl'
    // niet-staf mag uitsluitend naar de operator; staf mag naar een opgegeven adres
    const to = staff ? (body.to || operatorEmail) : operatorEmail
    const subject = String(body.subject || 'HomeINN melding').slice(0, 160)
    const html = String(body.html || body.text || '')
    const kind = String(body.kind || 'notify').slice(0, 40)
    if (!to) return new Response(JSON.stringify({ error: 'no recipient (OPERATOR_EMAIL niet ingesteld)' }), { status: 400, headers: cors })

    const log = (status: string, extra: Record<string, unknown> = {}) =>
      admin.from('hios_emails').insert({
        kind, to_email: to, subject, status,
        provider_id: (extra.provider_id as string) || null,
        error: (extra.error as string) || null,
        meta: { by: user.email || null, staff }
      })

    const key = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('FROM_EMAIL') || 'HomeINN <onboarding@resend.dev>'
    if (!key) {
      await log('overgeslagen', { error: 'RESEND_API_KEY niet ingesteld' })
      return new Response(JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY niet ingesteld' }), { headers: cors })
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html: html || subject })
    })
    const out = await r.json().catch(() => ({}))
    await log(r.ok ? 'verzonden' : 'mislukt', {
      provider_id: out?.id, error: r.ok ? null : JSON.stringify(out).slice(0, 500)
    })
    return new Response(JSON.stringify({ ok: r.ok, result: out }), { status: r.ok ? 200 : 502, headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
