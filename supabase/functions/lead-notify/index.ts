import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* HomeINN — lead-notify
   Wordt aangeroepen door de database-trigger op hios_leads (pg_net), dus zonder JWT.
   Beveiliging zit in de idempotentie: er gaat alleen mail uit voor een lead die
   (a) bestaat, (b) nog geen notified_at heeft en (c) jonger is dan een dag.
   Een tweede aanroep met hetzelfde id doet niets meer, dus het endpoint is niet
   bruikbaar om mail mee te genereren.

   Verstuurt twee mails via Resend:
     1. intern alarm naar OPERATOR_EMAIL (met alle velden + link naar het adminpaneel)
     2. ontvangstbevestiging naar de aanvrager (NL of EN, op basis van de bronpagina)
   Beide worden gelogd in hios_emails, ook als ze mislukken. */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

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

function bevestigingHtml(l: Record<string, unknown>, en: boolean) {
  const naam = String(l.name || '').split(' ')[0]
  return en
    ? shell(`<h1 style="margin:0 0 12px;font-size:20px">Thank you${naam ? ', ' + esc(naam) : ''}</h1>
        <p style="margin:0 0 12px">We have received your request and will get back to you within one business day.</p>
        ${l.message ? `<p style="margin:0 0 12px;color:#7b8695;font-size:13px">Your message:</p><p style="margin:0;white-space:pre-wrap;background:#f7f8fa;border-radius:10px;padding:14px;font-size:14px">${esc(l.message)}</p>` : ''}
        <p style="margin:20px 0 0">Kind regards,<br><strong>HomeINN</strong></p>`)
    : shell(`<h1 style="margin:0 0 12px;font-size:20px">Bedankt${naam ? ', ' + esc(naam) : ''}</h1>
        <p style="margin:0 0 12px">We hebben uw aanvraag ontvangen en nemen binnen één werkdag contact met u op.</p>
        ${l.message ? `<p style="margin:0 0 12px;color:#7b8695;font-size:13px">Uw bericht:</p><p style="margin:0;white-space:pre-wrap;background:#f7f8fa;border-radius:10px;padding:14px;font-size:14px">${esc(l.message)}</p>` : ''}
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
    if (!lead_id) return json({ error: 'lead_id ontbreekt' }, 400)

    const { data: lead } = await admin.from('hios_leads').select('*').eq('id', lead_id).maybeSingle()
    if (!lead) return json({ skipped: 'lead niet gevonden' })
    if (lead.notified_at) return json({ skipped: 'al gemeld' })
    if (new Date(lead.created_at).getTime() < Date.now() - 86400000) return json({ skipped: 'te oud' })

    // meteen markeren: voorkomt dubbele mail bij een herhaalde aanroep
    await admin.from('hios_leads').update({ notified_at: new Date().toISOString() }).eq('id', lead_id)

    const key = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('FROM_EMAIL') || 'HomeINN <onboarding@resend.dev>'
    const operator = Deno.env.get('OPERATOR_EMAIL') || 'info@homeinn.nl'
    const adminUrl = (Deno.env.get('ADMIN_URL') || 'https://homeinn.nl/admin.html') + '#leads'
    const en = /-en(\.html)?$/.test(String(lead.source || '')) || /\/en\//.test(String(lead.source || ''))

    async function verstuur(kind: string, to: string, subject: string, html: string) {
      if (!to) return
      if (!key) {
        await admin.from('hios_emails').insert({ kind, to_email: to, subject, status: 'overgeslagen', error: 'RESEND_API_KEY niet ingesteld', meta: { lead_id } })
        return
      }
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, subject, html, reply_to: kind === 'lead-alert' && lead.email ? lead.email : undefined })
        })
        const out = await r.json().catch(() => ({}))
        await admin.from('hios_emails').insert({
          kind, to_email: to, subject,
          status: r.ok ? 'verzonden' : 'mislukt',
          provider_id: out?.id || null,
          error: r.ok ? null : JSON.stringify(out).slice(0, 500),
          meta: { lead_id }
        })
      } catch (e) {
        await admin.from('hios_emails').insert({ kind, to_email: to, subject, status: 'mislukt', error: String(e).slice(0, 500), meta: { lead_id } })
      }
    }

    await verstuur('lead-alert', operator,
      `Nieuwe aanvraag: ${lead.type || 'Contact'}${lead.name ? ' — ' + lead.name : ''}`,
      internHtml(lead, adminUrl))

    if (lead.email && /@/.test(lead.email)) {
      await verstuur('lead-bevestiging', lead.email,
        en ? 'We received your request — HomeINN' : 'Wij hebben uw aanvraag ontvangen — HomeINN',
        bevestigingHtml(lead, en))
    }
    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
