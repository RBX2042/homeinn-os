// Draaien met:  node --experimental-strip-types supabase/functions/lead-submit/valideer.test.mjs   (Node 22.6+)
import assert from 'node:assert/strict'
import { maakLead, bepaalIp, ipBucket, origineToegestaan, schoon } from './valideer.ts'

const basis = { local_id: 'leadabc12345', type: 'Contact', source: 'contact.html', name: 'Jan', email: 'jan@voorbeeld.nl', phone: '', subject: 's', message: 'm', portfolio: '' }
const ok = (x) => { const r = maakLead(x); assert.equal(r.ok, true, JSON.stringify(r)); return r.lead }
const fout = (x) => { const r = maakLead(x); assert.equal(r.ok, false); return r.reden }

// gewone aanvraag
assert.equal(ok(basis).email, 'jan@voorbeeld.nl')
// onbekende velden (created_at, status, handled) worden niet doorgegeven
const l = ok({ ...basis, created_at: '2099-01-01', status: 'afgehandeld', handled: true, notified_at: 'x', id: 'abc' })
assert.deepEqual(Object.keys(l).sort(), ['email', 'local_id', 'message', 'name', 'phone', 'portfolio', 'source', 'subject', 'type'])
// HTML in local_id -> leeg; geldig formaat blijft
assert.equal(ok({ ...basis, local_id: 'x"><img src=x onerror=alert(1)>' }).local_id, '')
assert.equal(ok(basis).local_id, 'leadabc12345')
// NUL-tekens en lange teksten
assert.equal(ok({ ...basis, message: 'a\u0000b' }).message, 'ab')
assert.equal(ok({ ...basis, message: 'x'.repeat(9000) }).message.length, 5000)
assert.equal(schoon('\ud800', 5), '�')
// alleen een aanvraag zonder e-mail ÉN telefoon wordt geweigerd; formaat maakt niet uit
assert.match(fout({ ...basis, email: '', phone: '' }), /e-mailadres of telefoon/)
assert.equal(ok({ ...basis, email: '', phone: '0612345678' }).phone, '0612345678')
assert.equal(ok({ ...basis, email: 'jan@gmail', phone: '' }).email, 'jan@gmail')          // HTML5 laat dit toe
assert.equal(ok({ ...basis, email: 'jan@example.xn--p1ai', phone: '' }).email, 'jan@example.xn--p1ai')
assert.equal(ok({ ...basis, email: '', phone: '12' }).phone, '12')
assert.match(fout({ ...basis, name: '', message: '' }), /naam of bericht/)
// ongeldige vormen
for (const x of [null, [], 'tekst', 5, undefined]) assert.equal(maakLead(x).ok, false)
assert.match(fout({ ...basis, name: { a: 1 } }), /ongeldig veld name/)
assert.equal(ok({ ...basis, type: '' }).type, 'Contact')

// IPv6 wordt één bereik (/64), welke schrijfwijze ook
assert.equal(ipBucket('2001:db8:1:2::1'), '2001:db8:1:2::/64')
assert.equal(ipBucket('2001:DB8:1:2:ffff:ffff:ffff:ffff'), '2001:db8:1:2::/64')
assert.equal(ipBucket('2001:db8:1:2:0:0:0:1'), '2001:db8:1:2::/64')
assert.equal(ipBucket('2001:db8:1:3::1'), '2001:db8:1:3::/64')            // ander /64 = ander bereik
assert.equal(ipBucket('::ffff:203.0.113.7'), '203.0.113.7')               // IPv4 in IPv6
assert.equal(ipBucket('203.0.113.7'), '203.0.113.7')
assert.equal(ipBucket('fe80::1%eth0'), 'fe80:0:0:0::/64')
// alleen cf-connecting-ip; x-forwarded-for en x-real-ip kunnen vervalst of een proxy zijn
const h = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null })
assert.equal(bepaalIp(h({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9, 5.6.7.8' })), '1.2.3.4')
assert.equal(bepaalIp(h({ 'cf-connecting-ip': '2001:db8:1:2::9' })), '2001:db8:1:2::/64')
assert.equal(bepaalIp(h({ 'x-forwarded-for': '9.9.9.9, 5.6.7.8' })), null)
assert.equal(bepaalIp(h({ 'x-real-ip': '9.9.9.9' })), null)
assert.equal(bepaalIp(h({})), null)
// origin: verplicht en op de lijst
assert.equal(origineToegestaan('https://homeinn.nl'), true)
assert.equal(origineToegestaan('https://rbx2042.github.io'), true)
assert.equal(origineToegestaan(null), false)
assert.equal(origineToegestaan('null'), false)
assert.equal(origineToegestaan('https://kwaadaardig.example'), false)
console.log('valideer.test.mjs: alle controles geslaagd')
