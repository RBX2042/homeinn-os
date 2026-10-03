import { bepaalIp, maakLead, origineToegestaan, TOEGESTANE_ORIGINS } from './valideer.ts'

/* HomeINN — lead-submit
   De route waarlangs de website een aanvraag in hios_leads zet. Zonder JWT (verify_jwt = false, zie
   supabase/config.toml): bezoekers zijn anoniem. Per IP-bereik (IPv6 als /64, gehasht met HMAC; het
   adres zelf wordt nergens door ons bewaard) en voor de hele site geldt een limiet; de telling en de
   insert gebeuren in één transactie in public.hios_lead_submit(). Boven de sitelimiet wordt een
   aanvraag in quarantaine gezet (status 'spamverdacht', geen mail) in plaats van geweigerd.
   De aanroep is een 'simple request' (Content-Type text/plain): geen CORS-preflight.
   Bewust geen supabase-js: één fetch naar PostgREST. Geen externe import bij het opstarten.

   Antwoorden:  201 {ok:true}           aanvraag opgeslagen (ook een quarantaine-aanvraag)
                200 {ok:true,dubbel}    dezelfde aanvraag stond er al
                400 {ok:false,reden}    ongeldige invoer
                403                     afzender-website niet toegestaan
                413                     te groot
                429 {ok:false,reden}    limiet per IP-bereik of hard plafond voor de hele site
                500                     onverwachte fout (lead-cloud.js valt dan terug op de directe insert)

   GEZONDHEIDSCONTROLE: POST {"type":"__gezondheid"} geeft 200 {ok:true} als de function, de service-
   sleutel en de database-aanroep werken, zonder iets in te voeren. De dagelijkse GitHub-workflow
   gebruikt dat. */

const MAX_BYTES = 65536 // 5000 tekens x 4 bytes + overige velden, JSON-escaped

async function leesBeperkt(req: Request, max: number): Promise<string | null> {
  const cl = Number(req.headers.get('content-length'))
  if (Number.isFinite(cl) && cl > max) return null
  const reader = req.body?.getReader()
  if (!reader) return ''
  const delen: Uint8Array[] = []
  let n = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    n += value.byteLength
    if (n > max) { await reader.cancel(); return null }
    delen.push(value)
  }
  const alles = new Uint8Array(n)
  let o = 0
  for (const d of delen) { alles.set(d, o); o += d.byteLength }
  return new TextDecoder().decode(alles)
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors: Record<string, string> = origin && TOEGESTANE_ORIGINS.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    : { 'Vary': 'Origin' }
  const antwoord = (b: unknown, status: number, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } })

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' } })
  }
  if (req.method !== 'POST') return antwoord({ ok: false, reden: 'alleen POST' }, 405, { Allow: 'POST, OPTIONS' })
  if (!origineToegestaan(origin)) return antwoord({ ok: false, reden: 'afzender niet toegestaan' }, 403)

  try {
    const tekst = await leesBeperkt(req, MAX_BYTES)
    if (tekst === null) return antwoord({ ok: false, reden: 'te groot' }, 413)
    let invoer: unknown
    try { invoer = JSON.parse(tekst) } catch { return antwoord({ ok: false, reden: 'geen geldige JSON' }, 400) }

    const url = Deno.env.get('SUPABASE_URL')!
    const sleutel = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const rpc = async (ipHash: string, p: unknown): Promise<{ data?: string; fout?: string }> => {
      const r = await fetch(url + '/rest/v1/rpc/hios_lead_submit', {
        method: 'POST',
        headers: { apikey: sleutel, Authorization: 'Bearer ' + sleutel, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_ip_hash: ipHash, p }),
      })
      if (!r.ok) return { fout: 'rpc ' + r.status + ' ' + (await r.text()).slice(0, 200) }
      return { data: await r.json() }
    }

    // Gezondheidscontrole: een lege aanroep die de database laat antwoorden 'ongeldig'.
    if (invoer && typeof invoer === 'object' && (invoer as Record<string, unknown>).type === '__gezondheid') {
      const g = await rpc('', {})
      if (g.fout || g.data !== 'ongeldig') { console.error('gezondheidscontrole mislukt:', g.fout || g.data); return antwoord({ ok: false }, 500) }
      return antwoord({ ok: true }, 200)
    }

    const lead = maakLead(invoer)
    if (!lead.ok) return antwoord({ ok: false, reden: lead.reden }, 400)

    // IP-bereik hashen met HMAC (geheim: LEAD_IP_SALT, anders de service-sleutel). Zonder
    // cf-connecting-ip geldt alleen de limiet voor de hele site ('geen-ip').
    const ip = bepaalIp(req.headers)
    let ipHash = 'geen-ip'
    if (ip) {
      const geheim = new TextEncoder().encode(Deno.env.get('LEAD_IP_SALT') || sleutel)
      const hmac = await crypto.subtle.importKey('raw', geheim, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const handtekening = await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(ip))
      ipHash = Array.from(new Uint8Array(handtekening)).map((b) => b.toString(16).padStart(2, '0')).join('')
    } else {
      console.error('lead-submit: geen cf-connecting-ip ontvangen; alleen de limiet voor de hele site geldt')
    }

    const res = await rpc(ipHash, lead.lead)
    if (res.fout) { console.error('hios_lead_submit mislukt:', res.fout); return antwoord({ ok: false, reden: 'opslaan mislukt' }, 500) }
    switch (res.data) {
      case 'ok': return antwoord({ ok: true }, 201)
      case 'dubbel': return antwoord({ ok: true, dubbel: true }, 200)
      case 'limiet_ip': return antwoord({ ok: false, reden: 'te veel aanvragen vanaf dit adres' }, 429, { 'Retry-After': '3600' })
      case 'limiet_algemeen': return antwoord({ ok: false, reden: 'het aanvraagformulier is tijdelijk druk' }, 429, { 'Retry-After': '600' })
      default: return antwoord({ ok: false, reden: 'ongeldig' }, 400)
    }
  } catch (e) {
    console.error('lead-submit fout:', e instanceof Error ? e.message : String(e))
    return antwoord({ ok: false, reden: 'onverwachte fout' }, 500)
  }
})
