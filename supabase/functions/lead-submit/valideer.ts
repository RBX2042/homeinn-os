/* Invoercontrole voor lead-submit. Bewust zonder Deno-specifieke code, zodat het ook met Node te
   testen is (valideer.test.mjs). Zelfde grenzen als de CHECK hios_leads_lengte en de BEFORE
   INSERT-trigger in de database; de database blijft de laatste controle. */

/* LET OP: bij elke nieuwe domeinnaam of alias van de website hier toevoegen. Een bezoeker van een
   niet-vermelde site krijgt 403: de aanvraag komt dan alleen per e-mail (FormSubmit) binnen. */
export const TOEGESTANE_ORIGINS = [
  'https://homeinn.nl',
  'https://www.homeinn.nl',
  'https://home-inn.nl',
  'https://www.home-inn.nl',
  'https://homeinn.vercel.app',
  'https://rbx2042.github.io',
]

export const LOCAL_ID_RE = /^lead[a-z0-9]{4,24}$/
const MAX: Record<string, number> = { type: 80, source: 300, name: 200, email: 254, phone: 100, subject: 300, message: 5000, portfolio: 300 }
const VELDEN = ['type', 'source', 'name', 'email', 'phone', 'subject', 'message', 'portfolio'] as const

export type Lead = Record<string, string>
export type Uitkomst = { ok: true; lead: Lead } | { ok: false; reden: string }

/* Tekens als in Postgres: NUL weg (Postgres weigert dat in tekst), losse surrogaathelften worden
   een vervangteken, en te lang wordt ingekort. */
export function schoon(v: unknown, max: number): string {
  const s = (v == null ? '' : String(v)).replace(/\u0000/g, '').trim()
  const tekens = Array.from(s, (c) => {
    const n = c.charCodeAt(0)
    return c.length === 1 && n >= 0xd800 && n <= 0xdfff ? '�' : c
  })
  return (tekens.length > max ? tekens.slice(0, max) : tekens).join('')
}

/* Bewust ruim: de formulieren (HTML5 type=email) laten ook 'jan@bedrijf' toe. Alleen een aanvraag
   waarvan zowel e-mail als telefoon leeg is, heeft geen waarde. Of er een bevestiging gemaild wordt,
   beslist lead-notify met zijn eigen, strengere adrescontrole. */
export function maakLead(invoer: unknown): Uitkomst {
  if (invoer === null || typeof invoer !== 'object' || Array.isArray(invoer)) return { ok: false, reden: 'geen object' }
  const i = invoer as Record<string, unknown>
  const lead: Lead = {}
  for (const k of VELDEN) {
    const v = i[k]
    if (v != null && typeof v !== 'string' && typeof v !== 'number') return { ok: false, reden: 'ongeldig veld ' + k }
    lead[k] = schoon(v, MAX[k])
  }
  const lid = typeof i.local_id === 'string' ? i.local_id : ''
  lead.local_id = LOCAL_ID_RE.test(lid) ? lid : ''
  if (!lead.type) lead.type = 'Contact'
  if (!lead.email && !lead.phone) return { ok: false, reden: 'geen e-mailadres of telefoonnummer' }
  if (!lead.name && !lead.message) return { ok: false, reden: 'geen naam of bericht' }
  return { ok: true, lead }
}

/* Het IP-bereik waarop we limiteren. IPv4: het adres. IPv6: het /64-voorvoegsel (elke aansluiting
   heeft er minstens één; zonder bereik zou één aansluiting 2^64 'adressen' hebben) in vaste
   schrijfwijze, zodat '2001:DB8:1:2:0:0:0:1' en '2001:db8:1:2::1' hetzelfde bereik zijn. */
export function ipBucket(ip: string): string {
  const a = ip.trim().toLowerCase().replace(/%.*$/, '')
  if (!a.includes(':')) return a
  const gemapt = a.match(/^(?:0{0,4}:){0,5}:?ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (gemapt) return gemapt[1]
  const delen = a.split('::')
  if (delen.length > 2) return a
  const kop = delen[0] ? delen[0].split(':') : []
  const staart = delen.length === 2 && delen[1] ? delen[1].split(':') : []
  const vul = delen.length === 2 ? 8 - kop.length - staart.length : 0
  if (vul < 0 || (delen.length === 1 && kop.length !== 8)) return a
  const groepen = [...kop, ...Array(vul).fill('0'), ...staart]
  return groepen.slice(0, 4).map((g) => parseInt(g || '0', 16).toString(16)).join(':') + '::/64'
}

/* Alleen cf-connecting-ip: Cloudflare zet die en weigert een door de bezoeker meegestuurde waarde
   (403, fout 1000). x-forwarded-for en x-real-ip kan een bezoeker wél vervalsen, of ze bevatten het
   adres van de proxy. Zonder cf-connecting-ip: null, en dan geldt alleen de limiet voor de hele site. */
export function bepaalIp(h: { get(naam: string): string | null }): string | null {
  const cf = (h.get('cf-connecting-ip') || '').trim()
  return cf ? ipBucket(cf) : null
}

/* Een webbrowser stuurt bij een POST naar een ander domein altijd een Origin mee. Zonder Origin is het
   een script, en die kunnen we weigeren. Dit beschermt niet tegen een gericht script (die kan elke
   Origin sturen), maar wel tegen misbruik van bezoekers van andere websites. */
export function origineToegestaan(origin: string | null): boolean {
  return !!origin && TOEGESTANE_ORIGINS.includes(origin)
}
