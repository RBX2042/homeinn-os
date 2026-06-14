/* ============================================================
   HomeINN OS — Vastgoedportaal
   Aankoop, projectontwikkeling en verkoop van panden.
   Alle data wordt lokaal opgeslagen (localStorage).
   ============================================================ */

const STORAGE_KEY = 'homeinn-os-v3';
const INBOX_KEY = 'homeinn-inbox-v1'; // gedeeld met de website (homeinn-public.js)

/* ---------- Helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function uid(prefix = 'id') {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

function pad(n) { return String(n).padStart(2, '0'); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekStartISO(offset = 0) {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // ma = 0
  d.setDate(d.getDate() - day + offset * 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function fmtDayLabel(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtMoney(n) {
  const value = Number(n) || 0;
  const digits = Math.abs(value % 1) > 0.004 ? 2 : 0;
  return value.toLocaleString('nl-NL', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: digits, maximumFractionDigits: digits
  });
}

function fmtMoneyK(n) {
  const value = Number(n) || 0;
  if (Math.abs(value) >= 100000) return '€ ' + (value / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 }) + 'k';
  return fmtMoney(value);
}

function fmtNum(n, dec = 1) {
  return (Number(n) || 0).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

function daysBetween(isoA, isoB) {
  return Math.round((new Date(isoB + 'T12:00:00') - new Date(isoA + 'T12:00:00')) / 86400000);
}

function monthsBetween(isoA, isoB) {
  if (!isoA || !isoB) return 0;
  return Math.max(0, daysBetween(isoA, isoB) / 30.44);
}

const DEFAULT_DOCS = ['Koopakte', 'Leveringsakte / eigendomsbewijs', 'Taxatierapport', 'Energielabel', 'Bouwkundige keuring', 'Splitsingsakte / VvE-stukken', 'Opstalverzekering', 'Financieringsakte'];
const DEFAULT_PHASES = ['Voorbereiding', 'Vergunning & ontwerp', 'Sloop & ruwbouw', 'Installaties', 'Afbouw', 'Styling & oplevering'];

/* ---------- Seed data (demo) ---------- */
function seedData() {
  const t = todayISO();
  return {
    version: 3,
    lastBackup: '',
    settings: {
      companyName: 'HomeINN', address: 'Rotterdam', email: 'info@homeinn.nl', phone: '[TELEFOON]',
      kvk: '[KVK-NUMMER]', btw: '[BTW-NUMMER]',
      otbPct: 8, notaris: 1500, makelaarPct: 1, rentePct: 6, vasteLasten: 300, verkoopkostenPct: 1.25, doelROI: 15
    },
    contacts: [
      { id: 'r1', type: 'Makelaar', name: 'Makelaarskantoor A', contact: 'Contactpersoon', email: 'aankoop@voorbeeld-makelaar.nl', phone: '010-0000001', address: 'Rotterdam', note: 'Brengt off-market portiekpanden. Snel schakelen.' },
      { id: 'r2', type: 'Makelaar', name: 'Makelaarskantoor B', contact: 'Contactpersoon', email: 'verkoop@voorbeeld-makelaar.nl', phone: '010-0000002', address: 'Rotterdam', note: 'Verkopend makelaar van onze panden. Courtage 1,1%.' },
      { id: 'r3', type: 'Notaris', name: 'Notariskantoor A', contact: 'Contactpersoon', email: 'vastgoed@voorbeeld-notaris.nl', phone: '010-0000003', address: 'Rotterdam', note: 'Vaste notaris. Passeert binnen 2 weken.' },
      { id: 'r4', type: 'Aannemer', name: 'Bouwbedrijf A', contact: 'Contactpersoon', email: 'planning@voorbeeld-bouw.nl', phone: '010-0000004', address: 'Schiedam', note: 'Hoofdaannemer renovaties. Plant 4-6 wkn vooruit.' },
      { id: 'r5', type: 'Aannemer', name: 'Installatiebedrijf A', contact: 'Contactpersoon', email: 'service@voorbeeld-installatie.nl', phone: '010-0000005', address: 'Rotterdam-Zuid', note: 'W/E-installaties, ook keuringen.' },
      { id: 'r6', type: 'Financier', name: 'Vastgoedfinanciering A', contact: 'Contactpersoon', email: 'krediet@voorbeeld-financier.nl', phone: '010-0000006', address: 'Rotterdam', note: 'Bridge- en ontwikkelfinanciering, 70-80% LTV.' },
      { id: 'r7', type: 'Koper/Verkoper', name: 'Belangstellende A', contact: 'Belangstellende A', email: 'belangstellende-a@voorbeeld.nl', phone: '06-00000001', address: '', note: 'Bod uitgebracht op Laan op Zuid 304.' },
      { id: 'r8', type: 'Overig', name: 'Taxatiebureau A', contact: 'Contactpersoon', email: 'taxatie@voorbeeld-taxatie.nl', phone: '010-0000007', address: 'Rotterdam', note: 'Gevalideerde taxaties binnen 5 werkdagen.' },
      { id: 'r9', type: 'Aannemer', name: 'Afbouwbedrijf A', contact: 'Contactpersoon', email: 'afbouw@voorbeeld-bouw.nl', phone: '06-00000002', address: 'Schiedam', note: 'Afbouw en styling richting oplevering.' }
    ],
    deals: [
      {
        id: 'd1', ref: 'AK-2026-007', address: 'Schiedamseweg 77C', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Lead', vraagprijs: 285000, makelaarId: 'r1', viewingDate: '', source: 'Off-market via makelaar',
        createdAt: addDaysISO(t, -2), note: 'Verhuurd geweest, gedateerd. Mogelijk snel te schakelen.',
        calc: { koopsom: 262000, verbouwing: 60000, verkoopprijs: 425000, maanden: 8 }, biedingen: []
      },
      {
        id: 'd2', ref: 'AK-2026-006', address: 'Bergselaan 110B', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Bezichtiging', vraagprijs: 310000, makelaarId: 'r2', viewingDate: addDaysISO(t, 1), source: 'Funda',
        createdAt: addDaysISO(t, -6), note: 'Dubbel bovenhuis, dak in 2021 vernieuwd. Bezichtiging do.',
        calc: { koopsom: 287000, verbouwing: 55000, verkoopprijs: 449000, maanden: 9 }, biedingen: []
      },
      {
        id: 'd3', ref: 'AK-2026-005', address: 'Noordsingel 84', city: 'Rotterdam', ptype: 'Eengezinswoning',
        status: 'Bod uitgebracht', vraagprijs: 325000, makelaarId: 'r1', viewingDate: addDaysISO(t, -8), source: 'Netwerk',
        createdAt: addDaysISO(t, -14), note: 'Casco prima, indeling wijzigen. Verkoper wil snel.',
        calc: { koopsom: 295000, verbouwing: 70000, verkoopprijs: 495000, maanden: 10 },
        biedingen: [
          { id: 'b1', date: addDaysISO(t, -7), amount: 282000, validUntil: addDaysISO(t, -3), status: 'Afgewezen', note: 'Onder voorbehoud financiering' },
          { id: 'b2', date: addDaysISO(t, -4), amount: 295000, validUntil: addDaysISO(t, -1), status: 'Uitgebracht', note: 'Zonder voorbehoud, passeren binnen 6 wkn' }
        ]
      },
      {
        id: 'd4', ref: 'AK-2026-004', address: 'Mathenesserweg 51A', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Onder voorbehoud', vraagprijs: 250000, makelaarId: 'r2', viewingDate: addDaysISO(t, -20), source: 'Funda',
        createdAt: addDaysISO(t, -28), note: 'Koopovereenkomst getekend o.v.v. financiering — stukken vóór 20-06 bij de financier.',
        calc: { koopsom: 240000, verbouwing: 45000, verkoopprijs: 365000, maanden: 8 },
        biedingen: [{ id: 'b3', date: addDaysISO(t, -16), amount: 240000, validUntil: addDaysISO(t, -12), status: 'Geaccepteerd', note: 'O.v.v. financiering' }]
      },
      {
        id: 'd5', ref: 'AK-2026-003', address: 'Wolphaertsbocht 219', city: 'Rotterdam', ptype: 'Portiekpand',
        status: 'Notaris', vraagprijs: 210000, makelaarId: 'r1', viewingDate: addDaysISO(t, -35), source: 'Veiling',
        createdAt: addDaysISO(t, -42), note: 'Passeert 24-06 bij de notaris.',
        calc: { koopsom: 198000, verbouwing: 85000, verkoopprijs: 392000, maanden: 12 },
        biedingen: [{ id: 'b4', date: addDaysISO(t, -30), amount: 198000, validUntil: addDaysISO(t, -26), status: 'Geaccepteerd', note: 'Veilingbod' }]
      },
      {
        id: 'd6', ref: 'AK-2026-002', address: 'Zwart Janstraat 140', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Afgehaakt', vraagprijs: 295000, makelaarId: 'r2', viewingDate: addDaysISO(t, -50), source: 'Funda',
        createdAt: addDaysISO(t, -55), note: 'Funderingsrisico te hoog, VvE zonder reserves.',
        calc: { koopsom: 270000, verbouwing: 90000, verkoopprijs: 430000, maanden: 12 },
        biedingen: [{ id: 'b5', date: addDaysISO(t, -48), amount: 255000, validUntil: addDaysISO(t, -44), status: 'Verlopen', note: '' }]
      }
    ],
    properties: [
      {
        id: 'pnd1', ref: 'PND-2026-004', address: 'Kralingse Plaslaan 22', city: 'Rotterdam', ptype: 'Eengezinswoning',
        status: 'In ontwikkeling', label: '', taxatie: 565000, taxatieDatum: addDaysISO(t, -21),
        vraagprijs: 0, teKoopSinds: '',
        purchase: { date: addDaysISO(t, -84), koopsom: 385000, otb: 30800, notaris: 1520, makelaar: 3850, overig: 950 },
        financing: { financierId: 'r6', bedrag: 300000, rentePct: 6.2, einddatum: addDaysISO(t, 290) },
        vasteLasten: 320, maandhuur: 0, huurder: '', m2: 148, kamers: 5,
        fotos: ['fotos/kralingse-plaslaan-1.svg'],
        webOmschrijving: 'Karakteristieke eengezinswoning aan de Kralingse Plas, volledig gerenoveerd met uitbouw en energielabel A. Binnenkort in verkoop.',
        sale: null, dealId: 'd-oud1',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc1' + i, name, done: i < 3 })),
        viewings: [], offers: [],
        verzekeringen: [{ id: 'vz1', type: 'Bouw / CAR', verzekeraar: 'Bouwgarant', polis: 'CAR-2026-0014', premie: 980, start: addDaysISO(t, -84), eind: addDaysISO(t, 281) }],
        note: 'Volledige renovatie, daarna verkoop. Taxatie na renovatie € 565k.'
      },
      {
        id: 'pnd2', ref: 'PND-2025-011', address: 'Laan op Zuid 304', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Te koop', label: 'A', taxatie: 410000, taxatieDatum: addDaysISO(t, -40),
        vraagprijs: 415000, teKoopSinds: addDaysISO(t, -26),
        purchase: { date: addDaysISO(t, -208), koopsom: 275000, otb: 28600, notaris: 1380, makelaar: 2750, overig: 600 },
        financing: { financierId: 'r6', bedrag: 220000, rentePct: 6.4, einddatum: addDaysISO(t, 150) },
        vasteLasten: 290, maandhuur: 0, huurder: '', m2: 92, kamers: 3,
        fotos: ['fotos/laan-op-zuid-1.svg', 'fotos/laan-op-zuid-2.svg', 'fotos/laan-op-zuid-3.svg', 'fotos/laan-op-zuid-4.svg'],
        webOmschrijving: 'Volledig gerenoveerd 3-kamerappartement op de Kop van Zuid. Nieuwe installaties, warmtepomp, energielabel A en hoogwaardige afwerking — direct te betrekken.',
        sale: null, dealId: 'd-oud2',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc2' + i, name, done: true })),
        viewings: [
          { id: 'v1', date: addDaysISO(t, -9), name: 'Belangstellende B (via makelaar)', note: 'Serieus, tweede bezichtiging aangevraagd' },
          { id: 'v2', date: addDaysISO(t, -4), name: 'Belangstellende A', note: 'Direct geïnteresseerd, financiering rond' }
        ],
        offers: [{ id: 'o1', date: addDaysISO(t, -2), name: 'Belangstellende A', amount: 392000, status: 'Ontvangen', note: 'Zonder voorbehoud' }],
        advertenties: [
          { id: 'ad1', kanaal: 'Funda', doel: 'Verkoop', status: 'Geplaatst', url: 'https://www.funda.nl/', datum: addDaysISO(t, -26), kosten: 595 },
          { id: 'ad2', kanaal: 'Instagram', doel: 'Verkoop', status: 'Geplaatst', url: '', datum: addDaysISO(t, -24), kosten: 0 }
        ],
        verzekeringen: [{ id: 'vz2', type: 'Opstalverzekering', verzekeraar: 'Nationale-Nederlanden', polis: 'OP-88123', premie: 540, start: addDaysISO(t, -208), eind: addDaysISO(t, 157) }],
        note: 'Gerenoveerd opgeleverd. Strategie: vasthouden aan € 405k+.'
      },
      {
        id: 'pnd3', ref: 'PND-2025-008', address: 'Bergweg 91A', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Verhuurd', label: 'C', taxatie: 265000, taxatieDatum: addDaysISO(t, -120),
        vraagprijs: 0, teKoopSinds: '',
        purchase: { date: addDaysISO(t, -300), koopsom: 198000, otb: 20592, notaris: 1350, makelaar: 1980, overig: 400 },
        financing: { financierId: 'r6', bedrag: 160000, rentePct: 5.9, einddatum: addDaysISO(t, 41) },
        vasteLasten: 240, maandhuur: 1450, huurder: 'Huurder A',
        sale: null, dealId: '',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc3' + i, name, done: i !== 4 })),
        viewings: [], offers: [],
        note: 'Buy & hold. Herfinanciering bespreken vóór einddatum.'
      },
      {
        id: 'pnd4', ref: 'PND-2025-006', address: 'Schiekade 18', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Verkocht', label: 'B', taxatie: 0, taxatieDatum: '',
        vraagprijs: 479000, teKoopSinds: addDaysISO(t, -120),
        purchase: { date: addDaysISO(t, -270), koopsom: 310000, otb: 32240, notaris: 1450, makelaar: 3100, overig: 800 },
        financing: { financierId: 'r6', bedrag: 250000, rentePct: 6.5, einddatum: '' },
        vasteLasten: 350, maandhuur: 0, huurder: '', m2: 86, kamers: 3,
        webOmschrijving: '',
        sale: { verkoopprijs: 489000, date: addDaysISO(t, -43), kosten: 6100, koper: 'Koper C' },
        dealId: '',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc4' + i, name, done: true })),
        viewings: [{ id: 'v3', date: addDaysISO(t, -75), name: 'Koper C', note: 'Bood na 2e bezichtiging' }],
        offers: [{ id: 'o2', date: addDaysISO(t, -65), name: 'Koper C', amount: 489000, status: 'Geaccepteerd', note: '' }],
        note: 'Afgerond. Resultaat boven calculatie.'
      }
    ],
    projects: [
      {
        id: 'prj1', ref: 'PRJ-2026-003', name: 'Volledige renovatie + tuinkamer', propertyId: 'pnd1',
        status: 'Uitvoering', startDate: addDaysISO(t, -56), endDate: addDaysISO(t, 34), budget: 85000,
        note: 'Vaste hoofdaannemer. Oplevering richting half juli.',
        publish: true,
        updates: [
          { id: 'u1', date: addDaysISO(t, -40), text: 'Sloop en ruwbouw afgerond — het pand is wind- en waterdicht.' },
          { id: 'u2', date: addDaysISO(t, -14), text: 'Installaties gestart: warmtepomp en nieuwe groepenkast geplaatst.' },
          { id: 'u3', date: addDaysISO(t, -2), text: 'Afbouw in volle gang — stucwerk gereed, keukenplaatsing gepland.' }
        ],
        invest: { open: true, doelbedrag: 150000, minInleg: 25000, rendementPct: 8, looptijd: '12 maanden' },
        investeerders: [{ id: 'inv1', naam: 'J. Smits', bedrag: 50000, datum: addDaysISO(t, -35) }],
        phases: [
          { id: 'ph1', name: 'Voorbereiding', status: 'Klaar' },
          { id: 'ph2', name: 'Vergunning & ontwerp', status: 'Klaar' },
          { id: 'ph3', name: 'Sloop & ruwbouw', status: 'Klaar' },
          { id: 'ph4', name: 'Installaties', status: 'Bezig' },
          { id: 'ph5', name: 'Afbouw', status: 'Bezig' },
          { id: 'ph6', name: 'Styling & oplevering', status: 'Te doen' }
        ],
        opleverpunten: [
          { id: 'op1', desc: 'Eindschoonmaak + stylingpakket bestellen', done: false },
          { id: 'op2', desc: 'Energielabel laten opstellen na isolatie', done: false }
        ]
      },
      {
        id: 'prj2', ref: 'PRJ-2025-009', name: 'Renovatie t.b.v. verkoop', propertyId: 'pnd4',
        status: 'Afgerond', startDate: addDaysISO(t, -250), endDate: addDaysISO(t, -130), budget: 70000,
        note: 'Binnen budget afgerond.',
        phases: [
          { id: 'ph7', name: 'Voorbereiding', status: 'Klaar' },
          { id: 'ph8', name: 'Uitvoering', status: 'Klaar' },
          { id: 'ph9', name: 'Oplevering', status: 'Klaar' }
        ],
        opleverpunten: [{ id: 'op3', desc: 'Restpunten makelaar afgehandeld', done: true }]
      },
      {
        id: 'prj3', ref: 'PRJ-2025-012', name: 'Opfrissen + energielabel A', propertyId: 'pnd2',
        status: 'Afgerond', startDate: addDaysISO(t, -190), endDate: addDaysISO(t, -60), budget: 50000,
        note: 'Label van D naar A: isolatie + warmtepomp.',
        phases: [
          { id: 'ph10', name: 'Voorbereiding', status: 'Klaar' },
          { id: 'ph11', name: 'Uitvoering', status: 'Klaar' },
          { id: 'ph12', name: 'Oplevering', status: 'Klaar' }
        ],
        opleverpunten: []
      }
    ],
    costs: [
      { id: 'k1', propertyId: 'pnd1', projectId: 'prj1', contactId: 'r4', desc: 'Aanneemsom ruwbouw + verbouwing (termijn 1+2)', category: 'Aannemer', amount: 38500, date: addDaysISO(t, -40), status: 'Betaald' },
      { id: 'k2', propertyId: 'pnd1', projectId: 'prj1', contactId: 'r5', desc: 'W/E-installaties + warmtepomp', category: 'Installaties', amount: 14200, date: addDaysISO(t, -12), status: 'Factuur ontvangen' },
      { id: 'k3', propertyId: 'pnd1', projectId: 'prj1', contactId: 'r4', desc: 'Aanneemsom termijn 3 (afbouw)', category: 'Aannemer', amount: 12800, date: addDaysISO(t, 14), status: 'Opdracht' },
      { id: 'k4', propertyId: 'pnd1', projectId: 'prj1', contactId: 'r9', desc: 'Stuc- en afbouwwerk + styling', category: 'Styling & oplevering', amount: 6400, date: addDaysISO(t, 24), status: 'Opdracht' },
      { id: 'k5', propertyId: 'pnd1', projectId: 'prj1', contactId: 'r8', desc: 'Taxatie na renovatie', category: 'Architect & advies', amount: 650, date: addDaysISO(t, -21), status: 'Betaald' },
      { id: 'k6', propertyId: 'pnd1', projectId: 'prj1', contactId: '', desc: 'Leges omgevingsvergunning tuinkamer', category: 'Leges & vergunning', amount: 1240, date: addDaysISO(t, -50), status: 'Betaald' },
      { id: 'k7', propertyId: 'pnd2', projectId: 'prj3', contactId: 'r4', desc: 'Renovatie totaal', category: 'Aannemer', amount: 41300, date: addDaysISO(t, -90), status: 'Betaald' },
      { id: 'k8', propertyId: 'pnd2', projectId: 'prj3', contactId: 'r5', desc: 'Warmtepomp + isolatie', category: 'Installaties', amount: 6900, date: addDaysISO(t, -80), status: 'Betaald' },
      { id: 'k9', propertyId: 'pnd4', projectId: 'prj2', contactId: 'r4', desc: 'Renovatie totaal', category: 'Aannemer', amount: 64800, date: addDaysISO(t, -150), status: 'Betaald' },
      { id: 'k10', propertyId: 'pnd4', projectId: 'prj2', contactId: 'r9', desc: 'Styling t.b.v. verkoop', category: 'Styling & oplevering', amount: 3400, date: addDaysISO(t, -135), status: 'Betaald' },
      { id: 'k11', propertyId: 'pnd3', projectId: '', contactId: 'r5', desc: 'CV-ketel vervangen (verhuur)', category: 'Installaties', amount: 2150, date: addDaysISO(t, -35), status: 'Betaald' },
      { id: 'k12', propertyId: 'pnd2', projectId: '', contactId: 'r2', desc: 'Verkoopstyling + fotografie', category: 'Styling & oplevering', amount: 1450, date: addDaysISO(t, -27), status: 'Factuur ontvangen' }
    ],
    planning: [
      { id: 'pl1', date: addDaysISO(t, 1), type: 'Bezichtiging', title: 'Bezichtiging Bergselaan 110B (aankoop)', who: 'Eigen + makelaar', ref: 'd:d2' },
      { id: 'pl2', date: addDaysISO(t, 2), type: 'Aannemer', title: 'Bouwoverleg aannemer — afbouwplanning Kralingse Plaslaan', who: 'Eigen + aannemer', ref: 'p:pnd1' },
      { id: 'pl3', date: addDaysISO(t, 3), type: 'Bezichtiging', title: '2e bezichtiging Belangstellende B — Laan op Zuid 304', who: 'Makelaar', ref: 'p:pnd2' },
      { id: 'pl4', date: addDaysISO(t, 6), type: 'Taxatie', title: 'Taxatie taxatiebureau — herfinanciering Bergweg 91A', who: 'Eigen', ref: 'p:pnd3' },
      { id: 'pl5', date: addDaysISO(t, 14), type: 'Notaris', title: 'Passeren Wolphaertsbocht 219 bij de notaris', who: 'Eigen', ref: 'd:d5' },
      { id: 'pl6', date: addDaysISO(t, 9), type: 'Oplevering', title: 'Voorschouw installaties Kralingse Plaslaan', who: 'Eigen + installateur', ref: 'p:pnd1' }
    ],
    tasks: [
      { id: 't1', title: 'Reageren op bod € 392k van Belangstellende A (Laan op Zuid)', due: t, done: false },
      { id: 't2', title: 'Financieringsstukken Mathenesserweg naar de financier', due: addDaysISO(t, 3), done: false },
      { id: 't3', title: 'Herfinanciering Bergweg 91A opstarten', due: addDaysISO(t, 7), done: false },
      { id: 't4', title: 'Bankgarantie Wolphaertsbocht geregeld', due: addDaysISO(t, -5), done: true }
    ],
    invoices: [
      { id: 'f1', soort: 'Huur', propertyId: 'pnd3', debiteur: 'Huurder A', desc: 'Huur juni 2026', amount: 1450, date: addDaysISO(t, -11), due: addDaysISO(t, -4), status: 'Betaald' },
      { id: 'f2', soort: 'Huur', propertyId: 'pnd3', debiteur: 'Huurder A', desc: 'Huur juli 2026', amount: 1450, date: addDaysISO(t, 19), due: addDaysISO(t, 26), status: 'Concept' }
    ],
    loans: [
      { id: 'l1', propertyId: 'pnd1', financierId: 'r6', soort: 'Ontwikkelfinanciering', bedrag: 300000, rentePct: 6.2, aflossing: 0, start: addDaysISO(t, -84), eind: addDaysISO(t, 290) },
      { id: 'l2', propertyId: 'pnd2', financierId: 'r6', soort: 'Bridge / overbrugging', bedrag: 220000, rentePct: 6.4, aflossing: 0, start: addDaysISO(t, -208), eind: addDaysISO(t, 150) },
      { id: 'l3', propertyId: 'pnd3', financierId: 'r6', soort: 'Hypotheek', bedrag: 160000, rentePct: 5.9, aflossing: 450, start: addDaysISO(t, -300), eind: addDaysISO(t, 41) }
    ],
    cloudMaintenance: [], // uit de cloud opgehaalde huurder-meldingen (via Cloud → synchroniseren)
    campaigns: [], // verzonden mailings (nieuwsbrief)
    audit: [], // wijzigingshistorie (wie/wat/wanneer)
    accounts: [
      { id: 'acc1', naam: 'Zakelijke rekening', type: 'Zakelijk', saldo: 84500, updatedAt: addDaysISO(t, -2) },
      { id: 'acc2', naam: 'Spaarrekening (buffer)', type: 'Spaar', saldo: 120000, updatedAt: addDaysISO(t, -2) }
    ],
    contracten: [
      {
        id: 'c1', ref: 'CON-2026-001', type: 'Huurovereenkomst', propertyId: 'pnd3', projectId: '', contactId: '',
        partijNaam: 'Huurder A', partijAdres: 'Bergweg 91A, Rotterdam', positie: 'HomeINN verhuurt',
        bedrag: 1450, datum: addDaysISO(t, -300), ingangsdatum: addDaysISO(t, -298), looptijd: '12 maanden', rendementPct: 0,
        note: 'Waarborgsom € 2.900. Jaarlijkse indexering conform CBS.', status: 'Getekend', createdAt: addDaysISO(t, -300)
      }
    ]
  };
}

/* ---------- Store ---------- */
let state;

/* Dwing een geldig state-schema af: ontbrekende collecties worden lege arrays, nooit demo-data. */
function sanitizeState(parsed) {
  const seed = seedData();
  const out = {};
  Object.keys(seed).forEach(key => {
    if (Array.isArray(seed[key])) out[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
    else if (key === 'settings') out[key] = Object.assign({}, seed.settings, (parsed.settings && typeof parsed.settings === 'object') ? parsed.settings : {});
    else out[key] = parsed[key] ?? seed[key];
  });
  return out;
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.properties)) {
        state = sanitizeState(parsed);
        return;
      }
    } catch (err) { console.warn('Kon opgeslagen data niet lezen:', err); }
    // Onleesbare data nooit zomaar overschrijven: bewaar een kopie voor handmatig herstel.
    try { localStorage.setItem(STORAGE_KEY + '-recovery', raw); } catch { /* opslag vol */ }
  }
  state = seedData();
  save();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    showToast('Opslaan mislukt — controleer de browseropslag.');
    console.error(err);
  }
}

/* ---------- Aanvragen (website-inbox) ---------- */
function loadInbox() {
  try {
    const list = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function saveInbox(list) {
  try { localStorage.setItem(INBOX_KEY, JSON.stringify(list)); } catch { /* opslag vol */ }
}

function setLeadHandled(id, value) {
  const list = loadInbox();
  const lead = list.find(l => l.id === id);
  if (lead) { lead.handled = value; saveInbox(list); }
  return lead;
}

function leadContactInfo(lead) {
  return [lead.contact, lead.email, lead.phone].filter(Boolean).join(' · ');
}

/* ---------- Lookups ---------- */
const contactById = id => state.contacts.find(c => c.id === id);
const contactName = id => contactById(id)?.name || '—';
const dealById = id => state.deals.find(d => d.id === id);
const propertyById = id => state.properties.find(p => p.id === id);
const projectById = id => state.projects.find(p => p.id === id);
const propertyLabel = id => propertyById(id)?.address || '—';

function nextRef(prefix, list) {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`);
  let max = 0;
  list.forEach(item => {
    const m = re.exec(item.ref || '');
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  });
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
}

function refLabel(ref) {
  if (!ref) return '';
  const [kind, id] = ref.split(':');
  if (kind === 'p') return propertyLabel(id);
  if (kind === 'd') return dealById(id)?.address || '';
  return '';
}

/* ---------- Financiële kern ---------- */
function calcDefaults() {
  const s = state.settings;
  return {
    otbPct: Number(s.otbPct) || 0, notaris: Number(s.notaris) || 0, makelaarPct: Number(s.makelaarPct) || 0,
    rentePct: Number(s.rentePct) || 0, vasteLasten: Number(s.vasteLasten) || 0,
    verkoopkostenPct: Number(s.verkoopkostenPct) || 0, financieringPct: 80
  };
}

/* Reken een aankoopkans volledig door. input mag deels leeg zijn; defaults uit Instellingen. */
function computeDeal(input) {
  const d = Object.assign(calcDefaults(), input);
  const koopsom = Number(d.koopsom) || 0;
  const verbouwing = Number(d.verbouwing) || 0;
  const verkoopprijs = Number(d.verkoopprijs) || 0;
  const maanden = Math.max(1, Number(d.maanden) || 9);
  const otb = koopsom * d.otbPct / 100;
  const makelaar = koopsom * d.makelaarPct / 100;
  const aankoopkosten = otb + d.notaris + makelaar;
  const financiering = (koopsom + verbouwing) * (Number(d.financieringPct) || 0) / 100;
  const rente = financiering * d.rentePct / 100 / 12 * maanden;
  const lasten = d.vasteLasten * maanden;
  const houdkosten = rente + lasten;
  const investering = koopsom + aankoopkosten + verbouwing + houdkosten;
  const eigenGeld = Math.max(0, investering - financiering);
  const verkoopkosten = verkoopprijs * d.verkoopkostenPct / 100;
  const opbrengst = verkoopprijs - verkoopkosten;
  const winst = opbrengst - investering;
  const roi = investering ? winst / investering * 100 : 0;
  const roiEigen = eigenGeld > 0 ? winst / eigenGeld * 100 : roi;
  const r = Math.round;
  return { koopsom, verbouwing, verkoopprijs, maanden, otb: r(otb), notaris: d.notaris, makelaar: r(makelaar), aankoopkosten: r(aankoopkosten), financiering: r(financiering), rente: r(rente), lasten: r(lasten), houdkosten: r(houdkosten), investering: r(investering), eigenGeld: r(eigenGeld), verkoopkosten: r(verkoopkosten), opbrengst: r(opbrengst), winst: r(winst), roi, roiEigen };
}

/* ---------- Rendementsmotor: XIRR (intern rendement op datumcashflows) ----------
   flows: [{date:'YYYY-MM-DD', amount:Number}] — negatief = inleg, positief = ontvangst.
   Geeft het op jaarbasis samengestelde rendement in % terug, of null bij te weinig data.
   Newton-Raphson met bisectie-fallback; herbruikt door calculator (hold-vs-flip) én investeerders. */
function xirr(flows) {
  const f = (flows || []).filter(x => x && x.date && isFinite(Number(x.amount)) && Number(x.amount) !== 0)
    .map(x => ({ date: x.date, amount: Number(x.amount) }));
  if (f.length < 2) return null;
  if (!f.some(x => x.amount < 0) || !f.some(x => x.amount > 0)) return null;
  const t0 = f.reduce((m, x) => (x.date < m ? x.date : m), f[0].date);
  const pts = f.map(x => ({ t: daysBetween(t0, x.date) / 365, a: x.amount }));
  const npv = rate => pts.reduce((s, x) => s + x.a / Math.pow(1 + rate, x.t), 0);
  const dnpv = rate => pts.reduce((s, x) => s - x.t * x.a / Math.pow(1 + rate, x.t + 1), 0);
  // Newton-Raphson
  let rate = 0.1;
  for (let i = 0; i < 60; i++) {
    const v = npv(rate), d = dnpv(rate);
    if (!isFinite(v) || !isFinite(d) || d === 0) break;
    const next = rate - v / d;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) { rate = next; break; }
    rate = Math.max(-0.9999, next);
  }
  if (isFinite(rate) && rate > -0.9999 && Math.abs(npv(rate)) < 1) return rate * 100;
  // Bisectie-fallback over [-0.99, 10]
  let lo = -0.99, hi = 10, flo = npv(lo), fhi = npv(hi);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = npv(mid);
    if (!isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-6 || (hi - lo) < 1e-8) return mid * 100;
    if (flo * fm < 0) { hi = mid; } else { lo = mid; flo = fm; }
  }
  return ((lo + hi) / 2) * 100;
}

/* Compacte IRR-weergave + kleurbadge t.o.v. doel-ROI. */
function fmtPct(v, dec = 1) { return (v === null || v === undefined || !isFinite(v)) ? '—' : fmtNum(v, dec) + '%'; }
function irrBadge(irr) {
  if (irr === null || irr === undefined || !isFinite(irr)) return '<span class="badge gray">—</span>';
  const doel = Number(state.settings.doelROI) || 15;
  const cls = irr >= doel ? 'green' : irr >= 0 ? '' : 'red';
  return `<span class="badge ${cls}">${fmtNum(irr, 1)}%</span>`;
}

/* Volledige financiële stand van een pand in bezit. */
function propertyFinance(p) {
  const s = state.settings;
  const pur = p.purchase || {};
  const aankoop = (Number(pur.koopsom) || 0) + (Number(pur.otb) || 0) + (Number(pur.notaris) || 0) + (Number(pur.makelaar) || 0) + (Number(pur.overig) || 0);
  const propCosts = state.costs.filter(k => k.propertyId === p.id);
  const ontwikkeld = propCosts.reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
  // Verwachte ontwikkelkosten: realisatie + resterend budget van niet-afgeronde projecten
  let restBudget = 0;
  state.projects.filter(pr => pr.propertyId === p.id && pr.status !== 'Afgerond').forEach(pr => {
    const actual = state.costs.filter(k => k.projectId === pr.id).reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    restBudget += Math.max(0, (Number(pr.budget) || 0) - actual);
  });
  const endDate = (p.status === 'Verkocht' && p.sale?.date) ? p.sale.date : todayISO();
  const maanden = monthsBetween(pur.date, endDate);
  const fin = p.financing || {};
  const renteMnd = (Number(fin.bedrag) || 0) * (Number(fin.rentePct) || 0) / 100 / 12;
  const lastenMnd = Number(p.vasteLasten) || 0;
  const houdkosten = Math.round((renteMnd + lastenMnd) * maanden);
  const huur = Math.round((Number(p.maandhuur) || 0) * maanden);
  const investering = Math.round(aankoop + ontwikkeld + houdkosten);
  const investVerwacht = investering + Math.round(restBudget);
  const hoogsteBod = Math.max(0, ...(p.offers || []).filter(o => o.status !== 'Afgewezen').map(o => Number(o.amount) || 0));
  let result = { aankoop, ontwikkeld, restBudget, maanden, renteMnd, lastenMnd, houdkosten, huur, investering, investVerwacht, hoogsteBod, verkocht: false, winst: null, roi: null, waarde: null };
  if (p.status === 'Verkocht' && p.sale) {
    const opbrengst = (Number(p.sale.verkoopprijs) || 0) - (Number(p.sale.kosten) || 0);
    result.verkocht = true;
    result.waarde = Number(p.sale.verkoopprijs) || 0;
    result.winst = Math.round(opbrengst + huur - investering);
    result.roi = investering ? result.winst / investering * 100 : 0;
  } else {
    const waarde = Number(p.vraagprijs) || Number(p.taxatie) || 0;
    if (waarde) {
      const opbrengst = waarde - waarde * (Number(s.verkoopkostenPct) || 0) / 100;
      result.waarde = waarde;
      result.winst = Math.round(opbrengst + huur - investVerwacht);
      result.roi = investVerwacht ? result.winst / investVerwacht * 100 : 0;
    }
  }
  return result;
}

/* ---------- Signalen (actielijst) ---------- */
function buildSignals() {
  const t = todayISO();
  const signals = [];
  // Aankoop
  state.deals.filter(d => d.status === 'Bod uitgebracht').forEach(d => {
    const last = (d.biedingen || []).filter(b => b.status === 'Uitgebracht').sort((a, b) => b.date.localeCompare(a.date))[0];
    if (last && last.validUntil && last.validUntil < t) {
      signals.push({ level: 'hoog', text: `Bod van ${fmtMoney(last.amount)} op ${d.address} is verlopen (${fmtDate(last.validUntil)}) — bel de makelaar.`, go: 'deal:' + d.id });
    }
  });
  state.deals.filter(d => d.status === 'Bezichtiging' && d.viewingDate && d.viewingDate < t).forEach(d => {
    signals.push({ level: 'middel', text: `Bezichtiging ${d.address} is geweest — beslis: bod uitbrengen of afhaken.`, go: 'deal:' + d.id });
  });
  state.deals.filter(d => d.status === 'Lead' && daysBetween(d.createdAt || t, t) >= 5).forEach(d => {
    signals.push({ level: 'middel', text: `Lead ${d.address} staat al ${daysBetween(d.createdAt, t)} dagen open — plan een bezichtiging of haak af.`, go: 'deal:' + d.id });
  });
  // Verkoop
  state.properties.forEach(p => {
    if (p.status === 'Te koop' || p.status === 'Onder bod') (p.offers || []).filter(o => o.status === 'Ontvangen').forEach(o => {
      signals.push({ level: 'hoog', text: `Bod van ${fmtMoney(o.amount)} ontvangen op ${p.address} (${o.name}) — reageer.`, go: 'pand:' + p.id });
    });
    if ((p.status === 'Te koop' || p.status === 'Onder bod') && !p.label) {
      signals.push({ level: 'hoog', text: `${p.address} staat te koop zonder energielabel — wettelijk verplicht bij verkoop.`, go: 'pand:' + p.id });
    }
    if (p.status === 'Te koop' && p.teKoopSinds && daysBetween(p.teKoopSinds, t) > 45 && !(p.offers || []).some(o => o.status === 'Ontvangen')) {
      signals.push({ level: 'middel', text: `${p.address} staat ${daysBetween(p.teKoopSinds, t)} dagen te koop zonder lopend bod — herzie prijs of strategie.`, go: 'pand:' + p.id });
    }
    if (p.status !== 'Verkocht' && p.financing?.einddatum && daysBetween(t, p.financing.einddatum) <= 60) {
      const dgn = daysBetween(t, p.financing.einddatum);
      signals.push({ level: dgn <= 0 ? 'hoog' : 'middel', text: `Financiering ${p.address} loopt ${dgn <= 0 ? 'is verlopen' : 'over ' + dgn + ' dagen af'} — regel herfinanciering.`, go: 'pand:' + p.id });
    }
    const stilstand = ['In ontwikkeling'].includes(p.status) && !state.projects.some(pr => pr.propertyId === p.id && pr.status !== 'Afgerond');
    if (stilstand) {
      const fin = propertyFinance(p);
      signals.push({ level: 'middel', text: `${p.address} heeft geen actief project — houdkosten lopen door (${fmtMoney(fin.renteMnd + fin.lastenMnd)}/mnd).`, go: 'pand:' + p.id });
    }
  });
  // Verhuur: aflopende contracten en open onderhoud
  state.properties.filter(p => p.status === 'Verhuurd').forEach(p => {
    const dgn = p.huurEind ? daysBetween(t, p.huurEind) : null;
    if (dgn !== null && dgn >= 0 && dgn <= 90)
      signals.push({ level: 'middel', text: `Huurcontract ${p.address} loopt af op ${fmtDate(p.huurEind)} (${dgn} dgn) — verleng of herzie de huur.`, go: 'pand:' + p.id });
    const open = (p.onderhoud || []).filter(o => o.status !== 'Afgehandeld').length;
    if (open) signals.push({ level: 'middel', text: `${open} open onderhoudsverzoek${open === 1 ? '' : 'en'} op ${p.address} (verhuur).`, go: 'pand:' + p.id });
  });
  // Huurder-meldingen via het portaal (uit de cloud opgehaald)
  (state.cloudMaintenance || []).filter(m => m.status === 'Open').forEach(m => {
    signals.push({ level: 'hoog', text: `Nieuwe melding via huurdersportaal${m.address ? ' (' + m.address + ')' : ''}: ${m.descr}`, go: m.localPropertyId ? 'pand:' + m.localPropertyId : 'dashboard' });
  });
  // Verzekeringen: aflopende polissen
  state.properties.filter(p => p.status !== 'Verkocht').forEach(p => {
    (p.verzekeringen || []).forEach(v => {
      const dgn = v.eind ? daysBetween(t, v.eind) : null;
      if (dgn !== null && dgn >= 0 && dgn <= 60)
        signals.push({ level: 'middel', text: `${v.type} ${p.address} verloopt op ${fmtDate(v.eind)} (${dgn} dgn) — verleng de polis.`, go: 'pand:' + p.id });
    });
  });
  // Ontwikkeling: budget reactief (al over) + proactief (prognose loopt over)
  state.projects.filter(pr => pr.status !== 'Afgerond').forEach(pr => {
    const e = calculateEAC(pr);
    if (e.committed > e.budget) {
      signals.push({ level: 'hoog', text: `${pr.name} (${propertyLabel(pr.propertyId)}) is ${fmtMoney(e.committed - e.budget)} over budget.`, go: 'project:' + pr.id });
    } else if (e.basis === 'runrate' && e.eac > e.budget) {
      signals.push({ level: e.eac > e.budget * 1.1 ? 'hoog' : 'middel', text: `${pr.name} koerst op ${fmtMoney(e.eac)} — naar verwachting ${fmtMoney(e.over)} over budget (nu ${fmtMoney(e.committed)} besteed). Stuur bij nu het nog kan.`, go: 'project:' + pr.id });
    }
    if (pr.endDate && pr.endDate < t) {
      signals.push({ level: 'middel', text: `${pr.name} is over de geplande opleverdatum (${fmtDate(pr.endDate)}) — elke maand uitloop kost houdkosten.`, go: 'project:' + pr.id });
    }
  });
  // Betalingen
  const openFacturen = state.costs.filter(k => k.status === 'Factuur ontvangen');
  if (openFacturen.length) {
    const som = openFacturen.reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    signals.push({ level: 'middel', text: `${openFacturen.length} factu${openFacturen.length === 1 ? 'ur' : 'ren'} te betalen (${fmtMoney(som)}).`, go: 'costs' });
  }
  // CRM: openstaande vervolgacties
  state.contacts.forEach(c => {
    const acts = (c.activities || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const laatste = acts[0];
    if (laatste && laatste.nextFollowUp && laatste.nextFollowUp <= t) {
      signals.push({ level: 'middel', text: `Vervolgactie voor ${c.name} (afgesproken op ${fmtDate(laatste.nextFollowUp)}): ${esc((laatste.description || '').slice(0, 50))}`, go: 'relations' });
    }
  });
  // Huurachterstand: onbetaalde uitgaande facturen over de vervaldatum
  const teLaat = (state.invoices || []).filter(f => f.status !== 'Betaald' && f.status !== 'Concept' && f.due && f.due < t);
  teLaat.forEach(f => {
    const dgn = daysBetween(f.due, t);
    signals.push({ level: 'hoog', text: `Huurachterstand: ${fmtMoney(f.amount)} van ${esc(f.debiteur || propertyLabel(f.propertyId))} — ${dgn} dagen over vervaldatum (${esc(f.desc)}).`, go: 'money' });
  });
  // Backup-discipline: alles staat in één browser
  if (!state.lastBackup) {
    signals.push({ level: 'middel', text: 'Je hebt nog nooit een backup gemaakt — alles staat in deze browser. Maak er nu een via Instellingen.', go: 'settings' });
  } else if (daysBetween(state.lastBackup, t) > 14) {
    signals.push({ level: 'hoog', text: `Laatste backup is ${daysBetween(state.lastBackup, t)} dagen oud — download een nieuwe via Instellingen.`, go: 'settings' });
  }
  // Website-aanvragen
  const nieuweLeads = loadInbox().filter(l => !l.handled).length;
  if (nieuweLeads) {
    signals.push({ level: 'hoog', text: `${nieuweLeads} nieuwe aanvra${nieuweLeads === 1 ? 'ag' : 'gen'} via de website (lokaal getest) — bekijk en volg op. Live aanvragen komen per e-mail binnen.`, go: 'inbox' });
  }
  // Taken
  state.tasks.filter(task => !task.done && task.due && task.due <= t).forEach(task => {
    signals.push({ level: 'middel', text: `Taak: ${task.title} (deadline ${fmtDate(task.due)}).`, go: 'dashboard' });
  });
  const order = { hoog: 0, middel: 1 };
  return signals.sort((a, b) => order[a.level] - order[b.level]);
}

/* ---------- Views & routing ---------- */
const VIEWS = {
  landing: 'Website preview', dashboard: 'Dashboard', inbox: 'Aanvragen', deals: 'Aankoopkansen', calculator: 'Dealcalculator',
  portfolio: 'Panden', projects: 'Ontwikkelprojecten', costs: 'Kosten', money: 'Geld-in & huur', maintenance: 'Onderhoud & meldingen', sales: 'Verkoop',
  ads: 'Adverteren', reports: 'Rapportage', investors: 'Investeerders', finance: 'Financiering', liquidity: 'Liquiditeit',
  planning: 'Planning', relations: 'Relaties', mailing: 'Mailing', contracts: 'Contracten', settings: 'Instellingen'
};

const PRIMARY_ACTIONS = {
  dashboard: ['Nieuwe aankoopkans', () => openDealModal()],
  inbox: ['Open website', () => setView('landing')],
  deals: ['Nieuwe aankoopkans', () => openDealModal()],
  calculator: null,
  portfolio: ['Pand toevoegen', () => openPropertyModal()],
  projects: ['Nieuw project', () => openProjectModal()],
  costs: ['Nieuwe kostenpost', () => openCostModal()],
  sales: ['Bod registreren', () => { const p = state.properties.find(x => x.status === 'Te koop' || x.status === 'Onder bod'); p ? openOfferModal(p.id) : showToast('Zet eerst een pand te koop via Panden.'); }],
  money: ['Factuur opstellen', () => openInvoiceModal()],
  maintenance: ['Synchroniseer cloud', () => { const b = document.querySelector('[data-action="cloud-sync"]'); b ? b.click() : setView('settings'); }],
  ads: ['Advertentie genereren', () => { const p = state.properties.find(x => x.status !== 'Verkocht'); p ? openAdTextModal(p.id) : showToast('Voeg eerst een pand toe.'); }],
  finance: ['Lening toevoegen', () => openLoanModal()],
  liquidity: ['Rekening toevoegen', () => openAccountModal()],
  reports: ['Exporteer rapport', () => exportCurrentView()],
  investors: ['Exporteer ledger', () => exportCurrentView()],
  planning: ['Planning toevoegen', () => openPlanModal()],
  relations: ['Nieuwe relatie', () => openContactModal()],
  mailing: ['Nieuwe mailing', () => { const s = $('#mail-subject'); if (s) { s.focus(); s.scrollIntoView({ block: 'center' }); } }],
  contracts: ['Nieuw contract', () => openContractModal()],
  settings: null, landing: null
};

let currentView = 'dashboard';
let detailId = { deal: null, property: null, project: null };
let weekOffset = 0;
let filters = { portfolio: 'bezit', project: 'actief', cost: 'all', relation: 'all' };

function setView(view, kind = null, id = null) {
  if (!VIEWS[view]) view = 'dashboard';
  currentView = view;
  detailId = { deal: null, property: null, project: null };
  if (kind) detailId[kind] = id;
  document.body.classList.toggle('public-mode', view === 'landing');
  $$('.view').forEach(el => el.classList.toggle('active', el.id === view));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#view-title').textContent = VIEWS[view];
  const action = PRIMARY_ACTIONS[view];
  $('#primary-action').style.display = action ? '' : 'none';
  if (action) $('#primary-action').textContent = action[0];
  const hash = kind === 'deal' ? `deal/${id}` : kind === 'property' ? `pand/${id}` : kind === 'project' ? `project/${id}` : view;
  if (location.hash !== '#' + hash) history.replaceState(null, '', '#' + hash);
  renderCurrent();
}

function applyHash() {
  const hash = location.hash.replace('#', '');
  if (hash.startsWith('deal/')) setView('deals', 'deal', hash.split('/')[1]);
  else if (hash.startsWith('pand/')) setView('portfolio', 'property', hash.split('/')[1]);
  else if (hash.startsWith('project/')) setView('projects', 'project', hash.split('/')[1]);
  else setView(hash || 'dashboard');
}

function renderCurrent() {
  renderSidebar();
  switch (currentView) {
    case 'dashboard': renderDashboard(); break;
    case 'inbox': renderInbox(); break;
    case 'deals': detailId.deal ? renderDealDetail() : renderDeals(); break;
    case 'calculator': renderCalculator(); break;
    case 'portfolio': detailId.property ? renderPropertyDetail() : renderPortfolio(); break;
    case 'projects': detailId.project ? renderProjectDetail() : renderProjects(); break;
    case 'costs': renderCosts(); break;
    case 'money': renderMoney(); break;
    case 'maintenance': renderMaintenance(); break;
    case 'sales': renderSales(); break;
    case 'ads': renderAds(); break;
    case 'reports': renderReports(); break;
    case 'investors': renderInvestorReports(); break;
    case 'finance': renderFinance(); break;
    case 'liquidity': renderLiquidity(); break;
    case 'mailing': renderMailing(); break;
    case 'contracts': renderContracts(); break;
    case 'planning': renderPlanning(); break;
    case 'relations': renderRelations(); break;
    case 'settings': renderSettings(); break;
  }
}

function rerender() { save(); renderCurrent(); }

/* Audit-trail: wie wijzigde wat, wanneer. */
function logAudit(action, detail) {
  state.audit = state.audit || [];
  state.audit.unshift({ id: uid('au'), ts: new Date().toISOString(), user: (window.HCloud && HCloud.status().email) || 'lokaal', action, detail });
  if (state.audit.length > 800) state.audit.length = 800;
}
const FORM_LABEL = { 'deal-form': 'aankoopkans', 'property-form': 'pand', 'project-form': 'project', 'cost-form': 'kostenpost', 'invoice-form': 'factuur', 'loan-form': 'lening', 'account-form': 'rekening', 'contact-form': 'relatie', 'plan-form': 'planning', 'contract-form': 'contract', 'sale-form': 'verkoop', 'acquire-form': 'aankoop', 'payout-form': 'uitkering', 'insurance-form': 'verzekering', 'ad-form': 'advertentie' };

function goTo(target) {
  $('#search-results').hidden = true;
  $('#search-input').value = '';
  if (target.startsWith('deal:')) setView('deals', 'deal', target.split(':')[1]);
  else if (target.startsWith('pand:')) setView('portfolio', 'property', target.split(':')[1]);
  else if (target.startsWith('project:')) setView('projects', 'project', target.split(':')[1]);
  else setView(target);
}

/* ---------- Gedeelde UI-bouwstenen ---------- */
function renderSidebar() {
  const signals = buildSignals();
  const high = signals.filter(s => s.level === 'hoog').length;
  $('#sidebar-actions').textContent = `${signals.length} actie${signals.length === 1 ? '' : 's'}`;
  $('#sidebar-sub').textContent = high ? `${high} met hoge prioriteit — check je actielijst.` : 'Geen urgente zaken. Sterk bezig!';
}

function statusBadge(status) {
  const map = {
    'Lead': 'gray', 'Bezichtiging': 'blue', 'Bod uitgebracht': '', 'Onder voorbehoud': 'blue', 'Notaris': 'green', 'Aangekocht': 'green', 'Afgehaakt': 'red',
    'In ontwikkeling': 'blue', 'Te koop': '', 'Onder bod': 'green', 'Verhuurd': 'blue', 'Verkocht': 'gray',
    'Voorbereiding': 'gray', 'Vergunning': 'blue', 'Uitvoering': 'green', 'Oplevering': '', 'Afgerond': 'gray',
    'Opdracht': 'blue', 'Factuur ontvangen': '', 'Betaald': 'green',
    'Uitgebracht': 'blue', 'Geaccepteerd': 'green', 'Afgewezen': 'red', 'Verlopen': 'red', 'Ontvangen': '',
    'Nieuw': '', 'Afgehandeld': 'gray', 'Gesprek': 'blue', 'Contact': 'gray',
    'Concept': 'gray', 'Geplaatst': 'green', 'Gepauzeerd': 'blue', 'Verzonden': 'blue',
    'Makelaar': 'blue', 'Notaris-rel': 'gray', 'Aannemer': 'green', 'Financier': '', 'Koper/Verkoper': 'gray', 'Overig': 'gray'
  };
  return `<span class="badge ${map[status] ?? ''}">${esc(status)}</span>`;
}

function roiBadge(roi) {
  if (roi === null || roi === undefined || !isFinite(roi)) return '<span class="badge gray">—</span>';
  const doel = Number(state.settings.doelROI) || 15;
  const cls = roi >= doel ? 'green' : roi >= doel * 0.6 ? '' : 'red';
  return `<span class="badge ${cls}">${fmtNum(roi, 1)}% ROI</span>`;
}

function emptyRow(cols, text) {
  return `<tr><td colspan="${cols}" class="empty">${esc(text)}</td></tr>`;
}

function winstClass(v) { return v !== null && v < 0 ? 'alert' : ''; }

/* ---------- Aanvragen (website) ---------- */
function fmtDateTime(iso) {
  if (!iso) return '—';
  return `${fmtDate(iso.slice(0, 10))} ${iso.slice(11, 16)}`;
}

function renderInbox() {
  const list = loadInbox().slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const open = list.filter(l => !l.handled);
  const verkoop = open.filter(l => (l.subject || '').toLowerCase().includes('verkopen')).length;
  $('#inbox-kpis').innerHTML = `
    <article class="kpi small"><span>Nieuw / op te volgen</span><strong class="${open.length ? 'alert' : ''}">${open.length}</strong><small>${open.length ? 'reageer binnen 4 uur — dat beloof je op de site' : 'alles afgehandeld'}</small></article>
    <article class="kpi small"><span>Waarvan pand-verkopen</span><strong>${verkoop}</strong><small>directe aankoopkansen</small></article>
    <article class="kpi small"><span>Totaal ontvangen</span><strong>${list.length}</strong><small>via website-formulieren</small></article>`;

  $('#inbox-table').innerHTML = list.length ? list.map(l => `
    <tr class="${l.handled ? '' : 'late-row'}">
      <td>${fmtDateTime(l.date)}</td>
      <td>${statusBadge(l.type || 'Contact')}</td>
      <td><strong>${esc(l.name || 'Onbekend')}</strong>${l.portfolio ? `<br><span class="sub">${esc(l.portfolio)}</span>` : ''}</td>
      <td>${esc(leadContactInfo(l)) || '—'}</td>
      <td>${esc(l.subject || '—')}${l.message ? `<br><span class="sub">${esc(l.message)}</span>` : ''}</td>
      <td>${statusBadge(l.handled ? 'Afgehandeld' : 'Nieuw')}</td>
      <td class="row-actions">
        <button class="btn primary slim" data-action="inbox-to-deal" data-id="${l.id}" title="Maak aankoopkans">→ Kans</button>
        <button class="btn secondary slim" data-action="inbox-to-contact" data-id="${l.id}" title="Maak relatie">→ Relatie</button>
        <button class="icon-btn" data-action="inbox-handled" data-id="${l.id}" title="${l.handled ? 'Terugzetten naar nieuw' : 'Markeer afgehandeld'}">${l.handled ? '↩' : '✓'}</button>
        <button class="icon-btn" data-action="inbox-del" data-id="${l.id}" title="Verwijderen">🗑</button>
      </td>
    </tr>`).join('') : emptyRow(7, 'Nog geen aanvragen. Formulieren op je website komen hier automatisch binnen — test het via Website preview (Gratis gesprek of het contactformulier).');
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const t = todayISO();
  const inBezit = state.properties.filter(p => p.status !== 'Verkocht');
  const investTotaal = inBezit.reduce((sum, p) => sum + propertyFinance(p).investering, 0);
  const activeDeals = state.deals.filter(d => !['Aangekocht', 'Afgehaakt'].includes(d.status));
  const pipelineWinst = activeDeals.reduce((sum, d) => sum + Math.max(0, computeDeal(d.calc).winst), 0);
  const teKoop = state.properties.filter(p => p.status === 'Te koop' || p.status === 'Onder bod');
  const teKoopSom = teKoop.reduce((sum, p) => sum + (Number(p.vraagprijs) || Number(p.taxatie) || 0), 0);
  const verkochtDitJaar = state.properties.filter(p => p.status === 'Verkocht' && (p.sale?.date || '').startsWith(String(new Date().getFullYear())));
  const winstDitJaar = verkochtDitJaar.reduce((sum, p) => sum + (propertyFinance(p).winst || 0), 0);

  $('#kpi-grid').innerHTML = `
    <article class="kpi"><span>Portfolio in bezit</span><strong>${fmtMoney(investTotaal)}</strong><small>${inBezit.length} pand${inBezit.length === 1 ? '' : 'en'} · totale investering</small></article>
    <article class="kpi"><span>Aankooppijplijn</span><strong>${fmtMoney(pipelineWinst)}</strong><small>${activeDeals.length} kansen · potentiële winst</small></article>
    <article class="kpi"><span>Te koop / onder bod</span><strong>${fmtMoney(teKoopSom)}</strong><small>${teKoop.length} pand${teKoop.length === 1 ? '' : 'en'} · vraagprijs totaal</small></article>
    <article class="kpi"><span>Gerealiseerde winst ${new Date().getFullYear()}</span><strong class="${winstClass(winstDitJaar)}">${fmtMoney(winstDitJaar)}</strong><small>${verkochtDitJaar.length} verkocht</small></article>`;

  // Kapitaal per pand
  const bars = inBezit.map(p => ({ label: p.address.split(' ').slice(0, -1).join(' ') || p.address, full: p.address, value: propertyFinance(p).investering, status: p.status }));
  const max = Math.max(...bars.map(b => b.value), 1);
  $('#invest-chart').innerHTML = bars.length ? bars.map(b => `
    <span style="--h:${Math.max(10, Math.round(b.value / max * 100))}%" title="${esc(b.full)} (${esc(b.status)}): ${fmtMoney(b.value)}">
      <em>${fmtMoneyK(b.value)}</em>${esc(b.label)}
    </span>`).join('') : '<p class="empty">Nog geen panden in bezit.</p>';

  // Actielijst
  const signals = buildSignals();
  $('#signal-count').textContent = signals.length;
  $('#signal-list').innerHTML = signals.length ? signals.slice(0, 8).map(s => `
    <article class="priority signal ${s.level}" data-action="signal-go" data-go="${esc(s.go)}">
      <span class="level">${s.level === 'hoog' ? 'HOOG' : 'MIDDEL'}</span>
      <strong>${esc(s.text)}</strong>
    </article>`).join('')
    : '<p class="empty">Geen openstaande acties. 👌</p>';

  // Planning deze week
  const weekEnd = addDaysISO(weekStartISO(0), 6);
  const week = state.planning.filter(pl => pl.date >= weekStartISO(0) && pl.date <= weekEnd)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  $('#today-plan').innerHTML = week.length ? week.map(pl => `
    <article class="priority">
      <strong>${pl.date === t ? '<span class="badge green">Vandaag</span> ' : ''}${esc(pl.title)}</strong>
      <span>${fmtDayLabel(pl.date)} · ${esc(pl.who || '')}${pl.ref ? ' · ' + esc(refLabel(pl.ref)) : ''}</span>
    </article>`).join('')
    : '<p class="empty">Niets gepland deze week.</p>';

  // Taken
  $('#task-panel').innerHTML = state.tasks.length ? state.tasks
    .slice().sort((a, b) => Number(a.done) - Number(b.done) || (a.due || '9999').localeCompare(b.due || '9999'))
    .map(task => `
      <article class="priority task-row ${task.done ? 'done' : ''}">
        <button class="task-check ${task.done ? 'checked' : ''}" data-action="toggle-task" data-id="${task.id}" aria-label="Afvinken"></button>
        <div><strong>${esc(task.title)}</strong>
        <span>${task.due ? 'Deadline ' + fmtDate(task.due) : 'Geen deadline'}${!task.done && task.due && task.due < t ? ' · <b class="alert">te laat</b>' : ''}</span></div>
        <button class="icon-btn" data-action="del-task" data-id="${task.id}" title="Verwijderen">🗑</button>
      </article>`).join('')
    : '<p class="empty">Nog geen taken.</p>';
}

/* ---------- Aankoopkansen (kanban + detail) ---------- */
const DEAL_STAGES = ['Lead', 'Bezichtiging', 'Bod uitgebracht', 'Onder voorbehoud', 'Notaris'];

function renderDeals() {
  $('#deal-list-wrap').hidden = false;
  $('#deal-detail').hidden = true;
  const active = state.deals.filter(d => DEAL_STAGES.includes(d.status));
  const totalKoopsom = active.reduce((sum, d) => sum + (Number(d.calc?.koopsom) || 0), 0);
  const totalWinst = active.reduce((sum, d) => sum + computeDeal(d.calc).winst, 0);
  const bodenUit = state.deals.filter(d => d.status === 'Bod uitgebracht').length;
  $('#deal-kpis').innerHTML = `
    <article class="kpi small"><span>Actieve kansen</span><strong>${active.length}</strong><small>${fmtMoney(totalKoopsom)} aan koopsommen</small></article>
    <article class="kpi small"><span>Potentiële winst pijplijn</span><strong class="${winstClass(totalWinst)}">${fmtMoney(totalWinst)}</strong><small>volgens calculaties</small></article>
    <article class="kpi small"><span>Biedingen uitstaand</span><strong>${bodenUit}</strong><small>wacht op reactie verkoper</small></article>`;

  // Geselecteerde kansen kunnen ondertussen gearchiveerd zijn: opschonen.
  Array.from(compareSet).forEach(cid => { if (!active.some(d => d.id === cid)) compareSet.delete(cid); });
  renderCompareBar();
  const funnelEl = $('#deal-funnel'); if (funnelEl) funnelEl.innerHTML = dealFunnelHtml();

  $('#deal-board').innerHTML = DEAL_STAGES.map(stage => {
    const cards = active.filter(d => d.status === stage);
    return `<section class="lead-column">
      <h3>${stage} <span class="sub">(${cards.length})</span></h3>
      ${cards.map(d => {
        const c = computeDeal(d.calc);
        return `<article class="lead-card ${compareSet.has(d.id) ? 'cmp-on' : ''}" data-action="open-deal" data-id="${d.id}">
          <label class="cmp-check" data-action="cmp-toggle" data-id="${d.id}" title="Selecteer om te vergelijken"><input type="checkbox" tabindex="-1" ${compareSet.has(d.id) ? 'checked' : ''}><span>vergelijk</span></label>
          <strong>${esc(d.address)}</strong>
          <span>${esc(d.city)} · ${esc(d.ptype)}</span>
          <span>Vraag ${fmtMoneyK(d.vraagprijs)} · bod ${fmtMoneyK(d.calc?.koopsom)}</span>
          <div class="card-badges">${roiBadge(c.roi)}<span class="badge ${c.winst < 0 ? 'red' : 'green'}">${fmtMoneyK(c.winst)}</span></div>
        </article>`;
      }).join('') || '<p class="empty small">—</p>'}
    </section>`;
  }).join('');

  const archief = state.deals.filter(d => !DEAL_STAGES.includes(d.status))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  $('#deal-archive').innerHTML = archief.length ? archief.map(d => `
    <tr>
      <td><strong>${esc(d.ref)}</strong></td>
      <td>${esc(d.address)}, ${esc(d.city)}</td>
      <td>${fmtMoney(d.vraagprijs)}</td>
      <td>${statusBadge(d.status)}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="open-deal" data-id="${d.id}" title="Bekijken">→</button>
        <button class="icon-btn" data-action="del-deal" data-id="${d.id}" title="Verwijderen">🗑</button>
      </td>
    </tr>`).join('') : emptyRow(5, 'Nog niets in het archief.');
}

function renderCompareBar() {
  const bar = $('#deal-compare-bar');
  if (!bar) return;
  const n = compareSet.size;
  bar.innerHTML = n
    ? `<span class="cmp-count">${n} geselecteerd</span>
       <button class="btn primary slim" data-action="open-compare" ${n < 2 ? 'disabled title="Selecteer minstens 2"' : ''}>Vergelijk (${n})</button>
       <button class="btn secondary slim" data-action="clear-compare">Wis selectie</button>`
    : '';
}

/* Zij-aan-zij metriekvergelijking van geselecteerde aankoopkansen. */
function renderComparison() {
  const deals = state.deals.filter(d => compareSet.has(d.id));
  if (deals.length < 2) { showToast('Selecteer minstens 2 kansen om te vergelijken.'); return; }
  const calcs = deals.map(d => ({ d, c: computeDeal(d.calc) }));
  // Metriek-definities: key, label, betere richting (max/min), formatter.
  const metrics = [
    ['koopsom', 'Koopsom / bod', 'min', c => fmtMoney(c.koopsom)],
    ['verbouwing', 'Verbouwbudget', 'min', c => fmtMoney(c.verbouwing)],
    ['investering', 'Totale investering', 'min', c => fmtMoney(c.investering)],
    ['eigenGeld', 'Eigen geld', 'min', c => fmtMoney(c.eigenGeld)],
    ['verkoopprijs', 'Verwachte verkoop', 'max', c => fmtMoney(c.verkoopprijs)],
    ['winst', 'Verwachte winst', 'max', c => fmtMoney(c.winst)],
    ['roi', 'ROI', 'max', c => fmtNum(c.roi, 1) + '%'],
    ['roiEigen', 'ROI op eigen geld', 'max', c => fmtNum(c.roiEigen, 0) + '%'],
    ['maanden', 'Doorlooptijd', 'min', c => fmtNum(c.maanden, 0) + ' mnd']
  ];
  // Beste waarde per metriek bepalen voor highlight.
  const best = {};
  metrics.forEach(([key, , dir]) => {
    const vals = calcs.map(x => x.c[key]);
    best[key] = dir === 'max' ? Math.max(...vals) : Math.min(...vals);
  });
  // Winnaar = hoogste ROI op eigen geld.
  const winnerIdx = calcs.reduce((bi, x, i, arr) => x.c.roiEigen > arr[bi].c.roiEigen ? i : bi, 0);
  const head = `<th>Metriek</th>${calcs.map((x, i) => `<th class="${i === winnerIdx ? 'cmp-winner' : ''}">${esc(x.d.address)}${i === winnerIdx ? '<br><span class="badge gold">Beste deal</span>' : ''}</th>`).join('')}`;
  const rows = metrics.map(([key, label, dir, fmt]) => `
    <tr><td class="cmp-metric">${label}</td>${calcs.map(x => {
      const isBest = x.c[key] === best[key] && calcs.length > 1;
      return `<td class="${isBest ? 'cmp-best' : ''} ${(key === 'winst' || key === 'roi' || key === 'roiEigen') ? winstClass(x.c.winst) : ''}">${fmt(x.c)}</td>`;
    }).join('')}</tr>`).join('');
  $('#compare-body').innerHTML = `
    <p class="hint">Groen = beste waarde per regel. De winnaar is gekozen op rendement op eigen geld (${fmtNum(calcs[winnerIdx].c.roiEigen, 0)}%).</p>
    <div class="table-wrap"><table class="compare-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  $('#compare-modal').showModal();
}

function dealBreakdownHTML(c) {
  return `
    <div><dt>Koopsom</dt><dd>${fmtMoney(c.koopsom)}</dd></div>
    <div><dt>Overdrachtsbelasting</dt><dd>${fmtMoney(c.otb)}</dd></div>
    <div><dt>Notaris &amp; makelaar</dt><dd>${fmtMoney(c.notaris + c.makelaar)}</dd></div>
    <div><dt>Verbouwbudget</dt><dd>${fmtMoney(c.verbouwing)}</dd></div>
    <div><dt>Houdkosten (${fmtNum(c.maanden, 0)} mnd rente + lasten)</dt><dd>${fmtMoney(c.houdkosten)}</dd></div>
    <div class="grand"><dt>Totale investering</dt><dd>${fmtMoney(c.investering)}</dd></div>
    <div><dt>Financiering (${fmtMoneyK(c.financiering)}) → eigen geld</dt><dd>${fmtMoney(c.eigenGeld)}</dd></div>
    <div><dt>Verkoopprijs − verkoopkosten</dt><dd>${fmtMoney(c.opbrengst)}</dd></div>
    <div class="grand ${winstClass(c.winst)}"><dt>Verwachte winst</dt><dd>${fmtMoney(c.winst)} (${fmtNum(c.roi, 1)}% · ${fmtNum(c.roiEigen, 0)}% op eigen geld)</dd></div>`;
}

/* Marktcheck: directe deeplinks naar externe bronnen voor taxatie/onderzoek.
   Geen API/keys nodig — opent de juiste tool, met adres voorzover die bron dat ondersteunt. */
function marktLinksPanel(address, city) {
  const q = encodeURIComponent([address, city].filter(Boolean).join(' '));
  const links = [
    ['Funda', `https://www.funda.nl/zoeken/koop?query=${q}`, 'Vergelijkbaar aanbod & vraagprijzen'],
    ['Kadastrale kaart', `https://www.kadastralekaart.com/zoeken/${q}`, 'Perceel, oppervlakte & eigendom'],
    ['WOZ-waardeloket', 'https://www.wozwaardeloket.nl/', 'Officiële WOZ-waarde'],
    ['EP-online', 'https://www.ep-online.nl/', 'Geregistreerd energielabel'],
    ['Walter', 'https://www.walterliving.com/', 'Gratis waarde-indicatie (AVM)'],
    ['Google Maps', `https://www.google.com/maps/search/?api=1&query=${q}`, 'Straatbeeld & omgeving']
  ];
  return `
    <section class="panel">
      <div class="panel-head compact"><h2>Marktcheck &amp; taxatie</h2>
        <span class="sub">Open externe bronnen voor ${esc(address || 'dit adres')}</span>
      </div>
      <p class="hint">Eén klik naar de juiste bron. Adres staat al klaar bij Funda, Kadaster en Maps; bij WOZ/EP-online/Walter zoek je het adres in de tool (die ondersteunen geen directe link).</p>
      <div class="markt-links">
        ${links.map(([t, u, dsc]) => `<a class="markt-link" target="_blank" rel="noopener" href="${u}"><strong>${t}</strong><span>${esc(dsc)}</span></a>`).join('')}
      </div>
    </section>`;
}

function renderDealDetail() {
  const d = dealById(detailId.deal);
  if (!d) { detailId.deal = null; renderDeals(); return; }
  $('#deal-list-wrap').hidden = true;
  const wrap = $('#deal-detail');
  wrap.hidden = false;
  const c = computeDeal(d.calc);
  const actief = DEAL_STAGES.includes(d.status);
  wrap.innerHTML = `
    <div class="detail-top">
      <button class="btn secondary slim" data-action="back-to-deals">← Alle kansen</button>
      <div class="head-actions">
        <button class="btn secondary slim" data-action="print-deal" data-id="${d.id}">Print calculatie</button>
        <button class="btn secondary slim" data-action="edit-deal" data-id="${d.id}">Bewerken</button>
        ${actief ? `<button class="btn secondary slim" data-action="bid-for-deal" data-id="${d.id}">Bod uitbrengen</button>
        <button class="btn primary slim" data-action="acquire-deal" data-id="${d.id}">Aangekocht →</button>
        <button class="btn secondary slim danger" data-action="drop-deal" data-id="${d.id}">Afhaken</button>` : ''}
      </div>
    </div>
    <div class="panel detail-head">
      <div>
        <p class="eyebrow">${esc(d.ref)} · ${esc(d.ptype)} · ${esc(d.source || '')}</p>
        <h2 class="detail-title">${esc(d.address)}, ${esc(d.city)}</h2>
        <p class="sub">${actief ? `<select class="row-status" data-action="deal-status" data-id="${d.id}">
          ${DEAL_STAGES.map(s => `<option ${d.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>` : statusBadge(d.status)}
        &nbsp; Vraagprijs ${fmtMoney(d.vraagprijs)} · makelaar: ${esc(contactName(d.makelaarId))}
        ${d.viewingDate ? ' · bezichtiging ' + fmtDate(d.viewingDate) : ''}</p>
        ${d.note ? `<p class="sub">${esc(d.note)}</p>` : ''}
      </div>
    </div>
    <div class="kpi-grid six">
      <article class="kpi small"><span>Koopsom / max. bod</span><strong>${fmtMoney(c.koopsom)}</strong></article>
      <article class="kpi small"><span>Totale investering</span><strong>${fmtMoney(c.investering)}</strong></article>
      <article class="kpi small"><span>Waarvan eigen geld</span><strong>${fmtMoney(c.eigenGeld)}</strong></article>
      <article class="kpi small"><span>Verwachte opbrengst</span><strong>${fmtMoney(c.opbrengst)}</strong></article>
      <article class="kpi small"><span>Verwachte winst</span><strong class="${winstClass(c.winst)}">${fmtMoney(c.winst)}</strong></article>
      <article class="kpi small"><span>Rendement</span><strong class="${winstClass(c.winst)}">${fmtNum(c.roi, 1)}%</strong><small>${fmtNum(c.roiEigen, 0)}% op eigen geld</small></article>
    </div>
    <div class="split detail-grid">
      <section class="panel">
        <div class="panel-head compact"><h2>Calculatie</h2><button class="text-btn" data-action="edit-deal" data-id="${d.id}">Aanpassen</button></div>
        <div class="totals-box">${dealBreakdownHTML(c)}</div>
        <p class="hint">Doel-ROI: ${fmtNum(state.settings.doelROI, 0)}%. ${c.roi >= state.settings.doelROI ? 'Deze deal haalt je doel. ✔' : 'Deze deal zit onder je doel — onderhandel of haak af.'}</p>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Biedingen</h2>${actief ? `<button class="text-btn" data-action="bid-for-deal" data-id="${d.id}">+ Bod uitbrengen</button>` : ''}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Datum</th><th>Bedrag</th><th>Geldig tot</th><th>Status</th><th></th></tr></thead>
          <tbody>${(d.biedingen || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(b => `
            <tr><td>${fmtDate(b.date)}</td><td><strong>${fmtMoney(b.amount)}</strong>${b.note ? `<br><span class="sub">${esc(b.note)}</span>` : ''}</td><td>${fmtDate(b.validUntil)}</td>
            <td><select class="row-status" data-action="bid-status" data-id="${d.id}" data-item="${b.id}">
              ${['Uitgebracht', 'Geaccepteerd', 'Afgewezen', 'Verlopen'].map(s => `<option ${b.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select></td>
            <td class="row-actions"><button class="icon-btn" data-action="del-bid" data-id="${d.id}" data-item="${b.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(5, 'Nog geen biedingen uitgebracht.')}</tbody>
        </table></div>
        <p class="hint">Geaccepteerd bod? Zet de status op "Onder voorbehoud" en rond de aankoop af via "Aangekocht →".</p>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head compact"><h2>Foto's</h2>
        <span class="sub">${(d.fotos || []).length} foto's — gaan mee naar het pand bij aankoop</span>
      </div>
      <div class="foto-grid">
        ${(d.fotos || []).map((src, i) => `
          <figure class="foto-thumb">
            <img src="${esc(src)}" loading="lazy" alt="Foto ${i + 1}">
            ${i === 0 ? '<span class="badge gold foto-hoofd-badge">Hoofdfoto</span>' : ''}
            <div class="foto-acties">
              ${i > 0 ? `<button class="icon-btn" data-action="foto-hoofd" data-kind="deal" data-id="${d.id}" data-index="${i}" title="Maak hoofdfoto">★</button>` : ''}
              <button class="icon-btn" data-action="foto-del" data-kind="deal" data-id="${d.id}" data-index="${i}" title="Verwijderen">🗑</button>
            </div>
          </figure>`).join('') || '<p class="empty">Nog geen foto\'s — voeg ze hieronder toe (bijv. van de bezichtiging).</p>'}
      </div>
      <form class="inline-form" data-form="add-foto" data-kind="deal" data-id="${d.id}">
        <input name="url" placeholder="Foto-URL of pad (bijv. fotos/adres-1.jpg)…" required>
        <button class="btn primary slim" type="submit">+</button>
      </form>
      <div class="head-actions">
        <label class="btn secondary slim file-btn">Foto's toevoegen vanaf computer<input type="file" id="foto-upload" data-kind="deal" data-id="${d.id}" accept="image/*" multiple hidden></label>
      </div>
      <p class="hint">Handig bij bezichtigingen. Bij "Aangekocht →" gaan deze foto's automatisch mee naar het pand in je portfolio.</p>
    </section>
    ${marktLinksPanel(d.address, d.city)}`;
}

/* ---------- Dealcalculator ---------- */
function readCalcForm() {
  const f = $('#calc-form');
  const val = name => f.elements[name].value;
  return {
    address: val('address').trim(), city: val('city').trim(),
    vraagprijs: Number(val('vraagprijs')) || 0,
    koopsom: Number(val('koopsom')) || 0,
    verbouwing: Number(val('verbouwing')) || 0,
    verkoopprijs: Number(val('verkoopprijs')) || 0,
    maanden: Number(val('maanden')) || 9,
    financieringPct: Number(val('financieringPct')) || 0,
    otbPct: Number(val('otbPct')) || 0,
    notaris: Number(val('notaris')) || 0,
    makelaarPct: Number(val('makelaarPct')) || 0,
    rentePct: Number(val('rentePct')) || 0,
    vasteLasten: Number(val('vasteLasten')) || 0,
    verkoopkostenPct: Number(val('verkoopkostenPct')) || 0
  };
}

function refreshCalcResult() {
  const input = readCalcForm();
  const c = computeDeal(input);
  const doel = Number(state.settings.doelROI) || 15;
  $('#calc-result').innerHTML = `
    <strong class="calc-headline ${winstClass(c.winst)}">${fmtMoney(c.winst)}</strong>
    <p class="sub">verwachte winst · ${fmtNum(c.roi, 1)}% ROI · ${fmtNum(c.roiEigen, 0)}% op eigen geld</p>
    <p>${c.roi >= doel ? `<span class="badge green">Haalt doel-ROI van ${doel}%</span>` : c.winst > 0 ? `<span class="badge">Onder doel-ROI van ${doel}%</span>` : '<span class="badge red">Verliesgevend — niet doen</span>'}</p>
    <div class="totals-box">${dealBreakdownHTML(c)}</div>`;
  renderCalcScenarios(input);
}

/* ---------- Dealcalculator Pro: scenario's, break-even, gevoeligheid, hold-vs-flip ---------- */
let calcHold = { huur: 1400, jaren: 5, groei: 2 };
const compareSet = new Set(); // ids van aankoopkansen geselecteerd om te vergelijken

/* Break-even zoeken: waarde van 'key' waar de winst precies 0 is (monotone aanname). */
function breakEvenValue(input, key, increasing) {
  let lo = 0, hi = Math.max((Number(input[key]) || 0) * 3, (Number(input.verkoopprijs) || Number(input.koopsom) || 100000) * 3, 100000);
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const w = computeDeal(Object.assign({}, input, { [key]: mid })).winst;
    if ((w > 0) === increasing) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/* Gevoeligheidsanalyse (tornado): welke aanname beweegt de winst het meest? */
function tornadoAnalysis(input) {
  const factors = [
    ['Verkoopprijs', 'verkoopprijs', 0.05, 'pct'],
    ['Verbouwbudget', 'verbouwing', 0.10, 'pct'],
    ['Rente', 'rentePct', 1, 'abs'],
    ['Doorlooptijd', 'maanden', 3, 'abs'],
    ['Koopsom', 'koopsom', 0.03, 'pct']
  ];
  return factors.map(([label, key, amt, mode]) => {
    const cur = Number(input[key]) || 0;
    const low = mode === 'pct' ? cur * (1 - amt) : cur - amt;
    const high = mode === 'pct' ? cur * (1 + amt) : cur + amt;
    const floor = key === 'maanden' ? 1 : 0;
    const wLow = computeDeal(Object.assign({}, input, { [key]: Math.max(floor, low) })).winst;
    const wHigh = computeDeal(Object.assign({}, input, { [key]: Math.max(floor, high) })).winst;
    const rangeLabel = mode === 'pct' ? `±${Math.round(amt * 100)}%` : key === 'rentePct' ? '±1pp' : '±3 mnd';
    return { label, rangeLabel, wLow, wHigh, delta: Math.abs(wHigh - wLow), min: Math.min(wLow, wHigh), max: Math.max(wLow, wHigh) };
  }).sort((a, b) => b.delta - a.delta);
}

/* Aanhouden & verhuren i.p.v. flippen: jaarcashflows → IRR, multiple, cash-on-cash. */
function computeHold(input, hold) {
  const base = computeDeal(input);
  const jaren = Math.max(1, Math.round(Number(hold.jaren) || 5));
  const huurMnd = Number(hold.huur) || 0;
  const groei = Number(hold.groei) || 0;
  const eigenGeld = base.eigenGeld;
  const renteJaar = base.financiering * (Number(input.rentePct) || 0) / 100;
  const lastenJaar = (Number(input.vasteLasten) || 0) * 12;
  const netHuurJaar = huurMnd * 12 - renteJaar - lastenJaar;
  const today = todayISO();
  const flows = [{ date: today, amount: -eigenGeld }];
  for (let y = 1; y <= jaren; y++) {
    let amount = netHuurJaar;
    if (y === jaren) {
      const exitWaarde = (Number(input.verkoopprijs) || 0) * Math.pow(1 + groei / 100, jaren);
      const exitNet = exitWaarde * (1 - (Number(input.verkoopkostenPct) || 0) / 100) - base.financiering;
      amount += exitNet;
    }
    flows.push({ date: addDaysISO(today, Math.round(365 * y)), amount });
  }
  const irr = eigenGeld > 0 ? xirr(flows) : null;
  const totaalOntvangen = flows.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const equityMultiple = eigenGeld > 0 ? totaalOntvangen / eigenGeld : null;
  const cashOnCash = eigenGeld > 0 ? netHuurJaar / eigenGeld * 100 : null;
  // Flip-IRR ter vergelijking (zelfde eigen geld, exit na 'maanden').
  const flipFlows = [{ date: today, amount: -eigenGeld }, { date: addDaysISO(today, Math.round((Number(input.maanden) || 9) * 30.44)), amount: eigenGeld + base.winst }];
  const flipIrr = eigenGeld > 0 ? xirr(flipFlows) : null;
  return { jaren, netHuurJaar, irr, equityMultiple, cashOnCash, flipIrr, eigenGeld, exitJaar: jaren };
}

function renderHoldResult(input) {
  const box = $('#hold-result');
  if (!box) return;
  const h = computeHold(input, calcHold);
  const flipWint = (h.flipIrr !== null && h.irr !== null) ? h.flipIrr >= h.irr : null;
  box.innerHTML = `
    <div class="hold-grid">
      <div><span>Netto huur / jaar</span><strong class="${h.netHuurJaar < 0 ? 'alert' : ''}">${fmtMoney(Math.round(h.netHuurJaar))}</strong></div>
      <div><span>Cash-on-cash</span><strong>${fmtPct(h.cashOnCash, 1)}</strong></div>
      <div><span>IRR aanhouden (${h.jaren} jr)</span><strong>${fmtPct(h.irr, 1)}</strong></div>
      <div><span>Equity multiple</span><strong>${h.equityMultiple === null ? '—' : fmtNum(h.equityMultiple, 2) + '×'}</strong></div>
      <div><span>IRR flippen (${fmtNum(Number(input.maanden) || 9, 0)} mnd)</span><strong>${fmtPct(h.flipIrr, 1)}</strong></div>
    </div>
    ${flipWint === null
      ? `<p class="hint">Vul eigen geld in (financiering &lt; 100%) om IRR's te vergelijken.</p>`
      : `<p class="verdict ${flipWint ? 'flip' : 'hold'}">${flipWint
        ? `<span class="badge gold">Flippen wint</span> Snel verkopen levert een hoger jaarrendement (${fmtPct(h.flipIrr, 1)}) dan ${h.jaren} jaar aanhouden (${fmtPct(h.irr, 1)}).`
        : `<span class="badge green">Aanhouden wint</span> ${h.jaren} jaar verhuren levert een hoger jaarrendement (${fmtPct(h.irr, 1)}) dan direct flippen (${fmtPct(h.flipIrr, 1)}).`}</p>`}`;
}

function renderCalcScenarios(input) {
  const wrap = $('#calc-scenarios');
  if (!wrap) return;
  const base = computeDeal(input);
  const worst = computeDeal(Object.assign({}, input, { verkoopprijs: (Number(input.verkoopprijs) || 0) * 0.95, verbouwing: (Number(input.verbouwing) || 0) * 1.10, maanden: (Number(input.maanden) || 9) + 3 }));
  const best = computeDeal(Object.assign({}, input, { verkoopprijs: (Number(input.verkoopprijs) || 0) * 1.05, verbouwing: (Number(input.verbouwing) || 0) * 0.95 }));
  const maxBod = breakEvenValue(input, 'koopsom', false);
  const minVerkoop = breakEvenValue(input, 'verkoopprijs', true);
  const tornado = tornadoAnalysis(input);
  const maxDelta = Math.max(...tornado.map(t => t.delta), 1);
  const scenarioCol = (titel, c, cls) => `
    <div class="scen-col ${cls}">
      <span class="scen-title">${titel}</span>
      <strong class="${winstClass(c.winst)}">${fmtMoney(c.winst)}</strong>
      <span class="scen-sub">${fmtNum(c.roi, 1)}% ROI</span>
      <span class="scen-sub">${fmtNum(c.roiEigen, 0)}% op eigen geld</span>
    </div>`;
  wrap.innerHTML = `
    <div class="split scen-split">
      <section class="panel">
        <div class="panel-head compact"><h2>Scenario's</h2><span class="sub">slecht · verwacht · goed</span></div>
        <div class="scen-grid">
          ${scenarioCol('Slecht', worst, 'bad')}
          ${scenarioCol('Verwacht', base, 'base')}
          ${scenarioCol('Goed', best, 'good')}
        </div>
        <p class="hint">Slecht = verkoop −5%, verbouwing +10%, 3 mnd langer. Goed = verkoop +5%, verbouwing −5%.</p>
        <div class="breakeven-box">
          <div><span>Max. bod om quitte te spelen</span><strong>${fmtMoney(Math.round(maxBod))}</strong><small>${maxBod >= (Number(input.koopsom) || 0) ? `${fmtMoneyK(maxBod - (Number(input.koopsom) || 0))} marge boven je bod` : 'lager dan je huidige bod — te duur'}</small></div>
          <div><span>Min. verkoopprijs voor break-even</span><strong>${fmtMoney(Math.round(minVerkoop))}</strong><small>${minVerkoop <= (Number(input.verkoopprijs) || 0) ? `${fmtMoneyK((Number(input.verkoopprijs) || 0) - minVerkoop)} buffer onder je raming` : 'boven je raming — risicovol'}</small></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Gevoeligheid</h2><span class="sub">grootste invloed op de winst</span></div>
        <div class="report-bars tornado">
          ${tornado.map(t => `
            <div class="report-bar">
              <span class="rb-label" title="${esc(t.label)}">${esc(t.label)} <span class="sub">${t.rangeLabel}</span></span>
              <div class="rb-track"><span class="rb-fill ${t.min < 0 ? 'neg' : ''}" style="width:${Math.max(3, Math.round(t.delta / maxDelta * 100))}%"></span></div>
              <span class="rb-val">${fmtMoneyK(t.delta)}</span>
            </div>`).join('')}
        </div>
        <p class="hint">Hoe langer de balk, hoe sterker die aanname je winst beïnvloedt. Zet je energie op de bovenste rij.</p>
      </section>
    </div>
    <section class="panel hold-panel">
      <div class="panel-head compact"><h2>Aanhouden &amp; verhuren of flippen?</h2><span class="sub">jaarrendement (IRR) van beide strategieën</span></div>
      <div class="hold-inputs">
        <label>Maandhuur (€)<input type="number" min="0" step="any" class="hold-input" data-hold="huur" value="${esc(calcHold.huur)}"></label>
        <label>Houdperiode (jaren)<input type="number" min="1" max="30" step="1" class="hold-input" data-hold="jaren" value="${esc(calcHold.jaren)}"></label>
        <label>Waardegroei (%/jaar)<input type="number" step="any" class="hold-input" data-hold="groei" value="${esc(calcHold.groei)}"></label>
      </div>
      <div id="hold-result"></div>
    </section>`;
  renderHoldResult(input);
}

function renderCalculator() {
  const f = $('#calc-form');
  const d = calcDefaults();
  // Geavanceerde velden vullen met standaarden uit Instellingen (alleen als leeg)
  [['otbPct', d.otbPct], ['notaris', d.notaris], ['makelaarPct', d.makelaarPct], ['rentePct', d.rentePct], ['vasteLasten', d.vasteLasten], ['verkoopkostenPct', d.verkoopkostenPct]].forEach(([name, value]) => {
    if (f.elements[name].value === '') f.elements[name].value = value;
  });
  refreshCalcResult();
}

/* ---------- Portfolio (lijst + detail) ---------- */
function renderPortfolio() {
  $('#portfolio-list-wrap').hidden = false;
  $('#property-detail').hidden = true;
  const inBezit = state.properties.filter(p => p.status !== 'Verkocht');
  const investSum = inBezit.reduce((sum, p) => sum + propertyFinance(p).investering, 0);
  const finSum = inBezit.reduce((sum, p) => sum + (Number(p.financing?.bedrag) || 0), 0);
  const huurSum = inBezit.reduce((sum, p) => sum + (Number(p.maandhuur) || 0), 0);
  $('#portfolio-kpis').innerHTML = `
    <article class="kpi small"><span>In bezit</span><strong>${inBezit.length} panden</strong><small>${fmtMoney(investSum)} geïnvesteerd</small></article>
    <article class="kpi small"><span>Gefinancierd</span><strong>${fmtMoney(finSum)}</strong><small>eigen vermogen: ${fmtMoney(Math.max(0, investSum - finSum))}</small></article>
    <article class="kpi small"><span>Huurinkomsten</span><strong>${fmtMoney(huurSum)}/mnd</strong><small>${inBezit.filter(p => Number(p.maandhuur) > 0).length} verhuurd</small></article>`;

  const f = filters.portfolio;
  let list = state.properties;
  if (f === 'bezit') list = list.filter(p => p.status !== 'Verkocht');
  else if (f !== 'all') list = list.filter(p => p.status === f);
  $('#portfolio-table').innerHTML = list.length ? list.map(p => {
    const fin = propertyFinance(p);
    return `<tr data-action="open-property" data-id="${p.id}">
      <td>${p.fotos?.[0] ? `<img class="row-thumb" src="${esc(p.fotos[0])}" alt="" loading="lazy">` : ''}<strong>${esc(p.address)}</strong><br><span class="sub">${esc(p.ref)} · ${esc(p.ptype)}${p.label ? ' · label ' + esc(p.label) : ''}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td>${fmtMoney(p.purchase?.koopsom)}<br><span class="sub">${fmtDate(p.purchase?.date)}</span></td>
      <td>${fmtMoney(fin.investering)}${fin.restBudget ? `<br><span class="sub">+ ${fmtMoneyK(fin.restBudget)} budget te gaan</span>` : ''}</td>
      <td>${fin.waarde ? fmtMoney(fin.waarde) : '—'}</td>
      <td class="${winstClass(fin.winst)}">${fin.winst === null ? '—' : `<strong>${fmtMoney(fin.winst)}</strong>`}${fin.verkocht ? '<br><span class="sub">gerealiseerd</span>' : ''}</td>
      <td>${roiBadge(fin.roi)}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit-property" data-id="${p.id}" title="Bewerken">✎</button>
        <button class="icon-btn" data-action="del-property" data-id="${p.id}" title="Verwijderen">🗑</button>
      </td>
    </tr>`;
  }).join('') : emptyRow(8, 'Geen panden in deze weergave. Rond een aankoopkans af of voeg een pand toe.');
}

function renderPropertyDetail() {
  const p = propertyById(detailId.property);
  if (!p) { detailId.property = null; renderPortfolio(); return; }
  $('#portfolio-list-wrap').hidden = true;
  const wrap = $('#property-detail');
  wrap.hidden = false;
  const fin = propertyFinance(p);
  const projects = state.projects.filter(pr => pr.propertyId === p.id);
  const costs = state.costs.filter(k => k.propertyId === p.id).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const inVerkoop = ['Te koop', 'Onder bod', 'Verkocht'].includes(p.status);
  const t = todayISO();

  wrap.innerHTML = `
    <div class="detail-top">
      <button class="btn secondary slim" data-action="back-to-portfolio">← Alle panden</button>
      <div class="head-actions">
        ${p.status !== 'Verkocht' ? `
          <button class="btn secondary slim" data-action="new-project-for" data-id="${p.id}">+ Project</button>
          <button class="btn secondary slim" data-action="new-cost-for" data-id="${p.id}">+ Kostenpost</button>
          ${inVerkoop ? `
            <button class="btn secondary slim" data-action="viewing-for" data-id="${p.id}">+ Bezichtiging</button>
            <button class="btn secondary slim" data-action="offer-for" data-id="${p.id}">+ Bod ontvangen</button>
            <button class="btn primary slim" data-action="sale-for" data-id="${p.id}">Verkoop afronden</button>` : ''}` : ''}
        <button class="btn secondary slim" data-action="edit-property" data-id="${p.id}">Bewerken</button>
      </div>
    </div>
    <div class="panel detail-head">
      <div>
        <p class="eyebrow">${esc(p.ref)} · ${esc(p.ptype)} ${p.label ? '· energielabel ' + esc(p.label) : '· <b class="alert">geen energielabel</b>'}</p>
        <h2 class="detail-title">${esc(p.address)}, ${esc(p.city)}</h2>
        <p class="sub">${p.status === 'Verkocht' ? statusBadge(p.status) : `<select class="row-status" data-action="property-status" data-id="${p.id}">
          ${['In ontwikkeling', 'Te koop', 'Onder bod', 'Verhuurd'].map(s => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>`}
        &nbsp; Aangekocht ${fmtDate(p.purchase?.date)} · in bezit ${fmtNum(fin.maanden, 1)} mnd
        ${p.note ? '· ' + esc(p.note) : ''}</p>
      </div>
    </div>
    <div class="kpi-grid six">
      <article class="kpi small"><span>Aankoop totaal</span><strong>${fmtMoney(fin.aankoop)}</strong><small>koopsom ${fmtMoneyK(p.purchase?.koopsom)}</small></article>
      <article class="kpi small"><span>Ontwikkelkosten</span><strong>${fmtMoney(fin.ontwikkeld)}</strong>${fin.restBudget ? `<small>+ ${fmtMoneyK(fin.restBudget)} budget te gaan</small>` : ''}</article>
      <article class="kpi small"><span>Houdkosten</span><strong>${fmtMoney(fin.houdkosten)}</strong><small>${fmtMoney(fin.renteMnd + fin.lastenMnd)}/mnd</small></article>
      <article class="kpi small"><span>${fin.huur ? 'Huurinkomsten' : 'Totale investering'}</span><strong>${fin.huur ? fmtMoney(fin.huur) : fmtMoney(fin.investering)}</strong>${fin.huur ? `<small>${fmtMoney(p.maandhuur)}/mnd</small>` : ''}</article>
      <article class="kpi small"><span>${fin.verkocht ? 'Verkocht voor' : 'Waarde (vraag/taxatie)'}</span><strong>${fin.waarde ? fmtMoney(fin.waarde) : '—'}</strong></article>
      <article class="kpi small"><span>${fin.verkocht ? 'Gerealiseerde winst' : 'Verwachte winst'}</span><strong class="${winstClass(fin.winst)}">${fin.winst === null ? '—' : fmtMoney(fin.winst)}</strong><small>${fin.roi === null ? '' : fmtNum(fin.roi, 1) + '% ROI'}</small></article>
    </div>
    <div class="split detail-grid">
      <section class="panel">
        <div class="panel-head compact"><h2>Financiering &amp; lasten</h2></div>
        <div class="totals-box">
          <div><dt>Financier</dt><dd>${esc(contactName(p.financing?.financierId))}</dd></div>
          <div><dt>Hoofdsom</dt><dd>${fmtMoney(p.financing?.bedrag)}</dd></div>
          <div><dt>Rente</dt><dd>${fmtNum(p.financing?.rentePct, 1)}% → ${fmtMoney(fin.renteMnd)}/mnd</dd></div>
          <div><dt>Vaste lasten</dt><dd>${fmtMoney(p.vasteLasten)}/mnd</dd></div>
          <div class="${p.financing?.einddatum && daysBetween(t, p.financing.einddatum) <= 60 ? 'alert' : ''}"><dt>Einddatum / herziening</dt><dd>${fmtDate(p.financing?.einddatum)}</dd></div>
          ${Number(p.maandhuur) > 0 ? `<div><dt>Verhuurd aan</dt><dd>${esc(p.huurder || '—')} · ${fmtMoney(p.maandhuur)}/mnd</dd></div>` : ''}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Documenten</h2>
          <span class="sub">${(p.docs || []).filter(d => d.file || d.url).length} met bestand</span>
        </div>
        <div class="check-list">
          ${(p.docs || []).map(doc => `
            <div class="check-item ${doc.done ? 'done' : ''}">
              <button class="task-check ${doc.done ? 'checked' : ''}" data-action="toggle-doc" data-id="${p.id}" data-item="${doc.id}" aria-label="Afvinken"></button>
              <span>${esc(doc.name)}</span>
              ${(doc.file || doc.url) ? `<a class="text-btn doc-link" href="${esc(doc.file || doc.url)}" download="${esc(doc.name)}" target="_blank" rel="noopener">Bekijk ↗</a>` : ''}
              <button class="icon-btn" data-action="del-doc" data-id="${p.id}" data-item="${doc.id}" title="Verwijderen">🗑</button>
            </div>`).join('') || '<p class="empty">Geen documenten.</p>'}
        </div>
        <form class="inline-form" data-form="add-doc" data-id="${p.id}">
          <input name="name" placeholder="Document (naam of pad/URL)…" required>
          <button class="btn primary slim" type="submit">+</button>
        </form>
        <div class="head-actions">
          <label class="btn secondary slim file-btn">Bestand(en) uploaden<input type="file" id="doc-upload" data-id="${p.id}" accept="application/pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,text/plain" multiple hidden></label>
        </div>
        <p class="hint">Upload koopakte, taxatierapport, contract enz. (max 3 MB per bestand — grotere bestanden als pad bewaren: "docs/akte.pdf").</p>
      </section>
    </div>
    ${(p.status === 'Verhuurd' || Number(p.maandhuur) > 0) ? `
    <section class="panel">
      <div class="panel-head compact"><h2>Verhuur &amp; beheer</h2>
        <span class="sub">${esc(p.huurder || 'Geen huurder')} · ${fmtMoney(p.maandhuur)}/mnd</span>
      </div>
      <div class="split detail-grid">
        <div class="totals-box">
          <div><dt>Huurder</dt><dd>${esc(p.huurder || '—')}</dd></div>
          <div><dt>Maandhuur</dt><dd>${fmtMoney(p.maandhuur)}</dd></div>
          <div><dt>Ingangsdatum</dt><dd>${fmtDate(p.huurIngang)}</dd></div>
          <div class="${p.huurEind && daysBetween(t, p.huurEind) <= 90 && daysBetween(t, p.huurEind) >= 0 ? 'alert' : ''}"><dt>Einddatum contract</dt><dd>${p.huurEind ? fmtDate(p.huurEind) : 'Onbepaalde tijd'}</dd></div>
          <div><dt>Waarborgsom</dt><dd>${fmtMoney(p.borg)}</dd></div>
          <div><dt>Jaarlijkse indexering</dt><dd>${fmtNum(p.huurIndexPct || 0, 1)}%${Number(p.huurIndexPct) > 0 ? ` → ${fmtMoney(Math.round((Number(p.maandhuur) || 0) * (1 + (Number(p.huurIndexPct) || 0) / 100)))}/mnd na indexatie` : ''}</dd></div>
        </div>
        <div>
          <h3 class="table-title">Onderhoudsverzoeken (${(p.onderhoud || []).filter(o => o.status !== 'Afgehandeld').length} open)</h3>
          <div class="table-wrap"><table>
            <thead><tr><th>Datum</th><th>Verzoek</th><th>Status</th><th></th></tr></thead>
            <tbody>${(p.onderhoud || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(o => `
              <tr><td>${fmtDate(o.date)}</td><td>${esc(o.desc)}</td>
              <td><select class="row-status" data-action="maint-status" data-id="${p.id}" data-item="${o.id}">
                ${['Open', 'In behandeling', 'Afgehandeld'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select></td>
              <td class="row-actions"><button class="icon-btn" data-action="del-maint" data-id="${p.id}" data-item="${o.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(4, 'Geen onderhoudsverzoeken.')}</tbody>
          </table></div>
          <form class="inline-form" data-form="add-maint" data-id="${p.id}">
            <input name="desc" placeholder="Eigen notitie / onderhoudsverzoek…" required>
            <button class="btn primary slim" type="submit">+</button>
          </form>
          ${(() => {
            const cm = (state.cloudMaintenance || []).filter(m => m.localPropertyId === p.id);
            if (!cm.length) return '<p class="hint" style="margin-top:10px">Meldingen die de huurder via het portaal instuurt verschijnen hier na "Synchroniseer nu" (Instellingen → Cloud).</p>';
            return `<h3 class="table-title" style="margin-top:16px">Via huurdersportaal (${cm.filter(m => m.status !== 'Afgehandeld').length} open)</h3>
            <div class="table-wrap"><table>
              <thead><tr><th>Datum</th><th>Melding</th><th>Status</th></tr></thead>
              <tbody>${cm.map(m => `
                <tr><td>${fmtDateTime(m.created_at)}</td>
                <td>${esc(m.descr)}${m.photoUrl ? ` · <a href="${esc(m.photoUrl)}" target="_blank" rel="noopener" class="text-btn">📷 foto</a>` : ''}</td>
                <td><select class="row-status" data-action="cloud-maint-status" data-id="${m.id}">
                  ${['Open', 'In behandeling', 'Afgehandeld'].map(s => `<option ${m.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select></td></tr>`).join('')}</tbody>
            </table></div>
            <p class="hint">Wijzig je de status, dan ziet de huurder dat direct terug in zijn portaal.</p>`;
          })()}
        </div>
      </div>
    </section>` : ''}
    ${inVerkoop ? `
    <section class="panel">
      <div class="panel-head compact"><h2>Verkoopdossier</h2>
        <span class="sub">${p.status === 'Verkocht' ? `Verkocht ${fmtDate(p.sale?.date)} aan ${esc(p.sale?.koper || '—')}` : `Vraagprijs ${fmtMoney(p.vraagprijs)} · te koop sinds ${fmtDate(p.teKoopSinds)}${p.teKoopSinds ? ' (' + daysBetween(p.teKoopSinds, t) + ' dgn)' : ''}`}</span>
      </div>
      <div class="split detail-grid">
        <div>
          <h3 class="table-title">Bezichtigingen (${(p.viewings || []).length})</h3>
          <div class="table-wrap"><table>
            <thead><tr><th>Datum</th><th>Wie</th><th>Indruk</th><th></th></tr></thead>
            <tbody>${(p.viewings || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(v => `
              <tr><td>${fmtDate(v.date)}</td><td>${esc(v.name)}</td><td class="sub">${esc(v.note || '')}</td>
              <td class="row-actions"><button class="icon-btn" data-action="del-viewing" data-id="${p.id}" data-item="${v.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(4, 'Nog geen bezichtigingen.')}</tbody>
          </table></div>
        </div>
        <div>
          <h3 class="table-title">Ontvangen biedingen</h3>
          <div class="table-wrap"><table>
            <thead><tr><th>Datum</th><th>Bieder</th><th>Bedrag</th><th>Status</th><th></th></tr></thead>
            <tbody>${(p.offers || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(o => `
              <tr><td>${fmtDate(o.date)}</td><td>${esc(o.name)}${o.note ? `<br><span class="sub">${esc(o.note)}</span>` : ''}</td><td><strong>${fmtMoney(o.amount)}</strong></td>
              <td><select class="row-status" data-action="offer-status" data-id="${p.id}" data-item="${o.id}">
                ${['Ontvangen', 'Geaccepteerd', 'Afgewezen'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select></td>
              <td class="row-actions"><button class="icon-btn" data-action="del-offer" data-id="${p.id}" data-item="${o.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(5, 'Nog geen biedingen ontvangen.')}</tbody>
          </table></div>
          <p class="hint">Bod geaccepteerd? De status springt naar "Onder bod". Rond daarna af met "Verkoop afronden".</p>
        </div>
      </div>
    </section>` : ''}
    <div class="split detail-grid">
      <section class="panel">
        <div class="panel-head compact"><h2>Projecten op dit pand</h2><button class="text-btn" data-action="new-project-for" data-id="${p.id}">+ Project</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Project</th><th>Status</th><th>Budget</th><th>Realisatie</th></tr></thead>
          <tbody>${projects.map(pr => {
            const actual = state.costs.filter(k => k.projectId === pr.id).reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
            return `<tr data-action="open-project" data-id="${pr.id}"><td><strong>${esc(pr.name)}</strong></td><td>${statusBadge(pr.status)}</td>
            <td>${fmtMoney(pr.budget)}</td><td class="${actual > pr.budget ? 'alert' : ''}">${fmtMoney(actual)}</td></tr>`;
          }).join('') || emptyRow(4, 'Nog geen projecten op dit pand.')}</tbody>
        </table></div>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Kosten op dit pand</h2><button class="text-btn" data-action="new-cost-for" data-id="${p.id}">+ Kostenpost</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Datum</th><th>Omschrijving</th><th>Bedrag</th><th>Status</th></tr></thead>
          <tbody>${costs.slice(0, 8).map(k => `
            <tr><td>${fmtDate(k.date)}</td><td>${esc(k.desc)}<br><span class="sub">${esc(contactName(k.contactId))}</span></td>
            <td>${fmtMoney(k.amount)}</td><td>${statusBadge(k.status)}</td></tr>`).join('') || emptyRow(4, 'Nog geen kosten geboekt.')}</tbody>
        </table></div>
        ${costs.length > 8 ? `<p class="hint">Laatste 8 van ${costs.length} — zie Kosten voor alles.</p>` : ''}
      </section>
    </div>
    <section class="panel">
      <div class="panel-head compact"><h2>Foto's voor de website</h2>
        <span class="sub">${(p.fotos || []).length} foto's — de eerste is de hoofdfoto</span>
      </div>
      <div class="foto-grid">
        ${(p.fotos || []).map((src, i) => `
          <figure class="foto-thumb">
            <img src="${esc(src)}" loading="lazy" alt="Foto ${i + 1}">
            ${i === 0 ? '<span class="badge gold foto-hoofd-badge">Hoofdfoto</span>' : ''}
            <div class="foto-acties">
              ${i > 0 ? `<button class="icon-btn" data-action="foto-hoofd" data-id="${p.id}" data-index="${i}" title="Maak hoofdfoto">★</button>` : ''}
              <button class="icon-btn" data-action="foto-del" data-id="${p.id}" data-index="${i}" title="Verwijderen">🗑</button>
            </div>
          </figure>`).join('') || '<p class="empty">Nog geen foto\'s — voeg ze hieronder toe.</p>'}
      </div>
      <form class="inline-form" data-form="add-foto" data-id="${p.id}">
        <input name="url" placeholder="Foto-URL of pad (bijv. fotos/adres-1.jpg)…" required>
        <button class="btn primary slim" type="submit">+</button>
      </form>
      <div class="head-actions">
        <label class="btn secondary slim file-btn">Foto's toevoegen vanaf computer<input type="file" id="foto-upload" data-id="${p.id}" accept="image/*" multiple hidden></label>
      </div>
      <p class="hint">Tip: zet fotobestanden in de map <b>fotos</b> van de software en voeg ze toe als "fotos/bestandsnaam.jpg". Foto's vanaf de computer worden verkleind in de software opgeslagen (max. 8 per pand).</p>
    </section>
    <section class="panel">
      <div class="panel-head compact"><h2>Verzekeringen</h2>
        <button class="btn secondary slim" data-action="ins-add" data-id="${p.id}">+ Verzekering</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Type</th><th>Verzekeraar</th><th>Polis</th><th>Premie/jaar</th><th>Vervalt</th><th></th></tr></thead>
        <tbody>${(p.verzekeringen || []).map(v => `<tr>
          <td><strong>${esc(v.type)}</strong></td><td>${esc(v.verzekeraar || '—')}</td><td>${esc(v.polis || '—')}</td><td>${fmtMoney(v.premie)}</td>
          <td class="${v.eind && daysBetween(t, v.eind) >= 0 && daysBetween(t, v.eind) <= 60 ? 'alert' : ''}">${fmtDate(v.eind)}</td>
          <td class="row-actions"><button class="icon-btn" data-action="ins-edit" data-id="${p.id}" data-item="${v.id}" title="Bewerken">✎</button>
          <button class="icon-btn" data-action="ins-del" data-id="${p.id}" data-item="${v.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(6, 'Nog geen verzekeringen geregistreerd.')}</tbody>
      </table></div>
    </section>
    ${(Number(p.vveBijdrage) || Number(p.vveReserve) || p.mjopDatum || p.doelLabel || p.subsidieType || p.verduurzaming) ? `
    <div class="split detail-grid">
      ${(Number(p.vveBijdrage) || Number(p.vveReserve) || p.mjopDatum) ? `
      <section class="panel">
        <div class="panel-head compact"><h2>VvE</h2></div>
        <div class="totals-box">
          <div><dt>Maandbijdrage</dt><dd>${fmtMoney(p.vveBijdrage)}</dd></div>
          <div><dt>Reservefonds (aandeel)</dt><dd>${fmtMoney(p.vveReserve)}</dd></div>
          <div class="${p.mjopDatum && daysBetween(t, p.mjopDatum) < 0 ? 'alert' : ''}"><dt>MJOP geldig tot</dt><dd>${fmtDate(p.mjopDatum)}</dd></div>
        </div>
      </section>` : ''}
      ${(p.doelLabel || p.subsidieType || p.verduurzaming || Number(p.subsidieBedrag)) ? `
      <section class="panel">
        <div class="panel-head compact"><h2>Verduurzaming &amp; subsidie</h2></div>
        <div class="totals-box">
          <div><dt>Energielabel</dt><dd>${p.label ? esc(p.label) : '—'}${p.doelLabel ? ` → doel <strong>${esc(p.doelLabel)}</strong>` : ''}</dd></div>
          ${p.subsidieType ? `<div><dt>Subsidie</dt><dd>${esc(p.subsidieType)}${Number(p.subsidieBedrag) ? ' · ' + fmtMoney(p.subsidieBedrag) : ''}</dd></div>` : ''}
          ${p.verduurzaming ? `<div><dt>Maatregelen</dt><dd>${esc(p.verduurzaming)}</dd></div>` : ''}
        </div>
      </section>` : ''}
    </div>` : ''}
    ${marktLinksPanel(p.address, p.city)}
    <section class="panel">
      <div class="panel-head compact"><h2>Locatie</h2>
        <a class="text-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address + ', ' + p.city)}">Open in Google Maps →</a>
      </div>
      <iframe class="maps-embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(p.address + ', ' + p.city)}&output=embed" title="Kaart ${esc(p.address)}"></iframe>
    </section>`;
}

/* ---------- Ontwikkelprojecten ---------- */
function projectActual(pr) {
  return state.costs.filter(k => k.projectId === pr.id).reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
}

/* Forecast-to-completion (EAC): voorspel de eindkosten op basis van het besteedtempo,
   zodat je een budgetoverschrijding ziet aankomen vóórdat het geld op is. */
function calculateEAC(pr) {
  const committed = projectActual(pr);
  const budget = Number(pr.budget) || 0;
  const t = todayISO();
  let timeFrac = null;
  if (pr.startDate && pr.endDate) {
    const total = daysBetween(pr.startDate, pr.endDate);
    const elapsed = daysBetween(pr.startDate, t);
    if (total > 0) timeFrac = Math.min(1, Math.max(0, elapsed / total));
  }
  let eac = committed, basis = 'committed';
  if (pr.status === 'Afgerond') { basis = 'done'; }
  else if (timeFrac !== null && timeFrac > 0.05 && committed > 0) {
    // Lineaire extrapolatie van het huidige besteedtempo naar de opleverdatum.
    eac = Math.max(committed, committed / timeFrac);
    basis = 'runrate';
  }
  return { committed, budget, eac: Math.round(eac), timeFrac, basis, over: Math.round(eac - budget) };
}

/* Burn-up: cumulatieve kosten in de tijd, met budgetlijn en prognoselijn tot oplevering. */
function burnUpSvg(pr) {
  const start = pr.startDate, end = pr.endDate;
  if (!start || !end || daysBetween(start, end) <= 0) return '<p class="hint">Vul start- en opleverdatum in voor een prognosegrafiek.</p>';
  const e = calculateEAC(pr);
  const t = todayISO();
  const W = 760, H = 220, padL = 60, padR = 14, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x0 = new Date(start + 'T12:00:00').getTime();
  const span = (new Date(end + 'T12:00:00').getTime() - x0) || 1;
  const maxY = Math.max(e.budget, e.eac, e.committed, 1) * 1.1;
  const X = iso => padL + Math.max(0, Math.min(1, (new Date(iso + 'T12:00:00').getTime() - x0) / span)) * innerW;
  const Y = v => padT + innerH - (v / maxY) * innerH;
  const costs = state.costs.filter(k => k.projectId === pr.id && k.date).slice().sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0; const pts = [[X(start), Y(0)]];
  costs.forEach(k => { if (k.date <= t) { cum += Number(k.amount) || 0; pts.push([X(k.date), Y(cum)]); } });
  const todayX = X(t > end ? end : t);
  pts.push([todayX, Y(cum)]);
  const actualLine = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const over = e.eac > e.budget;
  const fcColor = over ? '#b03a3a' : '#1e6a42';
  const budgetY = Y(e.budget);
  return `<svg viewBox="0 0 ${W} ${H}" class="burnup-svg" role="img" aria-label="Burn-up prognose">
    <line x1="${padL}" y1="${budgetY.toFixed(1)}" x2="${W - padR}" y2="${budgetY.toFixed(1)}" stroke="#b49030" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="${padL - 6}" y="${budgetY.toFixed(1)}" text-anchor="end" dominant-baseline="middle" style="font-size:10px;fill:#6f756f">${esc(fmtMoneyK(e.budget))}</text>
    <line x1="${todayX.toFixed(1)}" y1="${padT}" x2="${todayX.toFixed(1)}" y2="${padT + innerH}" stroke="rgba(12,11,9,.18)" stroke-width="1"/>
    <polyline points="${actualLine}" fill="none" stroke="#0b1e30" stroke-width="2.5"/>
    <polyline points="${todayX.toFixed(1)},${Y(cum).toFixed(1)} ${X(end).toFixed(1)},${Y(e.eac).toFixed(1)}" fill="none" stroke="${fcColor}" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="${X(end).toFixed(1)}" cy="${Y(e.eac).toFixed(1)}" r="3.5" fill="${fcColor}"><title>Prognose eindkosten: ${esc(fmtMoney(e.eac))}</title></circle>
    <text x="${padL}" y="${H - 8}" style="font-size:10px;fill:#6f756f">${esc(fmtDate(start))}</text>
    <text x="${W - padR}" y="${H - 8}" text-anchor="end" style="font-size:10px;fill:#6f756f">${esc(fmtDate(end))}</text>
  </svg>
  <p class="cf-legend" style="display:flex;gap:16px;flex-wrap:wrap;font-size:.76rem;color:var(--muted);margin:8px 0 0">
    <span class="cf-dot" style="background:#0b1e30"></span>Besteed tot nu
    <span class="cf-dot" style="background:${fcColor}"></span>Prognose tot oplevering
    <span class="cf-dot" style="background:#b49030"></span>Budget</p>`;
}

function renderProjects() {
  $('#project-list-wrap').hidden = false;
  $('#project-detail').hidden = true;
  const f = filters.project;
  let list = state.projects;
  if (f === 'actief') list = list.filter(pr => pr.status !== 'Afgerond');
  else if (f !== 'all') list = list.filter(pr => pr.status === f);
  $('#projects-table').innerHTML = list.length ? list.map(pr => {
    const actual = projectActual(pr);
    const diff = (Number(pr.budget) || 0) - actual;
    const e = calculateEAC(pr);
    const forecastOver = diff >= 0 && e.basis === 'runrate' && e.eac > e.budget;
    const phases = pr.phases || [];
    const progress = phases.length ? Math.round(phases.filter(ph => ph.status === 'Klaar').length / phases.length * 100) : 0;
    return `<tr data-action="open-project" data-id="${pr.id}">
      <td><strong>${esc(pr.name)}</strong><br><span class="sub">${esc(pr.ref)} · ${fmtDate(pr.startDate)} → ${fmtDate(pr.endDate)}</span></td>
      <td>${esc(propertyLabel(pr.propertyId))}</td>
      <td>${statusBadge(pr.status)}</td>
      <td>${fmtMoney(pr.budget)}</td>
      <td>${fmtMoney(actual)}</td>
      <td class="${diff < 0 ? 'alert' : ''}"><strong>${fmtMoney(diff)}</strong>${forecastOver ? `<br><span class="sub alert">prognose ${fmtMoneyK(e.over)} over</span>` : ''}</td>
      <td><div class="progress small"><i style="width:${progress}%"></i></div><span class="sub">${progress}%</span></td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit-project" data-id="${pr.id}" title="Bewerken">✎</button>
        <button class="icon-btn" data-action="del-project" data-id="${pr.id}" title="Verwijderen">🗑</button>
      </td>
    </tr>`;
  }).join('') : emptyRow(8, 'Geen projecten in deze weergave.');
}

function renderProjectDetail() {
  const pr = projectById(detailId.project);
  if (!pr) { detailId.project = null; renderProjects(); return; }
  $('#project-list-wrap').hidden = true;
  const wrap = $('#project-detail');
  wrap.hidden = false;
  const actual = projectActual(pr);
  const budget = Number(pr.budget) || 0;
  const diff = budget - actual;
  const phases = pr.phases || [];
  const progress = phases.length ? Math.round(phases.filter(ph => ph.status === 'Klaar').length / phases.length * 100) : 0;
  const costs = state.costs.filter(k => k.projectId === pr.id).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  wrap.innerHTML = `
    <div class="detail-top">
      <button class="btn secondary slim" data-action="back-to-projects">← Alle projecten</button>
      <div class="head-actions">
        <button class="btn secondary slim" data-action="new-cost-for-project" data-id="${pr.id}">+ Kostenpost</button>
        <button class="btn secondary slim" data-action="edit-project" data-id="${pr.id}">Bewerken</button>
      </div>
    </div>
    <div class="panel detail-head">
      <div>
        <p class="eyebrow">${esc(pr.ref)} · <a href="#pand/${pr.propertyId}">${esc(propertyLabel(pr.propertyId))}</a></p>
        <h2 class="detail-title">${esc(pr.name)}</h2>
        <p class="sub">${statusBadge(pr.status)} &nbsp; ${fmtDate(pr.startDate)} → ${fmtDate(pr.endDate)} ${pr.note ? '· ' + esc(pr.note) : ''}</p>
      </div>
      <div class="progress-wrap">
        <div class="progress"><i style="width:${progress}%"></i></div>
        <span class="sub">${progress}% van de fases klaar</span>
      </div>
    </div>
    ${(() => {
      const e = calculateEAC(pr);
      const over = e.basis === 'runrate' && e.eac > e.budget;
      const prognoseSub = e.basis === 'runrate'
        ? (over ? `<small class="alert">${fmtMoneyK(e.over)} over budget</small>` : `<small>binnen budget</small>`)
        : (e.committed > e.budget ? '<small class="alert">al over budget</small>' : '<small>nog te weinig data</small>');
      return `<div class="kpi-grid">
      <article class="kpi small"><span>Budget</span><strong>${fmtMoney(budget)}</strong></article>
      <article class="kpi small"><span>Realisatie</span><strong>${fmtMoney(actual)}</strong><small>${costs.length} kostenposten</small></article>
      <article class="kpi small"><span>${diff < 0 ? 'Over budget' : 'Resterend budget'}</span><strong class="${diff < 0 ? 'alert' : ''}">${fmtMoney(Math.abs(diff))}</strong></article>
      <article class="kpi small"><span>Prognose eindkosten</span><strong class="${over ? 'alert' : ''}">${fmtMoney(e.eac)}</strong>${prognoseSub}</article>
      <article class="kpi small"><span>Geplande oplevering</span><strong>${fmtDate(pr.endDate)}</strong>${pr.endDate && pr.endDate < todayISO() && pr.status !== 'Afgerond' ? '<small class="alert">uitgelopen</small>' : ''}</article>
    </div>`;
    })()}
    ${pr.status !== 'Afgerond' ? `<section class="panel burnup-panel">
      <div class="panel-head compact"><h2>Kostenprognose (burn-up)</h2><span class="sub">besteedtempo → verwachte eindkosten</span></div>
      ${burnUpSvg(pr)}
      <p class="hint">De stippellijn extrapoleert je huidige besteedtempo naar de opleverdatum. Kruist die de budgetlijn, dan stuur je nu bij in plaats van achteraf.</p>
    </section>` : ''}
    <div class="split detail-grid">
      <section class="panel">
        <div class="panel-head compact"><h2>Fases</h2></div>
        <div class="phase-list">
          ${phases.map(ph => {
            const tasks = ph.tasks || [];
            const done = tasks.filter(x => x.done).length;
            return `<div class="phase ${ph.status === 'Klaar' ? 'done' : ''}">
              <div class="phase-head">
                <strong>${esc(ph.name)}${tasks.length ? ` <span class="sub">(${done}/${tasks.length})</span>` : ''}</strong>
                <select data-action="phase-status" data-id="${pr.id}" data-phase="${ph.id}">
                  ${['Te doen', 'Bezig', 'Klaar'].map(s => `<option ${ph.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                <button class="icon-btn" data-action="del-phase" data-id="${pr.id}" data-phase="${ph.id}" title="Fase verwijderen">🗑</button>
              </div>
              ${tasks.length ? `<div class="phase-tasks">${tasks.map(tk => `<div class="phase-task ${tk.done ? 'done' : ''}">
                <button class="task-check ${tk.done ? 'checked' : ''}" data-action="toggle-phase-task" data-id="${pr.id}" data-phase="${ph.id}" data-item="${tk.id}" aria-label="Afvinken"></button>
                <span>${esc(tk.title)}</span>
                <button class="icon-btn" data-action="del-phase-task" data-id="${pr.id}" data-phase="${ph.id}" data-item="${tk.id}" title="Verwijderen">🗑</button>
              </div>`).join('')}</div>` : ''}
              <form class="inline-form slim-form" data-form="add-phase-task" data-id="${pr.id}" data-phase="${ph.id}">
                <input name="title" placeholder="+ taak voor deze fase…" required>
                <button class="btn primary slim" type="submit">+</button>
              </form>
            </div>`;
          }).join('')}
        </div>
        <form class="inline-form" data-form="add-phase" data-id="${pr.id}">
          <input name="name" placeholder="Nieuwe fase…" required>
          <button class="btn primary slim" type="submit">+</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Opleverpunten</h2></div>
        <p class="hint">Loop deze lijst na vóór oplevering richting verkoop of verhuur.</p>
        <div class="check-list">
          ${(pr.opleverpunten || []).map(o => `
            <div class="check-item ${o.done ? 'done' : ''}">
              <button class="task-check ${o.done ? 'checked' : ''}" data-action="toggle-oplever" data-id="${pr.id}" data-item="${o.id}" aria-label="Afvinken"></button>
              <span>${esc(o.desc)}</span>
              <button class="icon-btn" data-action="del-oplever" data-id="${pr.id}" data-item="${o.id}" title="Verwijderen">🗑</button>
            </div>`).join('') || '<p class="empty">Nog geen opleverpunten.</p>'}
        </div>
        <form class="inline-form" data-form="add-oplever" data-id="${pr.id}">
          <input name="desc" placeholder="Nieuw opleverpunt…" required>
          <button class="btn primary slim" type="submit">+</button>
        </form>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head compact"><h2>Kosten op dit project</h2><button class="text-btn" data-action="new-cost-for-project" data-id="${pr.id}">+ Kostenpost</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datum</th><th>Leverancier</th><th>Omschrijving</th><th>Categorie</th><th>Bedrag</th><th>Status</th><th></th></tr></thead>
        <tbody>${costs.map(k => `
          <tr><td>${fmtDate(k.date)}</td><td>${esc(contactName(k.contactId))}</td><td>${esc(k.desc)}</td><td>${esc(k.category)}</td>
          <td><strong>${fmtMoney(k.amount)}</strong></td>
          <td><select class="row-status" data-action="cost-status" data-id="${k.id}">
            ${['Opdracht', 'Factuur ontvangen', 'Betaald'].map(s => `<option ${k.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></td>
          <td class="row-actions"><button class="icon-btn" data-action="edit-cost" data-id="${k.id}" title="Bewerken">✎</button>
          <button class="icon-btn" data-action="del-cost" data-id="${k.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(7, 'Nog geen kosten op dit project.')}</tbody>
      </table></div>
    </section>
    <div class="split detail-grid">
      <section class="panel">
        <div class="panel-head compact"><h2>Website-updates</h2>${pr.publish ? '<span class="badge green">Op de website</span>' : '<span class="badge gray">Niet gepubliceerd</span>'}</div>
        <p class="hint">Korte voortgangsberichten voor volgers. Zet publicatie aan via Bewerken en klik daarna op "Publiceer website (JSON)".</p>
        <div class="check-list">
          ${(pr.updates || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(u => `
            <div class="check-item">
              <span class="badge gray">${fmtDate(u.date)}</span>
              <span>${esc(u.text)}</span>
              <button class="icon-btn" data-action="del-update" data-id="${pr.id}" data-item="${u.id}" title="Verwijderen">🗑</button>
            </div>`).join('') || '<p class="empty">Nog geen updates.</p>'}
        </div>
        <form class="inline-form" data-form="add-update" data-id="${pr.id}">
          <input name="text" placeholder="Nieuwe update… (bijv. dak gereed, installaties gestart)" required>
          <button class="btn primary slim" type="submit">+</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Investeerders</h2>${pr.invest?.open ? '<span class="badge green">Open voor inleg</span>' : '<span class="badge gray">Gesloten</span>'}</div>
        ${(() => {
          const doel = Number(pr.invest?.doelbedrag) || 0;
          const opgehaald = (pr.investeerders || []).reduce((s, i) => s + (Number(i.bedrag) || 0), 0);
          const pct = doel ? Math.min(100, Math.round(opgehaald / doel * 100)) : 0;
          return `<div class="totals-box">
            <div><dt>Opgehaald</dt><dd>${fmtMoney(opgehaald)}${doel ? ' van ' + fmtMoney(doel) + ' (' + pct + '%)' : ''}</dd></div>
            ${doel ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ''}
            ${pr.invest?.open ? `<div><dt>Min. inleg · rendement · looptijd</dt><dd>${fmtMoney(pr.invest.minInleg)} · ${fmtNum(pr.invest.rendementPct, 1)}%/jr · ${esc(pr.invest.looptijd || '—')}</dd></div>` : ''}
          </div>`;
        })()}
        ${(() => {
          const inv = pr.investeerders || [];
          const geverifieerd = inv.filter(i => i.wwft).length;
          const rPct = Number(pr.invest?.rendementPct) || 0;
          return `<p class="hint">Wwft (anti-witwas): controleer en leg identiteit + herkomst van de inleg vast vóór je geld aanneemt. ${inv.length ? `<b>${geverifieerd}/${inv.length}</b> investeerders geverifieerd.` : ''} Haal je geld op via de website? Check de AFM-vrijstelling (prospectusplicht).</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Naam</th><th>Inleg</th><th>Rendement/jr</th><th>Uitgekeerd</th><th>Wwft</th><th></th></tr></thead>
          <tbody>${inv.map(i => {
            const uitbetaald = (i.uitkeringen || []).filter(u => u.status === 'Uitbetaald').reduce((s, u) => s + (Number(u.amount) || 0), 0);
            return `<tr><td>${esc(i.naam)}<br><span class="sub">${fmtDate(i.datum)}</span></td><td><strong>${fmtMoney(i.bedrag)}</strong></td>
            <td>${fmtMoney(Math.round((Number(i.bedrag) || 0) * (rPct || 0) / 100))}</td>
            <td>${fmtMoney(uitbetaald)}${(i.uitkeringen || []).length ? `<br><span class="sub">${(i.uitkeringen || []).length} uitkering(en)</span>` : ''}</td>
            <td><button class="link-toggle ${i.wwft ? 'maint-done' : 'maint-open'}" data-action="wwft-toggle" data-id="${pr.id}" data-item="${i.id}" title="Klik om te wisselen">${i.wwft ? '✔ Geverifieerd' : '⚠ Te doen'}</button></td>
            <td class="row-actions"><button class="icon-btn" data-action="add-payout" data-id="${pr.id}" data-item="${i.id}" title="Uitkering registreren">€+</button>
            <button class="icon-btn" data-action="del-investor" data-id="${pr.id}" data-item="${i.id}" title="Verwijderen">🗑</button></td></tr>`;
          }).join('') || emptyRow(6, 'Nog geen investeerders geregistreerd.')}</tbody>
        </table></div>`;
        })()}
        <form class="inline-form" data-form="add-investor" data-id="${pr.id}">
          <input name="naam" placeholder="Naam investeerder…" required>
          <input name="email" type="email" placeholder="E-mail (voor login portaal)">
          <input name="bedrag" type="number" step="any" placeholder="€ inleg" required>
          <button class="btn primary slim" type="submit">+</button>
        </form>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head compact"><h2>Voortgangsfoto's</h2>
        <span class="sub">${(pr.fotos || []).length} foto's — getoond op de website (volgen) en in het investeerdersportaal</span>
      </div>
      <div class="foto-grid">
        ${(pr.fotos || []).map((src, i) => `
          <figure class="foto-thumb">
            <img src="${esc(src)}" loading="lazy" alt="Projectfoto ${i + 1}">
            ${i === 0 ? '<span class="badge gold foto-hoofd-badge">Hoofdfoto</span>' : ''}
            <div class="foto-acties">
              ${i > 0 ? `<button class="icon-btn" data-action="foto-hoofd" data-kind="project" data-id="${pr.id}" data-index="${i}" title="Maak hoofdfoto">★</button>` : ''}
              <button class="icon-btn" data-action="foto-del" data-kind="project" data-id="${pr.id}" data-index="${i}" title="Verwijderen">🗑</button>
            </div>
          </figure>`).join('') || '<p class="empty">Nog geen voortgangsfoto\'s — voeg ze hieronder toe.</p>'}
      </div>
      <form class="inline-form" data-form="add-foto" data-kind="project" data-id="${pr.id}">
        <input name="url" placeholder="Foto-URL of pad (bijv. fotos/project-1.jpg)…" required>
        <button class="btn primary slim" type="submit">+</button>
      </form>
      <div class="head-actions">
        <label class="btn secondary slim file-btn">Foto's toevoegen vanaf computer<input type="file" id="foto-upload" data-kind="project" data-id="${pr.id}" accept="image/*" multiple hidden></label>
      </div>
      <p class="hint">Voortgangsfoto's van de bouw/renovatie. Op de website 'projecten volgen' en in het investeerdersportaal worden deze getoond.</p>
    </section>`;
}

/* ---------- Kosten ---------- */
function renderCosts() {
  const open = state.costs.filter(k => k.status === 'Opdracht');
  const invoiced = state.costs.filter(k => k.status === 'Factuur ontvangen');
  const paidYear = state.costs.filter(k => k.status === 'Betaald' && (k.date || '').startsWith(String(new Date().getFullYear())));
  const sum = arr => arr.reduce((s, k) => s + (Number(k.amount) || 0), 0);
  $('#cost-kpis').innerHTML = `
    <article class="kpi small"><span>Opdrachten verstrekt</span><strong>${fmtMoney(sum(open))}</strong><small>${open.length} posten — nog te factureren</small></article>
    <article class="kpi small"><span>Facturen te betalen</span><strong class="${invoiced.length ? 'alert' : ''}">${fmtMoney(sum(invoiced))}</strong><small>${invoiced.length} facturen</small></article>
    <article class="kpi small"><span>Betaald dit jaar</span><strong>${fmtMoney(sum(paidYear))}</strong><small>${paidYear.length} posten</small></article>`;

  const f = filters.cost;
  const list = state.costs.filter(k => f === 'all' || k.status === f)
    .slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#costs-table').innerHTML = list.length ? list.map(k => `
    <tr>
      <td>${fmtDate(k.date)}</td>
      <td><strong>${esc(propertyLabel(k.propertyId))}</strong>${k.projectId ? `<br><span class="sub">${esc(projectById(k.projectId)?.name || '')}</span>` : ''}</td>
      <td>${esc(contactName(k.contactId))}</td>
      <td>${esc(k.desc)}</td>
      <td>${esc(k.category)}</td>
      <td><strong>${fmtMoney(k.amount)}</strong></td>
      <td><select class="row-status" data-action="cost-status" data-id="${k.id}">
        ${['Opdracht', 'Factuur ontvangen', 'Betaald'].map(s => `<option ${k.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></td>
      <td class="row-actions">
        <button class="icon-btn" data-action="edit-cost" data-id="${k.id}" title="Bewerken">✎</button>
        <button class="icon-btn" data-action="del-cost" data-id="${k.id}" title="Verwijderen">🗑</button>
      </td>
    </tr>`).join('') : emptyRow(8, 'Geen kostenposten in deze weergave.');
  $('#costs-foot').innerHTML = list.length ? `<tr><td colspan="5"><strong>Totaal (${list.length} posten)</strong></td><td><strong>${fmtMoney(sum(list))}</strong></td><td colspan="2"></td></tr>` : '';
}

/* ---------- Verkoop ---------- */
function renderSales() {
  const t = todayISO();
  const active = state.properties.filter(p => p.status === 'Te koop' || p.status === 'Onder bod');
  const sold = state.properties.filter(p => p.status === 'Verkocht')
    .slice().sort((a, b) => (b.sale?.date || '').localeCompare(a.sale?.date || ''));
  const soldYear = sold.filter(p => (p.sale?.date || '').startsWith(String(new Date().getFullYear())));
  const winstYear = soldYear.reduce((sum, p) => sum + (propertyFinance(p).winst || 0), 0);
  const openOffers = active.reduce((sum, p) => sum + (p.offers || []).filter(o => o.status === 'Ontvangen').length, 0);
  const rois = sold.map(p => propertyFinance(p).roi).filter(r => r !== null && isFinite(r));
  const avgRoi = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : null;

  $('#sales-kpis').innerHTML = `
    <article class="kpi"><span>Te koop / onder bod</span><strong>${active.length}</strong><small>${fmtMoney(active.reduce((s, p) => s + (Number(p.vraagprijs) || 0), 0))} vraagprijs totaal</small></article>
    <article class="kpi"><span>Biedingen te beantwoorden</span><strong class="${openOffers ? 'alert' : ''}">${openOffers}</strong><small>${openOffers ? 'reageer vandaag nog' : 'geen openstaande biedingen'}</small></article>
    <article class="kpi"><span>Verkocht ${new Date().getFullYear()}</span><strong>${soldYear.length}</strong><small>${fmtMoney(winstYear)} winst gerealiseerd</small></article>
    <article class="kpi"><span>Gemiddelde ROI verkocht</span><strong>${avgRoi === null ? '—' : fmtNum(avgRoi, 1) + '%'}</strong><small>over ${sold.length} verkochte panden</small></article>`;

  $('#sales-active-table').innerHTML = active.length ? active.map(p => {
    const fin = propertyFinance(p);
    return `<tr data-action="open-property" data-id="${p.id}">
      <td><strong>${esc(p.address)}</strong><br><span class="sub">${esc(p.ptype)}${p.label ? ' · label ' + esc(p.label) : ' · <b class="alert">geen label</b>'}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td>${fmtMoney(p.vraagprijs)}</td>
      <td>${p.teKoopSinds ? daysBetween(p.teKoopSinds, t) : '—'}</td>
      <td>${(p.viewings || []).length}</td>
      <td>${fin.hoogsteBod ? fmtMoney(fin.hoogsteBod) : '—'}</td>
      <td class="${winstClass(fin.winst)}">${fin.winst === null ? '—' : fmtMoney(fin.winst)} ${roiBadge(fin.roi)}</td>
      <td class="row-actions">
        <button class="btn secondary slim" data-action="offer-for" data-id="${p.id}">+ Bod</button>
        <button class="btn primary slim" data-action="sale-for" data-id="${p.id}">Afronden</button>
      </td>
    </tr>`;
  }).join('') : emptyRow(8, 'Geen panden te koop. Zet een pand te koop via het panddetail (status → Te koop).');

  $('#sales-sold-table').innerHTML = sold.length ? sold.map(p => {
    const fin = propertyFinance(p);
    return `<tr data-action="open-property" data-id="${p.id}">
      <td><strong>${esc(p.address)}</strong></td>
      <td>${fmtDate(p.purchase?.date)}</td>
      <td>${fmtDate(p.sale?.date)}</td>
      <td>${fmtMoney(fin.investering)}</td>
      <td>${fmtMoney(p.sale?.verkoopprijs)}</td>
      <td class="${winstClass(fin.winst)}"><strong>${fmtMoney(fin.winst)}</strong></td>
      <td>${roiBadge(fin.roi)}</td>
      <td>${fmtNum(fin.maanden, 1)} mnd</td>
    </tr>`;
  }).join('') : emptyRow(8, 'Nog geen verkochte panden.');
}

/* ---------- Planning ---------- */
// Geeft de planning-items die op een dag vallen, inclusief herhalingen (virtueel, niet opgeslagen).
function planningOnDay(day) {
  const out = [];
  state.planning.forEach(pl => {
    if (!pl.recurrence) { if (pl.date === day) out.push(pl); return; }
    if (day < pl.date) return;
    if (pl.recurrenceEnd && day > pl.recurrenceEnd) return;
    if (pl.recurrence === 'weekly' || pl.recurrence === 'biweekly') {
      const step = pl.recurrence === 'weekly' ? 7 : 14;
      const diff = daysBetween(pl.date, day);
      if (diff >= 0 && diff % step === 0) out.push(pl);
    } else if (pl.recurrence === 'monthly' || pl.recurrence === 'quarterly') {
      const a = new Date(pl.date + 'T12:00:00'), b = new Date(day + 'T12:00:00');
      if (b.getDate() === a.getDate()) {
        const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        const mstep = pl.recurrence === 'monthly' ? 1 : 3;
        if (months >= 0 && months % mstep === 0) out.push(pl);
      }
    }
  });
  return out;
}

function renderPlanning() {
  const start = weekStartISO(weekOffset);
  const t = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  const weekNr = (() => {
    const d = new Date(start + 'T12:00:00');
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  })();
  $('#week-title').textContent = `Week ${weekNr} · ${fmtDate(start)} t/m ${fmtDate(days[6])}`;
  const typeBadge = { Bezichtiging: 'blue', Notaris: 'green', Aannemer: '', Taxatie: 'gray', Oplevering: 'green', Afspraak: 'gray' };
  $('#week-grid').innerHTML = days.map(day => {
    const items = planningOnDay(day);
    return `<div class="day-col ${day === t ? 'today' : ''}">
      <header><strong>${fmtDayLabel(day)}</strong>
        <button class="icon-btn" data-action="add-plan" data-date="${day}" title="Toevoegen">+</button>
      </header>
      ${items.map(pl => `
        <article class="plan-card" data-action="edit-plan" data-id="${pl.id}">
          <span class="badge ${typeBadge[pl.type] ?? ''}">${esc(pl.type)}${pl.recurrence ? ' ↻' : ''}</span>
          <strong>${esc(pl.title)}</strong>
          <span class="sub">${esc(pl.who || '')}${pl.ref ? ' · ' + esc(refLabel(pl.ref)) : ''}</span>
        </article>`).join('') || '<p class="empty small">—</p>'}
    </div>`;
  }).join('');
}

/* ---------- Relaties ---------- */
function renderRelations() {
  const f = filters.relation;
  const list = state.contacts.filter(c => f === 'all' || c.type === f);
  $('#relations-table').innerHTML = list.length ? list.map(c => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${statusBadge(c.type)}</td>
      <td>${esc(c.contact || '')}</td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</td>
      <td>${esc(c.phone || '')}</td>
      <td class="sub">${(() => {
        const acts = (c.activities || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        if (acts.length) return `<strong>${acts.length}×</strong> contact · laatst ${fmtDate(acts[0].date)}: ${esc((acts[0].description || '').slice(0, 40))}${(acts[0].description || '').length > 40 ? '…' : ''}`;
        return esc(c.note || '—');
      })()}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="log-activity" data-id="${c.id}" title="Contactmoment vastleggen">💬</button>
        <button class="icon-btn" data-action="edit-contact" data-id="${c.id}" title="Bewerken">✎</button>
        <button class="icon-btn" data-action="del-contact" data-id="${c.id}" title="Verwijderen">🗑</button>
      </td>
    </tr>`).join('') : emptyRow(7, 'Nog geen relaties in deze categorie.');
}

/* ---------- Instellingen ---------- */
function renderSettings() {
  const form = $('#settings-form');
  Object.entries(state.settings).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  const bytes = (localStorage.getItem(STORAGE_KEY) || '').length;
  $('#storage-info').textContent = `Opslag in gebruik: ${(bytes / 1024).toFixed(1)} kB · ${state.properties.length} panden · ${state.deals.length} kansen · ${state.projects.length} projecten · ${state.costs.length} kostenposten.`;
  renderCloudPanel();
  renderTeamPanel();
  renderAuditPanel();
}

function renderAuditPanel() {
  const body = $('#audit-body'); if (!body) return;
  const list = (state.audit || []).slice(0, 60);
  body.innerHTML = `<p class="hint">De laatste wijzigingen in je administratie (wie, wat, wanneer). Handig voor verantwoording bij meerdere gebruikers.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Wanneer</th><th>Gebruiker</th><th>Actie</th><th>Onderdeel</th></tr></thead>
      <tbody>${list.map(a => `<tr><td>${fmtDateTime(a.ts)}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td></tr>`).join('') || emptyRow(4, 'Nog geen wijzigingen vastgelegd.')}</tbody>
    </table></div>${(state.audit || []).length > 60 ? `<p class="hint">Laatste 60 van ${state.audit.length} — exporteer voor de volledige historie.</p>` : ''}`;
}

function renderTeamPanel() {
  const panel = $('#team-panel'), body = $('#team-body');
  if (!panel || !body) return;
  const st = (window.HCloud && HCloud.status()) || { ready: false };
  if (!st.staff) { panel.hidden = true; return; }
  panel.hidden = false;
  if (!body.innerHTML) body.innerHTML = '<p class="hint">Laden…</p>';
  HCloud.listProfiles().then(list => {
    const myId = HCloud.myId();
    body.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>E-mail</th><th>Naam</th><th>Rol</th></tr></thead>
      <tbody>${list.map(p => `<tr>
        <td>${esc(p.email)}${p.id === myId ? ' <span class="badge gold">jij</span>' : ''}</td>
        <td>${esc(p.full_name || '—')}</td>
        <td>${p.id === myId
          ? esc(p.role || '—') + ' <span class="sub">(eigen rol — laat een ander account dit wijzigen)</span>'
          : `<select class="row-status" data-action="set-role" data-id="${p.id}">
              ${['eigenaar', 'team', 'investeerder', 'huurder'].map(r => `<option ${p.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>`}</td>
      </tr>`).join('') || emptyRow(3, 'Nog geen gebruikers — zodra iemand inlogt verschijnt die hier.')}</tbody>
    </table></div>`;
  }).catch(e => { body.innerHTML = `<p class="hint">Kon gebruikers niet laden: ${esc(e.message || e)}</p>`; });
}

function renderCloudPanel() {
  const el = $('#cloud-body'); if (!el) return;
  const st = (window.HCloud && HCloud.status()) || { ready: false };
  if (!st.ready) {
    el.innerHTML = `<p class="hint">De cloud-bibliotheek kon niet laden (mogelijk offline of geblokkeerd). De app werkt lokaal gewoon door — probeer het later opnieuw met internetverbinding.</p>`;
    return;
  }
  if (!st.email) {
    el.innerHTML = `
      <p class="hint">Log in met je e-mail — je ontvangt een inloglink (geen wachtwoord). Daarna kun je je gegevens naar de cloud synchroniseren zodat portalen werken en je op meerdere apparaten kunt werken.</p>
      <form class="inline-form" data-form="cloud-login">
        <input name="email" type="email" placeholder="jouw@email.nl" required>
        <button class="btn primary slim" type="submit">Stuur inloglink</button>
      </form>`;
    return;
  }
  const sync = st.lastSync ? `Laatste sync: ${fmtDateTime(st.lastSync)}.` : 'Nog niet gesynchroniseerd.';
  el.innerHTML = `
    <div class="totals-box">
      <div><dt>Ingelogd als</dt><dd>${esc(st.email)}</dd></div>
      <div><dt>Rol</dt><dd>${esc(st.role || '—')} ${st.staff ? '<span class="badge green">staff</span>' : '<span class="badge gray">extern</span>'}</dd></div>
    </div>
    ${st.staff ? `
      <p class="hint">${sync} Synchroniseren stuurt je panden, projecten, investeerders en updates naar de cloud (voor de portalen) én haalt nieuwe huurder-meldingen (incl. foto) terug naar je portaal.</p>
      <div class="head-actions">
        <button class="btn primary slim" data-action="cloud-sync">Synchroniseer nu</button>
        <button class="btn secondary slim" data-action="cloud-backup">Backup naar cloud</button>
        <button class="btn secondary slim" data-action="cloud-restore">Herstel van cloud</button>
        <button class="btn secondary slim" data-action="cloud-logout">Uitloggen</button>
      </div>
      <p class="hint">"Backup naar cloud" bewaart je volledige werkstaat (multi-device). "Herstel van cloud" haalt 'm terug op een ander apparaat — dat overschrijft je lokale gegevens, dus vraagt eerst bevestiging.</p>`
    : `<p class="hint">Dit account heeft geen eigenaar/team-rol; synchroniseren is daarom niet beschikbaar. Een investeerder logt in op de portaal-pagina voor investeerders (volgt in Fase 3).</p>
      <div class="head-actions"><button class="btn secondary slim" data-action="cloud-logout">Uitloggen</button></div>`}`;
}

/* ---------- Rapportage ---------- */
function reportData() {
  const t = todayISO();
  const jaar = String(new Date().getFullYear());
  const inBezit = state.properties.filter(p => p.status !== 'Verkocht');
  const verhuurd = inBezit.filter(p => Number(p.maandhuur) > 0);
  const soldThisYear = state.properties.filter(p => p.status === 'Verkocht' && (p.sale?.date || '').startsWith(jaar));

  const fins = inBezit.map(p => ({ p, f: propertyFinance(p) }));
  const totaalGeinvesteerd = fins.reduce((s, x) => s + x.f.investVerwacht, 0);
  const openFinanciering = inBezit.reduce((s, p) => s + (Number(p.financing?.bedrag) || 0), 0);
  const pijplijnWinst = fins.reduce((s, x) => s + (x.f.winst || 0), 0);
  const gerealiseerdWinst = soldThisYear.reduce((s, p) => s + (propertyFinance(p).winst || 0), 0);
  const huurPerJaar = verhuurd.reduce((s, p) => s + (Number(p.maandhuur) || 0) * 12, 0);
  const renteLastenMnd = fins.reduce((s, x) => s + x.f.renteMnd + x.f.lastenMnd, 0);
  const eigenVermogenIngelegd = totaalGeinvesteerd - openFinanciering;

  // Cashflow-forecast: 6 maanden vooruit
  const now = new Date(t + 'T00:00:00');
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const huurIn = Math.round(verhuurd.reduce((s, p) => s + (Number(p.maandhuur) || 0), 0));
    const vasteUit = Math.round(renteLastenMnd);
    const geplandUit = state.costs
      .filter(k => k.status !== 'Betaald' && (k.date || '').startsWith(key))
      .reduce((s, k) => s + (Number(k.amount) || 0), 0);
    const events = [];
    inBezit.forEach(p => { if ((p.financing?.einddatum || '').startsWith(key)) events.push(`Herfinanciering ${p.address}`); });
    state.projects.filter(pr => pr.status !== 'Afgerond').forEach(pr => { if ((pr.endDate || '').startsWith(key)) events.push(`Oplevering ${propertyLabel(pr.propertyId)}`); });
    months.push({ key, label: d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }), huurIn, vasteUit, geplandUit, netto: huurIn - vasteUit - geplandUit, events });
  }
  return { fins, totaalGeinvesteerd, openFinanciering, eigenVermogenIngelegd, pijplijnWinst, gerealiseerdWinst, huurPerJaar, renteLastenMnd, months, soldThisYear, jaar };
}

/* ---------- Visuele rapportage (pure SVG/HTML, geen dependencies) ---------- */
/* Cashflow-waterfall: banksaldo nu + maandelijkse netto-stappen → eindsaldo.
   steps: [{label, delta, events}]. */
function cashflowWaterfallSvg(start, steps) {
  let bal = start;
  const points = [{ label: 'Saldo nu', type: 'start', to: start }];
  (steps || []).forEach(m => { const from = bal; bal += m.delta; points.push({ label: m.label, type: 'step', delta: m.delta, from, to: bal, events: m.events || [] }); });
  const vals = points.flatMap(p => [p.to, p.from || 0]).concat([0]);
  const maxV = Math.max(...vals), minV = Math.min(...vals), range = (maxV - minV) || 1;
  const W = 760, H = 250, padL = 56, padR = 14, padT = 18, padB = 42;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const Y = v => padT + innerH - ((v - minV) / range) * innerH;
  const n = points.length, slot = innerW / n, barW = Math.max(10, Math.min(46, slot * 0.5));
  const X = i => padL + slot * (i + 0.5);
  const zeroY = Y(0);
  const bars = points.map((p, i) => {
    const cx = X(i); let top, fill, title;
    if (p.type === 'start') { top = Y(Math.max(0, p.to)); fill = '#0b1e30'; title = 'Banksaldo nu: ' + fmtMoney(p.to); }
    else { top = Y(Math.max(p.from, p.to)); fill = p.delta >= 0 ? '#1e6a42' : '#b03a3a'; title = p.label + ': ' + (p.delta >= 0 ? '+' : '') + fmtMoney(p.delta) + ' → ' + fmtMoney(p.to) + (p.events && p.events.length ? ' (' + p.events.join(', ') + ')' : ''); }
    const bottom = p.type === 'start' ? Y(Math.min(0, p.to)) : Y(Math.min(p.from, p.to));
    const h = Math.max(2, bottom - top);
    return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}"><title>${esc(title)}</title></rect>`;
  }).join('');
  let conn = '';
  for (let i = 0; i < points.length - 1; i++) { const y = Y(points[i].to); conn += `<line x1="${X(i).toFixed(1)}" y1="${y.toFixed(1)}" x2="${X(i + 1).toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(12,11,9,.22)" stroke-width="1" stroke-dasharray="3 3"/>`; }
  const zeroLine = (minV < 0 && maxV > 0) ? `<line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${W - padR}" y2="${zeroY.toFixed(1)}" stroke="var(--line)" stroke-width="1"/>` : '';
  const labels = points.map((p, i) => `<text x="${X(i).toFixed(1)}" y="${H - 24}" text-anchor="middle" style="font-size:10px;fill:#6f756f">${esc(p.label)}</text>`).join('');
  const endLabels = points.map((p, i) => `<text x="${X(i).toFixed(1)}" y="${H - 9}" text-anchor="middle" style="font-size:10px;fill:#0b1e30;font-weight:700">${esc(fmtMoneyK(p.to))}</text>`).join('');
  const warn = bal < 0 ? `<text x="${padL}" y="${padT + 8}" style="font-size:11px;fill:#b03a3a;font-weight:700">Let op: het saldo loopt negatief</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="waterfall-svg" role="img" aria-label="Cashflow-waterfall">${zeroLine}${conn}${bars}${labels}${endLabels}${warn}</svg>`;
}

/* Generieke donut uit segmenten [{label, value, color}]. */
function donutSvg(segments, centerTitle) {
  const segs = segments.filter(s => Number(s.value) > 0);
  const total = segs.reduce((s, x) => s + Number(x.value), 0);
  if (total <= 0) return '<p class="empty">Geen data.</p>';
  const size = 168, cx = size / 2, cy = size / 2, stroke = 26, r = size / 2 - 6 - stroke / 2, circ = 2 * Math.PI * r;
  let off = 0;
  const arcs = segs.map(s => {
    const len = Number(s.value) / total * circ;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(s.label)}: ${esc(fmtMoney(s.value))} (${Math.round(Number(s.value) / total * 100)}%)</title></circle>`;
    off += len; return el;
  }).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" class="donut-svg">${arcs}<text x="${cx}" y="${cy - 3}" text-anchor="middle" style="font-size:10.5px;fill:#6f756f">${esc(centerTitle)}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-size:15px;font-weight:700;fill:#0b1e30">${esc(fmtMoneyK(total))}</text></svg>
    <ul class="donut-legend">${segs.map(s => `<li><span class="dl-dot" style="background:${s.color}"></span><span>${esc(s.label)}</span><strong>${fmtMoneyK(s.value)}</strong><span class="sub">${Math.round(Number(s.value) / total * 100)}%</span></li>`).join('')}</ul>
  </div>`;
}

/* Aankoop-funnel: per fase aantal kansen + som winst + gem. ROI. */
function dealFunnelHtml() {
  const stages = DEAL_STAGES.map(stage => {
    const ds = state.deals.filter(d => d.status === stage);
    const winst = ds.reduce((s, d) => s + computeDeal(d.calc).winst, 0);
    const roi = ds.length ? ds.reduce((s, d) => s + computeDeal(d.calc).roi, 0) / ds.length : 0;
    return { stage, count: ds.length, winst, roi };
  });
  const maxCount = Math.max(1, ...stages.map(s => s.count));
  return `<div class="funnel">${stages.map(s => {
    const w = s.count ? Math.max(14, Math.round(s.count / maxCount * 100)) : 8;
    return `<div class="funnel-row ${s.count ? '' : 'is-empty'}" data-action="funnel-jump" data-stage="${esc(s.stage)}" title="Spring naar ${esc(s.stage)}">
      <span class="funnel-label">${esc(s.stage)}</span>
      <span class="funnel-bar-track"><span class="funnel-bar" style="width:${w}%"></span></span>
      <span class="funnel-meta">${s.count} kans${s.count === 1 ? '' : 'en'}${s.count ? ` · <strong class="${winstClass(s.winst)}">${fmtMoneyK(s.winst)}</strong> · Ø${fmtNum(s.roi, 0)}% ROI` : ''}</span>
    </div>`;
  }).join('')}</div>`;
}

function renderReports() {
  const r = reportData();
  const investeerdersInleg = state.projects.reduce((s, pr) => s + (pr.investeerders || []).reduce((a, i) => a + (Number(i.bedrag) || 0), 0), 0);
  const eigenGeldBedrijf = Math.max(0, r.eigenVermogenIngelegd - investeerdersInleg);
  const herkomstDonut = donutSvg([
    { label: 'Bankfinanciering', value: r.openFinanciering, color: '#0b1e30' },
    { label: 'Investeerders', value: investeerdersInleg, color: '#b49030' },
    { label: 'Eigen geld', value: eigenGeldBedrijf, color: '#1e6a42' }
  ], 'Herkomst');
  const inzetDonut = donutSvg([
    { label: 'Aankoopwaarde', value: r.fins.reduce((s, x) => s + x.f.aankoop, 0), color: '#0b1e30' },
    { label: 'Ontwikkeld', value: r.fins.reduce((s, x) => s + x.f.ontwikkeld, 0), color: '#b49030' },
    { label: 'Restbudget', value: r.fins.reduce((s, x) => s + x.f.restBudget, 0), color: '#cca94a' },
    { label: 'Houdkosten', value: r.fins.reduce((s, x) => s + x.f.houdkosten, 0), color: '#6f756f' }
  ], 'Inzet');
  const bars = r.fins.slice().sort((a, b) => (b.f.winst || 0) - (a.f.winst || 0));
  const maxAbs = Math.max(1, ...bars.map(x => Math.abs(x.f.winst || 0)));
  $('#report-body').innerHTML = `
    <div class="kpi-grid">
      <article class="kpi"><span>Geïnvesteerd vermogen</span><strong>${fmtMoney(r.totaalGeinvesteerd)}</strong><small>waarvan ${fmtMoney(r.eigenVermogenIngelegd)} eigen geld</small></article>
      <article class="kpi"><span>Openstaande financiering</span><strong>${fmtMoney(r.openFinanciering)}</strong><small>${fmtMoney(Math.round(r.renteLastenMnd))}/mnd rente + lasten</small></article>
      <article class="kpi"><span>Verwachte winst (pijplijn)</span><strong class="${winstClass(r.pijplijnWinst)}">${fmtMoney(r.pijplijnWinst)}</strong><small>panden in bezit & te koop</small></article>
      <article class="kpi"><span>Gerealiseerde winst ${r.jaar}</span><strong class="${winstClass(r.gerealiseerdWinst)}">${fmtMoney(r.gerealiseerdWinst)}</strong><small>${r.soldThisYear.length} pand${r.soldThisYear.length === 1 ? '' : 'en'} verkocht</small></article>
      <article class="kpi"><span>Huurinkomsten / jaar</span><strong>${fmtMoney(r.huurPerJaar)}</strong><small>uit verhuurde panden</small></article>
    </div>
    <div class="split">
      <section class="panel">
        <div class="panel-head compact"><h2>Verwacht resultaat per pand</h2><span class="sub">winst verwacht / gerealiseerd</span></div>
        <div class="report-bars">
          ${bars.map(({ p, f }) => {
            const w = f.winst || 0;
            const pct = Math.round(Math.abs(w) / maxAbs * 100);
            return `<div class="report-bar" data-action="open-property" data-id="${p.id}" style="cursor:pointer">
              <span class="rb-label" title="${esc(p.address)}">${esc(p.address)}</span>
              <span class="rb-track"><span class="rb-fill ${w < 0 ? 'neg' : ''}" style="width:${pct}%"></span></span>
              <span class="rb-val ${winstClass(w)}">${fmtMoney(w)} · ${f.roi === null ? '—' : fmtNum(f.roi, 0) + '%'}</span>
            </div>`;
          }).join('') || '<p class="empty">Nog geen panden in bezit.</p>'}
        </div>
        <p class="report-note">ROI = winst gedeeld door totale investering (incl. resterend ontwikkelbudget). Klik een balk om het pand te openen.</p>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Kapitaal: herkomst &amp; inzet</h2></div>
        <div class="donut-pair">${herkomstDonut}${inzetDonut}</div>
        <div class="totals-box">
          <div><dt>Aankoopwaarde portfolio</dt><dd>${fmtMoney(r.fins.reduce((s, x) => s + x.f.aankoop, 0))}</dd></div>
          <div><dt>Ontwikkelkosten geboekt</dt><dd>${fmtMoney(r.fins.reduce((s, x) => s + x.f.ontwikkeld, 0))}</dd></div>
          <div><dt>Resterend ontwikkelbudget</dt><dd>${fmtMoney(r.fins.reduce((s, x) => s + x.f.restBudget, 0))}</dd></div>
          <div><dt>Houdkosten tot nu</dt><dd>${fmtMoney(r.fins.reduce((s, x) => s + x.f.houdkosten, 0))}</dd></div>
          <div><dt>Openstaande financiering</dt><dd>${fmtMoney(r.openFinanciering)}</dd></div>
          <div><dt>Eigen geld ingelegd</dt><dd><strong>${fmtMoney(r.eigenVermogenIngelegd)}</strong></dd></div>
        </div>
        <p class="report-note">Links: waar je kapitaal vandaan komt. Rechts: waar het in zit. Toon dit aan je financier samen met de dealcalculaties.</p>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head compact"><h2>Cashflow-prognose — 6 maanden</h2>
        <span class="sub">banksaldo nu → verwacht eindsaldo</span>
      </div>
      <div class="waterfall-wrap">${cashflowWaterfallSvg(state.accounts.reduce((s, a) => s + (Number(a.saldo) || 0), 0), r.months.map(m => ({ label: m.label, delta: m.netto, events: m.events })))}</div>
      <div class="table-wrap"><table class="cashflow-table">
        <thead><tr><th>Maand</th><th>Huur in</th><th>Rente + lasten</th><th>Geplande kosten</th><th>Netto</th><th>Aandachtspunten</th></tr></thead>
        <tbody>
          ${r.months.map(m => `<tr>
            <td><strong>${m.label}</strong></td>
            <td>${m.huurIn ? fmtMoney(m.huurIn) : '—'}</td>
            <td class="neg">−${fmtMoney(m.vasteUit)}</td>
            <td class="${m.geplandUit ? 'neg' : ''}">${m.geplandUit ? '−' + fmtMoney(m.geplandUit) : '—'}</td>
            <td><strong class="${m.netto < 0 ? 'neg' : ''}">${m.netto < 0 ? '−' + fmtMoney(Math.abs(m.netto)) : fmtMoney(m.netto)}</strong></td>
            <td class="sub">${m.events.map(esc).join('<br>') || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="report-note">Huur wordt constant verondersteld; verkoopopbrengsten zijn niet meegerekend (die zijn eenmalig en moment-afhankelijk). Geplande kosten = kostenposten met status Opdracht of Factuur ontvangen.</p>
    </section>
    ${renderAdMetricsPanel()}`;
}

/* Advertentie-effectiviteit per kanaal (incl. verkochte panden) */
function renderAdMetricsPanel() {
  const perKanaal = {};
  state.properties.forEach(p => {
    const verkocht = p.status === 'Verkocht';
    (p.advertenties || []).forEach(a => {
      const k = a.kanaal || 'Onbekend';
      const e = perKanaal[k] || (perKanaal[k] = { kanaal: k, aantal: 0, kosten: 0, opVerkocht: 0 });
      e.aantal++; e.kosten += Number(a.kosten) || 0;
      if (verkocht) e.opVerkocht++;
    });
  });
  const rows = Object.values(perKanaal).sort((a, b) => b.kosten - a.kosten);
  if (!rows.length) return '';
  const totKosten = rows.reduce((s, e) => s + e.kosten, 0);
  const verkochtMetAds = state.properties.filter(p => p.status === 'Verkocht' && (p.advertenties || []).length).length;
  return `<section class="panel">
    <div class="panel-head compact"><h2>Advertentie-effectiviteit</h2>
      <span class="sub">totaal ${fmtMoney(totKosten)} · ${verkochtMetAds} verkocht ná adverteren</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Kanaal</th><th>Advertenties</th><th>Kosten</th><th>Op verkochte panden</th><th>Gem. kosten/advertentie</th></tr></thead>
      <tbody>${rows.map(e => `<tr>
        <td><strong>${esc(e.kanaal)}</strong></td><td>${e.aantal}</td><td>${fmtMoney(e.kosten)}</td>
        <td>${e.opVerkocht}</td><td>${fmtMoney(Math.round(e.kosten / e.aantal))}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p class="report-note">Inzicht in welk kanaal het meeste oplevert. Advertentiekosten van verkochte panden blijven meegerekend.</p>
  </section>`;
}

/* ---------- Investeerders-overzicht ---------- */
function investorReportData() {
  const map = {}; // key = email||naam → geaggregeerde investeerder
  state.projects.forEach(pr => {
    const rPct = Number(pr.invest?.rendementPct) || 0;
    const afgerond = pr.status === 'Afgerond';
    (pr.investeerders || []).forEach(i => {
      const key = (i.email || i.naam || '').toLowerCase().trim() || i.id;
      const e = map[key] || (map[key] = { naam: i.naam, email: i.email || '', inleg: 0, gewogenRendement: 0, verwachtJaar: 0, uitbetaaldPerJaar: {}, wwft: true, projecten: [], cashflows: [], nav: 0 });
      const bedrag = Number(i.bedrag) || 0;
      e.inleg += bedrag;
      e.gewogenRendement += bedrag * rPct;
      e.verwachtJaar += bedrag * rPct / 100;
      if (!i.wwft) e.wwft = false;
      e.projecten.push({ project: pr.name, bedrag, rPct, datum: i.datum, uitkeringen: i.uitkeringen || [] });
      // Cashflows voor IRR/MOIC: inleg negatief op instapdatum, uitbetaalde uitkeringen positief.
      if (bedrag) e.cashflows.push({ date: i.datum || pr.startDate || todayISO(), amount: -bedrag });
      // Lopende projecten houden de inleg als huidige waarde (NAV); afgeronde zijn afgewikkeld.
      if (!afgerond) e.nav += bedrag;
      (i.uitkeringen || []).filter(u => u.status === 'Uitbetaald').forEach(u => {
        const jr = (u.date || '').slice(0, 4) || '—';
        const bedr = Number(u.amount) || 0;
        e.uitbetaaldPerJaar[jr] = (e.uitbetaaldPerJaar[jr] || 0) + bedr;
        if (bedr) e.cashflows.push({ date: u.date || todayISO(), amount: bedr });
      });
    });
  });
  const list = Object.values(map).map(e => {
    e.rendementPct = e.inleg ? e.gewogenRendement / e.inleg : 0;
    e.uitbetaaldTotaal = Object.values(e.uitbetaaldPerJaar).reduce((s, v) => s + v, 0);
    // Netto IRR: cashflows + huidige waarde (NAV) als slotbedrag vandaag.
    const flows = e.cashflows.slice();
    if (e.nav > 0) flows.push({ date: todayISO(), amount: e.nav });
    e.irr = xirr(flows);
    // MOIC = (uitbetaald + huidige waarde) / inleg.
    e.moic = e.inleg ? (e.uitbetaaldTotaal + e.nav) / e.inleg : null;
    return e;
  }).sort((a, b) => b.inleg - a.inleg);
  return list;
}

function renderInvestorReports() {
  const list = investorReportData();
  const jaar = new Date().getFullYear();
  const jaren = [jaar - 2, jaar - 1, jaar].map(String);
  const totInleg = list.reduce((s, e) => s + e.inleg, 0);
  const totVerwacht = list.reduce((s, e) => s + e.verwachtJaar, 0);
  const totUitbetaaldYtd = list.reduce((s, e) => s + (e.uitbetaaldPerJaar[String(jaar)] || 0), 0);
  // Inleg-gewogen gemiddelde netto-IRR over alle investeerders met een berekenbare IRR.
  const irrPool = list.filter(e => e.irr !== null && isFinite(e.irr));
  const irrWeight = irrPool.reduce((s, e) => s + e.inleg, 0);
  const gemIrr = irrWeight ? irrPool.reduce((s, e) => s + e.irr * e.inleg, 0) / irrWeight : null;
  const body = $('#investors-body'); if (!body) return;
  const colCount = 6 + jaren.length;
  body.innerHTML = `
    <div class="kpi-grid">
      <article class="kpi"><span>Totaal opgehaald</span><strong>${fmtMoney(totInleg)}</strong><small>${list.length} investeerder${list.length === 1 ? '' : 's'}</small></article>
      <article class="kpi"><span>Gem. netto IRR</span><strong>${fmtPct(gemIrr, 1)}</strong><small>inleg-gewogen, incl. huidige waarde</small></article>
      <article class="kpi"><span>Verwacht rendement / jaar</span><strong>${fmtMoney(Math.round(totVerwacht))}</strong></article>
      <article class="kpi"><span>Uitbetaald ${jaar}</span><strong>${fmtMoney(totUitbetaaldYtd)}</strong></article>
      <article class="kpi"><span>Wwft-geverifieerd</span><strong>${list.filter(e => e.wwft).length}/${list.length}</strong></article>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h2>Investeerders-roster</h2><p>Alle investeerders over alle projecten, met inleg, netto-IRR, multiple en uitkeringen per jaar. Klik een rij open voor de cashflow-tijdlijn.</p></div>
        <button class="btn primary slim" data-action="export-investors">Exporteer ledger</button>
      </div>
      <div class="table-wrap"><table class="investor-table">
        <thead><tr><th>Investeerder</th><th>Inleg</th><th>Netto IRR</th><th>Multiple</th><th>Verwacht/jr</th>${jaren.map(j => `<th>Uitbetaald ${j}</th>`).join('')}<th>Wwft</th></tr></thead>
        <tbody>${list.map((e, idx) => `<tr class="investor-row" data-action="toggle-investor" data-idx="${idx}">
          <td><strong>${esc(e.naam)}</strong>${e.email ? `<br><span class="sub">${esc(e.email)}</span>` : ''}<br><span class="sub">${e.projecten.length} project${e.projecten.length === 1 ? '' : 'en'} · ${fmtNum(e.rendementPct, 1)}% afgesproken</span></td>
          <td><strong>${fmtMoney(e.inleg)}</strong></td>
          <td>${irrBadge(e.irr)}</td>
          <td>${e.moic === null || !isFinite(e.moic) ? '—' : fmtNum(e.moic, 2) + '×'}</td>
          <td>${fmtMoney(Math.round(e.verwachtJaar))}</td>
          ${jaren.map(j => `<td>${e.uitbetaaldPerJaar[j] ? fmtMoney(e.uitbetaaldPerJaar[j]) : '—'}</td>`).join('')}
          <td>${e.wwft ? '<span class="badge green">✔</span>' : '<span class="badge red">⚠</span>'}</td>
        </tr>
        <tr class="investor-detail" id="inv-detail-${idx}" hidden><td colspan="${colCount}">${investorCashflowDetail(e)}</td></tr>`).join('') || emptyRow(colCount, 'Nog geen investeerders. Voeg ze toe bij een ontwikkelproject.')}</tbody>
        <tfoot><tr><td><strong>Totaal</strong></td><td><strong>${fmtMoney(totInleg)}</strong></td><td><strong>${fmtPct(gemIrr, 1)}</strong></td><td></td><td><strong>${fmtMoney(Math.round(totVerwacht))}</strong></td>${jaren.map(j => `<td><strong>${fmtMoney(list.reduce((s, e) => s + (e.uitbetaaldPerJaar[j] || 0), 0))}</strong></td>`).join('')}<td></td></tr></tfoot>
      </table></div>
      <p class="report-note">Investeerders worden samengevoegd op e-mailadres (of naam). <strong>Netto IRR</strong> is het werkelijke, op datum gewogen rendement (cashflows + huidige waarde van lopende inleg); <strong>multiple</strong> = (uitbetaald + huidige waarde) ÷ inleg. Lopende projecten waarderen de inleg op 100%; afgeronde projecten gelden als afgewikkeld.</p>
    </div>`;
}

/* Uitklap-detail per investeerder: cashflow-tijdlijn (SVG) + tabel met alle stromen. */
function investorCashflowDetail(e) {
  const flows = (e.cashflows || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (e.nav > 0) flows.push({ date: todayISO(), amount: e.nav, nav: true });
  const svg = cashflowTimelineSvg(flows);
  const rows = flows.map(f => `<tr>
    <td>${fmtDate(f.date)}</td>
    <td>${f.nav ? 'Huidige waarde (lopend)' : f.amount < 0 ? 'Inleg' : 'Uitkering'}</td>
    <td class="${f.amount < 0 ? 'alert' : ''}" style="text-align:right">${fmtMoney(f.amount)}</td>
  </tr>`).join('');
  return `<div class="investor-detail-inner">
    <div class="cashflow-chart">${svg}</div>
    <table class="cashflow-table"><thead><tr><th>Datum</th><th>Soort</th><th style="text-align:right">Bedrag</th></tr></thead><tbody>${rows || emptyRow(3, 'Geen cashflows.')}</tbody></table>
  </div>`;
}

/* Pure inline-SVG cashflow-tijdlijn: inleg omlaag (rood), uitkeringen omhoog (groen),
   cumulatieve lijn (blauw). Geen dependencies. */
function cashflowTimelineSvg(flows) {
  const data = (flows || []).filter(f => f && isFinite(Number(f.amount)));
  if (data.length < 2) return '<p class="empty">Onvoldoende data voor een tijdlijn.</p>';
  const W = 760, H = 240, padL = 56, padR = 16, padT = 20, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB, zeroY = padT + innerH / 2;
  const maxAbs = Math.max(...data.map(f => Math.abs(Number(f.amount))), 1);
  let cum = 0; const cums = data.map(f => (cum += Number(f.amount)));
  const cumMax = Math.max(...cums.map(Math.abs), maxAbs, 1);
  const n = data.length;
  const slot = innerW / n, barW = Math.max(6, Math.min(40, slot * 0.45));
  const x = i => padL + slot * (i + 0.5);
  const barH = v => Math.abs(v) / maxAbs * (innerH / 2 - 4);
  const cumY = v => zeroY - (v / cumMax) * (innerH / 2 - 4);
  const bars = data.map((f, i) => {
    const v = Number(f.amount), h = barH(v), cx = x(i);
    const y = v < 0 ? zeroY : zeroY - h;
    const fill = f.nav ? '#3a6ea5' : v < 0 ? 'var(--red,#b03a3a)' : 'var(--green,#1e6a42)';
    return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="2" fill="${fill}"><title>${esc(fmtDate(f.date))}: ${esc(fmtMoney(v))}${f.nav ? ' (huidige waarde)' : ''}</title></rect>`;
  }).join('');
  const linePts = cums.map((c, i) => `${x(i).toFixed(1)},${cumY(c).toFixed(1)}`).join(' ');
  const dots = cums.map((c, i) => `<circle cx="${x(i).toFixed(1)}" cy="${cumY(c).toFixed(1)}" r="3" fill="#3a6ea5"><title>Cumulatief ${esc(fmtDate(data[i].date))}: ${esc(fmtMoney(c))}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="cf-svg" role="img" aria-label="Cashflow-tijdlijn">
    <line x1="${padL}" y1="${zeroY}" x2="${W - padR}" y2="${zeroY}" stroke="var(--line,#ccc)" stroke-width="1"/>
    <text x="6" y="${padT + 8}" class="cf-axis">+</text>
    <text x="6" y="${H - padB}" class="cf-axis">−</text>
    ${bars}
    <polyline points="${linePts}" fill="none" stroke="#3a6ea5" stroke-width="2"/>
    ${dots}
  </svg>
  <p class="cf-legend"><span class="cf-dot" style="background:var(--red,#b03a3a)"></span>Inleg <span class="cf-dot" style="background:var(--green,#1e6a42)"></span>Uitkering <span class="cf-dot" style="background:#3a6ea5"></span>Cumulatief / huidige waarde</p>`;
}

/* ---------- Adverteren ---------- */
function adKenmerken(p) {
  const k = [];
  if (p.ptype) k.push(p.ptype);
  if (Number(p.m2)) k.push(p.m2 + ' m²');
  if (Number(p.kamers)) k.push(p.kamers + ' kamers');
  if (p.label) k.push('energielabel ' + p.label);
  return k;
}

function adTextVariants(p) {
  const verhuur = !Number(p.vraagprijs) && Number(p.maandhuur);
  const prijs = verhuur ? fmtMoney(p.maandhuur) + ' p/m' : (Number(p.vraagprijs) ? fmtMoney(p.vraagprijs) + ' k.k.' : 'prijs op aanvraag');
  const kenmerken = adKenmerken(p);
  const oms = p.webOmschrijving || '';
  const adres = p.address + ', ' + p.city;
  const doel = verhuur ? 'TE HUUR' : 'TE KOOP';
  const formeel = `${doel}: ${p.ptype} aan de ${adres}\n\n${oms}\n\nKenmerken: ${kenmerken.join(' · ')}\nPrijs: ${prijs}\n\nInteresse of een bezichtiging plannen? Neem contact op met HomeINN — ${state.settings.email || ''} ${state.settings.phone || ''}`.trim();
  const marktplaats = `${p.ptype} ${doel.toLowerCase()} — ${adres}\n\n${oms}\n\n• ${kenmerken.join('\n• ')}\n• ${prijs}\n\nReageer via HomeINN voor een bezichtiging.`;
  const social = `✨ ${doel} ✨ ${p.ptype} in ${p.city}\n${kenmerken.join(' · ')} · ${prijs}\n${oms ? oms.slice(0, 120) + (oms.length > 120 ? '…' : '') : ''}\n\n📩 Stuur een DM voor een bezichtiging! #${p.city.replace(/\s+/g, '')} #vastgoed #${verhuur ? 'tehuur' : 'tekoop'} #HomeINN`;
  return [
    { kanaal: 'Funda / formeel', tekst: formeel },
    { kanaal: 'Marktplaats / Jaap', tekst: marktplaats },
    { kanaal: 'Social (Instagram/Facebook)', tekst: social }
  ];
}

function openAdTextModal(id) {
  const p = propertyById(id);
  if (!p) return;
  $('#adtext-title').textContent = `Advertentietekst — ${p.address}`;
  const variants = adTextVariants(p);
  $('#adtext-body').innerHTML = variants.map((v, i) => `
    <div class="adtext-block">
      <div class="adtext-head"><strong>${esc(v.kanaal)}</strong><button class="btn secondary slim" type="button" data-action="copy-ad" data-idx="${i}">Kopiëren</button></div>
      <textarea class="adtext-area" id="adtext-${i}" readonly rows="${Math.min(14, v.tekst.split('\n').length + 1)}">${esc(v.tekst)}</textarea>
    </div>`).join('');
  $('#adtext-modal').showModal();
}

function openAdModal(propertyId, id = null) {
  const p = propertyById(propertyId);
  if (!p) return;
  const form = $('#ad-form');
  form.reset();
  form.elements.propertyId.value = propertyId;
  form.elements.id.value = id || '';
  $('#ad-modal-title').textContent = id ? 'Advertentiekanaal bewerken' : `Advertentiekanaal — ${p.address}`;
  const a = id ? (p.advertenties || []).find(x => x.id === id) : null;
  if (a) {
    ['kanaal', 'doel', 'status', 'url'].forEach(k => form.elements[k].value = a[k] ?? '');
    form.elements.datum.value = a.datum || '';
    form.elements.kosten.value = a.kosten ?? 0;
  } else {
    form.elements.datum.value = todayISO();
    form.elements.doel.value = Number(p.maandhuur) && !Number(p.vraagprijs) ? 'Verhuur' : 'Verkoop';
  }
  $('#ad-modal').showModal();
}

function renderAds() {
  const panden = state.properties.filter(p => p.status !== 'Verkocht');
  const totaalKanalen = panden.reduce((s, p) => s + (p.advertenties || []).filter(a => a.status === 'Geplaatst').length, 0);
  const kosten = panden.reduce((s, p) => s + (p.advertenties || []).reduce((x, a) => x + (Number(a.kosten) || 0), 0), 0);
  const inEtalage = panden.filter(p => (p.advertenties || []).length).length;
  $('#ads-body').innerHTML = `
    <div class="kpi-grid three">
      <article class="kpi"><span>Panden in de etalage</span><strong>${inEtalage}/${panden.length}</strong></article>
      <article class="kpi"><span>Actieve advertenties</span><strong>${totaalKanalen}</strong></article>
      <article class="kpi"><span>Advertentiekosten</span><strong>${fmtMoney(kosten)}</strong></article>
    </div>
    ${panden.map(p => {
      const ads = p.advertenties || [];
      const foto = (p.fotos || [])[0];
      return `<section class="panel ad-card">
        <div class="ad-card-head">
          ${foto ? `<img class="ad-thumb" src="${esc(foto)}" alt="" onerror="this.style.display='none'">` : ''}
          <div class="ad-card-info">
            <h2>${esc(p.address)}, ${esc(p.city)} ${statusBadge(p.status)}</h2>
            <p class="sub">${esc(p.ptype)}${Number(p.m2) ? ' · ' + p.m2 + ' m²' : ''}${Number(p.kamers) ? ' · ' + p.kamers + ' kamers' : ''} · ${Number(p.vraagprijs) ? fmtMoney(p.vraagprijs) + ' k.k.' : (Number(p.maandhuur) ? fmtMoney(p.maandhuur) + ' p/m' : 'prijs op aanvraag')}</p>
            ${!p.webOmschrijving ? '<p class="sub alert">Nog geen website-omschrijving — vul die in via Panden → Bewerken voor sterkere advertenties.</p>' : ''}
          </div>
          <div class="head-actions">
            <button class="btn primary slim" data-action="open-adtext" data-id="${p.id}">Advertentietekst</button>
            <button class="btn secondary slim" data-action="ad-add" data-id="${p.id}">+ Kanaal</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Kanaal</th><th>Doel</th><th>Status</th><th>Geplaatst</th><th>Kosten</th><th>Link</th><th></th></tr></thead>
          <tbody>${ads.map(a => `<tr>
            <td><strong>${esc(a.kanaal)}</strong></td><td>${esc(a.doel || '')}</td>
            <td>${statusBadge(a.status)}</td><td>${fmtDate(a.datum)}</td><td>${fmtMoney(a.kosten)}</td>
            <td>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener" class="text-btn">Open ↗</a>` : '—'}</td>
            <td class="row-actions"><button class="icon-btn" data-action="ad-edit" data-id="${p.id}" data-item="${a.id}" title="Bewerken">✎</button>
            <button class="icon-btn" data-action="ad-del" data-id="${p.id}" data-item="${a.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(7, 'Nog niet geadverteerd — klik op "+ Kanaal" of genereer eerst de advertentietekst.')}</tbody>
        </table></div>
      </section>`;
    }).join('') || '<div class="panel"><p class="empty">Nog geen panden om te adverteren. Voeg eerst een pand toe.</p></div>'}`;
}

/* ---------- Geld-in: facturatie & huurincasso ---------- */
function openInvoiceModal(id = null) {
  if (!state.properties.length) { showToast('Voeg eerst een pand toe.'); return; }
  const form = $('#invoice-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#invoice-modal-title').textContent = id ? 'Factuur bewerken' : 'Factuur opstellen';
  const f = id ? state.invoices.find(x => x.id === id) : null;
  fillSelect(form.elements.propertyId, state.properties, { empty: '— Algemeen —', selected: f?.propertyId || '' });
  if (f) {
    ['soort', 'debiteur', 'desc', 'amount', 'date', 'due', 'status'].forEach(k => form.elements[k].value = f[k] ?? '');
  } else {
    form.elements.date.value = todayISO();
    form.elements.due.value = addDaysISO(todayISO(), 14);
  }
  $('#invoice-modal').showModal();
}

function renderMoney() {
  const t = todayISO();
  const jaar = String(new Date().getFullYear());
  const inv = state.invoices.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const openstaand = inv.filter(f => f.status !== 'Betaald' && f.status !== 'Concept');
  const achterstand = openstaand.filter(f => f.due && f.due < t);
  const ontvangenJaar = inv.filter(f => f.status === 'Betaald' && (f.date || '').startsWith(jaar)).reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const huurPerMaand = state.properties.filter(p => Number(p.maandhuur) > 0 && p.status !== 'Verkocht').reduce((s, p) => s + (Number(p.maandhuur) || 0), 0);
  $('#money-body').innerHTML = `
    <div class="kpi-grid">
      <article class="kpi"><span>Verwachte huur / maand</span><strong>${fmtMoney(huurPerMaand)}</strong><small>uit verhuurde panden</small></article>
      <article class="kpi"><span>Ontvangen ${jaar}</span><strong>${fmtMoney(ontvangenJaar)}</strong></article>
      <article class="kpi"><span>Openstaand</span><strong>${fmtMoney(openstaand.reduce((s, f) => s + (Number(f.amount) || 0), 0))}</strong><small>${openstaand.length} factu${openstaand.length === 1 ? 'ur' : 'ren'}</small></article>
      <article class="kpi"><span>Huurachterstand</span><strong class="${achterstand.length ? 'alert' : ''}">${fmtMoney(achterstand.reduce((s, f) => s + (Number(f.amount) || 0), 0))}</strong><small>${achterstand.length} over vervaldatum</small></article>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h2>Inkomende facturen &amp; huur</h2><p>Huurnota's, servicekosten, verkoopopbrengsten en rente-uitkeringen aan investeerders.</p></div>
        <div class="head-actions">
          <button class="btn secondary slim" id="gen-rent" data-action="gen-rent">Huurnota's deze maand</button>
          <button class="btn primary slim" data-action="new-invoice">+ Factuur</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datum</th><th>Soort</th><th>Pand</th><th>Aan</th><th>Omschrijving</th><th>Bedrag</th><th>Vervalt</th><th>Status</th><th></th></tr></thead>
        <tbody>${inv.map(f => `<tr>
          <td>${fmtDate(f.date)}</td><td>${esc(f.soort)}</td><td>${esc(propertyLabel(f.propertyId))}</td><td>${esc(f.debiteur || '—')}</td>
          <td>${esc(f.desc)}</td><td><strong>${fmtMoney(f.amount)}</strong></td>
          <td class="${f.status !== 'Betaald' && f.due && f.due < t ? 'alert' : ''}">${fmtDate(f.due)}</td>
          <td><select class="row-status" data-action="invoice-status" data-id="${f.id}">
            ${['Concept', 'Verzonden', 'Herinnering verzonden', 'Aanmaning 1', 'Aanmaning 2', 'Betaald'].map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></td>
          <td class="row-actions">${(f.status !== 'Betaald' && f.status !== 'Concept' && f.due && f.due < t) ? `<button class="icon-btn" data-action="invoice-reminder" data-id="${f.id}" title="Herinnering versturen">📧</button>` : ''}<button class="icon-btn" data-action="invoice-edit" data-id="${f.id}" title="Bewerken">✎</button>
          <button class="icon-btn" data-action="invoice-del" data-id="${f.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(9, 'Nog geen facturen. Klik op "+ Factuur" of genereer de huurnota\'s.')}</tbody>
      </table></div>
      <p class="hint">Tip: "Huurnota's deze maand" maakt in één klik een factuur voor elk verhuurd pand (zonder dubbele nota voor dezelfde maand).</p>
    </div>`;
}

function renderMaintenance() {
  const t = todayISO();
  const items = [];
  state.properties.forEach(p => (p.onderhoud || []).forEach(o => items.push({
    bron: 'Eigen notitie', pandId: p.id, pand: p.address, date: o.date, descr: o.desc, status: o.status,
    statusSelect: `<select class="row-status" data-action="maint-status" data-id="${p.id}" data-item="${o.id}">${['Open', 'In behandeling', 'Afgehandeld'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`,
    foto: ''
  })));
  (state.cloudMaintenance || []).forEach(m => items.push({
    bron: 'Huurdersportaal', pandId: m.localPropertyId, pand: m.address || propertyLabel(m.localPropertyId), date: (m.created_at || '').slice(0, 10), descr: m.descr, status: m.status,
    statusSelect: `<select class="row-status" data-action="cloud-maint-status" data-id="${m.id}">${['Open', 'In behandeling', 'Afgehandeld'].map(s => `<option ${m.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select> <button class="icon-btn" data-action="maint-messages" data-id="${m.id}" title="Berichten met huurder">💬</button>`,
    foto: m.photoUrl ? ` · <a href="${esc(m.photoUrl)}" target="_blank" rel="noopener" class="text-btn">📷</a>` : ''
  }));
  items.sort((a, b) => {
    const rank = s => s === 'Open' ? 0 : s === 'In behandeling' ? 1 : 2;
    return rank(a.status) - rank(b.status) || (b.date || '').localeCompare(a.date || '');
  });
  const open = items.filter(i => i.status === 'Open').length;
  const bezig = items.filter(i => i.status === 'In behandeling').length;
  const klaar = items.filter(i => i.status === 'Afgehandeld').length;
  const body = $('#maintenance-body'); if (!body) return;
  body.innerHTML = `
    <div class="kpi-grid three">
      <article class="kpi"><span>Open</span><strong class="${open ? 'alert' : ''}">${open}</strong></article>
      <article class="kpi"><span>In behandeling</span><strong>${bezig}</strong></article>
      <article class="kpi"><span>Afgehandeld</span><strong>${klaar}</strong></article>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h2>Onderhoud &amp; meldingen — hele portefeuille</h2><p>Eigen notities én meldingen die huurders via het portaal insturen. Klik "Synchroniseer cloud" voor de nieuwste portaal-meldingen.</p></div>
        <button class="btn secondary slim" data-action="cloud-sync">Synchroniseer cloud</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datum</th><th>Pand</th><th>Melding</th><th>Bron</th><th>Status</th></tr></thead>
        <tbody>${items.map(i => `<tr>
          <td>${fmtDate(i.date)}${i.date && daysBetween(i.date, t) >= 0 && i.status === 'Open' ? `<br><span class="sub">${daysBetween(i.date, t)} dgn open</span>` : ''}</td>
          <td>${i.pandId ? `<a class="text-btn" data-action="open-property" data-id="${i.pandId}">${esc(i.pand)}</a>` : esc(i.pand)}</td>
          <td>${esc(i.descr)}${i.foto}</td>
          <td><span class="badge ${i.bron === 'Huurdersportaal' ? 'blue' : 'gray'}">${i.bron}</span></td>
          <td>${i.statusSelect}</td>
        </tr>`).join('') || emptyRow(5, 'Geen onderhoudsmeldingen. Eigen notities leg je vast bij een verhuurd pand; huurder-meldingen komen via het portaal binnen.')}</tbody>
      </table></div>
    </div>`;
}

let _currentMaint = null;
function openMaintMessages(cloudId) {
  if (!window.HCloud || !HCloud.status().staff) { showToast('Log in via Instellingen → Cloud om met de huurder te communiceren.'); return; }
  const m = (state.cloudMaintenance || []).find(x => x.id === cloudId);
  _currentMaint = { id: cloudId, email: (m && propertyById(m.localPropertyId)?.huurderEmail) || '' };
  $('#maintmsg-title').textContent = m ? `Berichten — ${m.descr}` : 'Berichten';
  $('#maintmsg-thread').innerHTML = '<p class="hint">Laden…</p>';
  $('#maintmsg-modal').showModal();
  loadMaintThread(cloudId);
}
function loadMaintThread(cloudId) {
  HCloud.getMaintenanceMessages(cloudId).then(msgs => {
    const el = $('#maintmsg-thread');
    el.innerHTML = msgs.length ? `<div class="check-list">${msgs.map(m => `<div class="check-item"><span class="badge ${m.author_type === 'operator' ? 'green' : 'gray'}">${m.author_type === 'operator' ? 'HomeINN' : 'Huurder'}</span><span>${esc(m.body)}<br><span class="sub">${fmtDateTime(m.created_at)}</span></span></div>`).join('')}</div>` : '<p class="hint">Nog geen berichten. Stuur het eerste bericht hieronder.</p>';
    el.scrollTop = el.scrollHeight;
  }).catch(e => { $('#maintmsg-thread').innerHTML = `<p class="hint">Kon berichten niet laden: ${esc(e.message || e)}</p>`; });
}

function genRentInvoices() {
  const t = todayISO();
  const maand = t.slice(0, 7);
  const verhuurd = state.properties.filter(p => Number(p.maandhuur) > 0 && p.status !== 'Verkocht');
  let n = 0;
  verhuurd.forEach(p => {
    const bestaat = state.invoices.some(f => f.propertyId === p.id && f.soort === 'Huur' && (f.date || '').startsWith(maand));
    if (bestaat) return;
    state.invoices.push({
      id: uid('f'), soort: 'Huur', propertyId: p.id, debiteur: p.huurder || '',
      desc: `Huur ${new Date(t + 'T00:00:00').toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`,
      amount: Number(p.maandhuur) || 0, date: t, due: addDaysISO(t, 14), status: 'Verzonden'
    });
    n++;
  });
  if (n) { rerender(); showToast(`${n} huurnota('s) aangemaakt voor ${maand}.`); }
  else showToast('Alle huurnota\'s voor deze maand bestaan al (of geen verhuurde panden).');
}

/* ---------- Verzekeringen ---------- */
function openInsuranceModal(propertyId, id = null) {
  const p = propertyById(propertyId);
  if (!p) return;
  const form = $('#insurance-form');
  form.reset();
  form.elements.propertyId.value = propertyId;
  form.elements.id.value = id || '';
  $('#insurance-modal-title').textContent = id ? 'Verzekering bewerken' : `Verzekering — ${p.address}`;
  const v = id ? (p.verzekeringen || []).find(x => x.id === id) : null;
  if (v) {
    ['type', 'verzekeraar', 'polis', 'premie', 'start', 'eind'].forEach(k => form.elements[k].value = v[k] ?? '');
  }
  $('#insurance-modal').showModal();
}

/* ---------- Financiering ---------- */
function openLoanModal(id = null) {
  if (!state.properties.length) { showToast('Voeg eerst een pand toe.'); return; }
  const form = $('#loan-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#loan-modal-title').textContent = id ? 'Lening bewerken' : 'Lening toevoegen';
  const l = id ? state.loans.find(x => x.id === id) : null;
  fillSelect(form.elements.propertyId, state.properties.filter(p => p.status !== 'Verkocht' || p.id === l?.propertyId), { selected: l?.propertyId || '' });
  fillSelect(form.elements.financierId, state.contacts.filter(c => c.type === 'Financier'), { empty: '— Geen —', selected: l?.financierId || '' });
  if (l) {
    ['soort', 'bedrag', 'rentePct', 'aflossing', 'start', 'eind'].forEach(k => form.elements[k].value = l[k] ?? '');
  } else {
    form.elements.start.value = todayISO();
  }
  $('#loan-modal').showModal();
}

function renderFinance() {
  const t = todayISO();
  const loans = state.loans.slice().sort((a, b) => (a.eind || '9999').localeCompare(b.eind || '9999'));
  const totaalSchuld = loans.reduce((s, l) => s + (Number(l.bedrag) || 0), 0);
  const renteJaar = loans.reduce((s, l) => s + (Number(l.bedrag) || 0) * (Number(l.rentePct) || 0) / 100, 0);
  const waarde = state.properties.filter(p => p.status !== 'Verkocht').reduce((s, p) => s + (Number(p.vraagprijs) || Number(p.taxatie) || 0), 0);
  const ltv = waarde ? totaalSchuld / waarde * 100 : 0;
  const binnenkort = loans.filter(l => l.eind && daysBetween(t, l.eind) >= 0 && daysBetween(t, l.eind) <= 90);
  $('#finance-body').innerHTML = `
    <div class="kpi-grid">
      <article class="kpi"><span>Totale financiering</span><strong>${fmtMoney(totaalSchuld)}</strong><small>${loans.length} leningen</small></article>
      <article class="kpi"><span>Rentelast / jaar</span><strong>${fmtMoney(Math.round(renteJaar))}</strong><small>${fmtMoney(Math.round(renteJaar / 12))}/mnd</small></article>
      <article class="kpi"><span>Portfoliowaarde</span><strong>${fmtMoney(waarde)}</strong><small>vraag-/taxatiewaarde in bezit</small></article>
      <article class="kpi"><span>Loan-to-value</span><strong class="${ltv > 80 ? 'alert' : ''}">${fmtNum(ltv, 0)}%</strong><small>schuld ÷ waarde</small></article>
    </div>
    ${binnenkort.length ? `<div class="panel"><div class="panel-head compact"><h2>Herfinancieringskalender</h2><span class="badge red">${binnenkort.length} binnen 90 dagen</span></div>
      <div class="priority-list">${binnenkort.map(l => `<div class="priority-item middel" data-action="open-property" data-id="${l.propertyId}"><span>${esc(propertyLabel(l.propertyId))} — ${esc(l.soort)} (${fmtMoney(l.bedrag)}) vervalt ${fmtDate(l.eind)} (${daysBetween(t, l.eind)} dgn)</span></div>`).join('')}</div></div>` : ''}
    <div class="panel">
      <div class="panel-head">
        <div><h2>Leningen &amp; financiering</h2><p>Per pand: hoofdsom, rente, aflossing en herzieningsdatum.</p></div>
        <button class="btn primary slim" data-action="new-loan">+ Lening</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Pand</th><th>Soort</th><th>Financier</th><th>Hoofdsom</th><th>Rente</th><th>Aflossing/mnd</th><th>Vervalt</th><th></th></tr></thead>
        <tbody>${loans.map(l => `<tr>
          <td><strong>${esc(propertyLabel(l.propertyId))}</strong></td><td>${esc(l.soort)}</td><td>${esc(contactName(l.financierId))}</td>
          <td>${fmtMoney(l.bedrag)}</td><td>${fmtNum(l.rentePct, 1)}%</td><td>${fmtMoney(l.aflossing)}</td>
          <td class="${l.eind && daysBetween(t, l.eind) <= 90 ? 'alert' : ''}">${fmtDate(l.eind)}</td>
          <td class="row-actions"><button class="icon-btn" data-action="loan-edit" data-id="${l.id}" title="Bewerken">✎</button>
          <button class="icon-btn" data-action="loan-del" data-id="${l.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(8, 'Nog geen leningen geregistreerd.')}</tbody>
      </table></div>
      <p class="hint">Dit overzicht staat los van het financieringsveld per pand; gebruik het voor portfolio-breed inzicht en je herfinancieringsplanning.</p>
    </div>`;
}

/* ---------- Investeerders-uitkeringen ---------- */
function openPayoutModal(projectId, investorId, id = null) {
  const pr = projectById(projectId);
  const inv = pr && (pr.investeerders || []).find(x => x.id === investorId);
  if (!inv) return;
  const form = $('#payout-form');
  form.reset();
  form.elements.projectId.value = projectId;
  form.elements.investorId.value = investorId;
  form.elements.id.value = id || '';
  $('#payout-modal-title').textContent = id ? 'Uitkering bewerken' : `Uitkering — ${inv.naam}`;
  const u = id ? (inv.uitkeringen || []).find(x => x.id === id) : null;
  if (u) ['kind', 'amount', 'date', 'status', 'note'].forEach(k => form.elements[k].value = u[k] ?? '');
  else form.elements.date.value = todayISO();
  $('#payout-modal').showModal();
}

/* ---------- Liquiditeit ---------- */
function openAccountModal(id = null) {
  const form = $('#account-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#account-modal-title').textContent = id ? 'Rekening bewerken' : 'Rekening toevoegen';
  const a = id ? (state.accounts || []).find(x => x.id === id) : null;
  if (a) ['naam', 'type', 'saldo'].forEach(k => form.elements[k].value = a[k] ?? '');
  $('#account-modal').showModal();
}

function renderLiquidity() {
  const accounts = state.accounts || [];
  const totaal = accounts.reduce((s, a) => s + (Number(a.saldo) || 0), 0);
  const buffer = accounts.filter(a => a.type === 'Spaar').reduce((s, a) => s + (Number(a.saldo) || 0), 0);
  const r = reportData();
  const aflossingMnd = state.loans.reduce((s, l) => s + (Number(l.aflossing) || 0), 0);
  let bal = totaal;
  const proj = r.months.map(m => {
    const net = m.huurIn - m.vasteUit - m.geplandUit - aflossingMnd;
    bal += net;
    return { label: m.label, huurIn: m.huurIn, uit: m.vasteUit + m.geplandUit + aflossingMnd, net, balance: bal, events: m.events };
  });
  const laagste = Math.min(totaal, ...proj.map(p => p.balance));
  const vasteUitMnd = Math.round(r.renteLastenMnd) + aflossingMnd;
  $('#liquidity-body').innerHTML = `
    <div class="kpi-grid">
      <article class="kpi"><span>Totaal banksaldo</span><strong>${fmtMoney(totaal)}</strong><small>${accounts.length} rekening${accounts.length === 1 ? '' : 'en'}</small></article>
      <article class="kpi"><span>Waarvan buffer (spaar)</span><strong>${fmtMoney(buffer)}</strong></article>
      <article class="kpi"><span>Vaste uitgaven / maand</span><strong>${fmtMoney(vasteUitMnd)}</strong><small>rente, lasten &amp; aflossing</small></article>
      <article class="kpi"><span>Laagste prognose (6 mnd)</span><strong class="${laagste < 0 ? 'alert' : ''}">${fmtMoney(laagste)}</strong><small>${laagste < 0 ? 'tekort verwacht — actie nodig' : 'blijft positief'}</small></article>
    </div>
    <div class="split">
      <section class="panel">
        <div class="panel-head">
          <div><h2>Bankrekeningen</h2><p>Werk het saldo regelmatig bij uit je bankomgeving.</p></div>
          <button class="btn primary slim" data-action="new-account">+ Rekening</button>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Rekening</th><th>Type</th><th>Saldo</th><th>Bijgewerkt</th><th></th></tr></thead>
          <tbody>${accounts.map(a => `<tr>
            <td><strong>${esc(a.naam)}</strong></td><td>${esc(a.type)}</td>
            <td class="${Number(a.saldo) < 0 ? 'alert' : ''}">${fmtMoney(a.saldo)}</td><td class="sub">${fmtDate(a.updatedAt)}</td>
            <td class="row-actions"><button class="icon-btn" data-action="edit-account" data-id="${a.id}" title="Saldo bijwerken / bewerken">✎</button>
            <button class="icon-btn" data-action="del-account" data-id="${a.id}" title="Verwijderen">🗑</button></td></tr>`).join('') || emptyRow(5, 'Nog geen rekeningen. Voeg je zakelijke rekening toe.')}</tbody>
          <tfoot><tr><td><strong>Totaal</strong></td><td></td><td><strong>${fmtMoney(totaal)}</strong></td><td colspan="2"></td></tr></tfoot>
        </table></div>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Liquiditeitspositie</h2></div>
        <div class="totals-box">
          <div><dt>Nu beschikbaar</dt><dd><strong>${fmtMoney(totaal)}</strong></dd></div>
          <div><dt>Verwacht over 3 maanden</dt><dd class="${(proj[2] ? proj[2].balance : totaal) < 0 ? 'alert' : ''}">${fmtMoney(proj[2] ? proj[2].balance : totaal)}</dd></div>
          <div><dt>Verwacht over 6 maanden</dt><dd class="${(proj[5] ? proj[5].balance : totaal) < 0 ? 'alert' : ''}">${fmtMoney(proj[5] ? proj[5].balance : totaal)}</dd></div>
          <div><dt>Maandelijkse huurinkomsten</dt><dd>${fmtMoney(r.months[0] ? r.months[0].huurIn : 0)}</dd></div>
        </div>
        <p class="report-note">Prognose = huidig saldo + verwachte huur − (rente, vaste lasten, aflossing en geplande kosten). Verkoopopbrengsten zijn niet meegerekend (eenmalig).</p>
      </section>
    </div>
    <section class="panel">
      <div class="panel-head compact"><h2>Saldoprognose — 6 maanden</h2><span class="sub">doorlopend banksaldo</span></div>
      <div class="waterfall-wrap">${cashflowWaterfallSvg(totaal, proj.map(p => ({ label: p.label, delta: p.net, events: p.events })))}</div>
      <div class="table-wrap"><table class="cashflow-table">
        <thead><tr><th>Maand</th><th>Huur in</th><th>Uit (rente/lasten/aflossing/kosten)</th><th>Netto</th><th>Verwacht saldo</th><th>Aandachtspunten</th></tr></thead>
        <tbody>${proj.map(p => `<tr>
          <td><strong>${p.label}</strong></td>
          <td>${p.huurIn ? fmtMoney(p.huurIn) : '—'}</td>
          <td class="neg">−${fmtMoney(p.uit)}</td>
          <td><strong class="${p.net < 0 ? 'neg' : ''}">${p.net < 0 ? '−' + fmtMoney(Math.abs(p.net)) : fmtMoney(p.net)}</strong></td>
          <td><strong class="${p.balance < 0 ? 'neg' : ''}">${fmtMoney(p.balance)}</strong></td>
          <td class="sub">${p.events.map(esc).join('<br>') || '—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p class="report-note">Loopt het verwachte saldo richting nul of negatief? Plan een herfinanciering, versnel een verkoop of stel kosten uit.</p>
    </section>`;
}

/* ---------- Mailing / nieuwsbrief ---------- */
function mailingAudienceEmails(audiences) {
  const out = [];
  if (audiences.includes('investeerders')) state.projects.forEach(p => (p.investeerders || []).forEach(i => { if (i.email) out.push(i.email); }));
  if (audiences.includes('relaties')) state.contacts.forEach(c => { if (c.email) out.push(c.email); });
  if (audiences.includes('leads')) loadInbox().forEach(l => { if (l.email) out.push(l.email); });
  return [...new Set(out.map(e => String(e).trim().toLowerCase()).filter(e => /.+@.+\..+/.test(e)))];
}

function mailingHtml(body) {
  const s = state.settings;
  const para = esc(body).trim().split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto">
    ${para}
    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
    <p style="font-size:12px;color:#888">${esc(s.companyName || 'HomeINN')} · ${esc(s.address || 'Rotterdam')}${s.email ? ' · ' + esc(s.email) : ''}<br>
    Je ontvangt deze e-mail omdat je relatie bent van HomeINN. Geen mails meer ontvangen? Antwoord met "afmelden".</p>
  </div>`;
}

function renderMailing() {
  const counts = {
    investeerders: mailingAudienceEmails(['investeerders']).length,
    relaties: mailingAudienceEmails(['relaties']).length,
    leads: mailingAudienceEmails(['leads']).length
  };
  const st = (window.HCloud && HCloud.status()) || { ready: false };
  const camps = (state.campaigns || []).slice();
  $('#mailing-body').innerHTML = `
    ${!st.staff ? '<div class="panel"><p class="hint" style="margin:0">Log in als eigenaar/team (Instellingen → Cloud) om mailings te versturen. Je kunt hier alvast opstellen.</p></div>' : ''}
    <div class="split">
      <section class="panel">
        <div class="panel-head compact"><h2>Nieuwe mailing</h2></div>
        <p class="hint">Stuur een nieuwsbrief of update. Elke ontvanger krijgt een persoonlijke e-mail (geen zichtbare adressen van anderen).</p>
        <div class="form-grid">
          <label class="check-label" style="margin:0"><input type="checkbox" class="mail-aud" value="investeerders" checked> Investeerders (${counts.investeerders})</label>
          <label class="check-label" style="margin:0"><input type="checkbox" class="mail-aud" value="relaties"> Relaties (${counts.relaties})</label>
          <label class="check-label" style="margin:0"><input type="checkbox" class="mail-aud" value="leads"> Website-leads (${counts.leads})</label>
        </div>
        <label style="display:block;margin-top:10px">Onderwerp<input id="mail-subject" placeholder="Bijv. HomeINN update — voortgang projecten" style="width:100%"></label>
        <label style="display:block;margin-top:10px">Bericht<textarea id="mail-body" rows="8" placeholder="Beste,&#10;&#10;..." style="width:100%"></textarea></label>
        <div class="head-actions" style="margin-top:12px">
          <button class="btn primary" data-action="send-mailing">Verstuur mailing</button>
          <span class="sub" id="mail-count"></span>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head compact"><h2>Verzonden mailings</h2></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Datum</th><th>Onderwerp</th><th>Doelgroep</th><th>Aantal</th><th>Resultaat</th></tr></thead>
          <tbody>${camps.map(c => `<tr>
            <td>${fmtDate(c.datum)}</td><td>${esc(c.onderwerp)}</td><td class="sub">${esc((c.audience || []).join(', '))}</td>
            <td>${c.aantal}</td><td>${esc(c.resultaat || c.status || '—')}</td></tr>`).join('') || emptyRow(5, 'Nog geen mailings verzonden.')}</tbody>
        </table></div>
        <p class="report-note">AVG: stuur commerciële mail alleen naar ontvangers die daarvoor toestemming gaven. Investeerders/relaties met een lopende relatie mag je informeren.</p>
      </section>
    </div>`;
}

/* ---------- Contracten ---------- */
const CONTRACT_TYPES = ['Koopovereenkomst', 'Huurovereenkomst', 'Investeringsovereenkomst', 'Aannemingsovereenkomst'];

function contractParties(c) {
  const b = state.settings;
  const homeinn = { naam: b.companyName || 'HomeINN', adres: b.address || '', kvk: b.kvk || '', btw: b.btw || '' };
  const rel = contactById(c.contactId);
  const ander = { naam: (rel && rel.name) || c.partijNaam || '[Wederpartij]', adres: (rel && rel.address) || c.partijAdres || '' };
  let aRol, bRol;
  if (c.type === 'Koopovereenkomst') { const verkoopt = c.positie !== 'HomeINN koopt'; aRol = verkoopt ? 'Verkoper' : 'Koper'; bRol = verkoopt ? 'Koper' : 'Verkoper'; }
  else if (c.type === 'Huurovereenkomst') { aRol = 'Verhuurder'; bRol = 'Huurder'; }
  else if (c.type === 'Investeringsovereenkomst') { aRol = 'Onderneming'; bRol = 'Investeerder'; }
  else { aRol = 'Opdrachtgever'; bRol = 'Aannemer'; }
  return { homeinn, ander, aRol, bRol };
}

function contractClauses(c, ctx) {
  const bedrag = Number(c.bedrag) || 0;
  const onderwerp = ctx.onderwerp;
  const lever = c.ingangsdatum ? fmtDate(c.ingangsdatum) : 'nader overeen te komen';
  const recht = 'Op deze overeenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter te Rotterdam.';
  const bijz = esc(c.note || 'Geen aanvullende bepalingen.');
  if (c.type === 'Koopovereenkomst') return [
    { kop: 'Verkoop en koop', tekst: `Verkoper verkoopt aan Koper, gelijk Koper koopt van Verkoper, het registergoed: <strong>${esc(onderwerp)}</strong>, met alle daarbij behorende rechten en verplichtingen.` },
    { kop: 'Koopsom', tekst: `De koopsom bedraagt <strong>${fmtMoney(bedrag)}</strong> kosten koper. Betaling vindt plaats via de notaris bij het passeren van de leveringsakte.` },
    { kop: 'Levering', tekst: `De juridische levering geschiedt bij notariële akte op of omstreeks ${lever}, ten overstaan van een door Koper aan te wijzen notaris.` },
    { kop: 'Ontbindende voorwaarden', tekst: `Koper kan deze overeenkomst ontbinden indien hij niet uiterlijk op de overeengekomen datum financiering verkrijgt, dan wel bij een ongunstige bouwkundige keuring.` },
    { kop: 'Waarborg', tekst: `Tot zekerheid stelt Koper binnen de wettelijke termijn een waarborgsom of bankgarantie ter grootte van 10% van de koopsom.` },
    { kop: 'Bijzondere bepalingen', tekst: bijz },
    { kop: 'Toepasselijk recht', tekst: recht }
  ];
  if (c.type === 'Huurovereenkomst') return [
    { kop: 'Het gehuurde', tekst: `Verhuurder verhuurt aan Huurder de woonruimte: <strong>${esc(onderwerp)}</strong>, uitsluitend bestemd om te worden gebruikt als woonruimte.` },
    { kop: 'Duur', tekst: `De huurovereenkomst gaat in op ${lever} en is aangegaan voor ${esc(c.looptijd || 'onbepaalde tijd')}.` },
    { kop: 'Huurprijs', tekst: `De huurprijs bedraagt <strong>${fmtMoney(bedrag)}</strong> per maand, bij vooruitbetaling te voldoen vóór de eerste van elke maand.` },
    { kop: 'Indexering', tekst: `De huurprijs wordt jaarlijks aangepast conform de consumentenprijsindex (CBS), voor het eerst één jaar na ingangsdatum.` },
    { kop: 'Waarborgsom & onderhoud', tekst: `Huurder voldoet een waarborgsom en is gehouden het gehuurde als een goed huurder te gebruiken en klein onderhoud voor eigen rekening te nemen.` },
    { kop: 'Bijzondere bepalingen', tekst: bijz },
    { kop: 'Toepasselijk recht', tekst: recht }
  ];
  if (c.type === 'Investeringsovereenkomst') return [
    { kop: 'De investering', tekst: `Investeerder verstrekt aan de Onderneming een bedrag van <strong>${fmtMoney(bedrag)}</strong> ten behoeve van ${esc(onderwerp)}.` },
    { kop: 'Rendement', tekst: `De Onderneming vergoedt over de inleg een rendement van <strong>${fmtNum(Number(c.rendementPct) || 0, 1)}% per jaar</strong>, jaarlijks uit te keren.` },
    { kop: 'Looptijd & terugbetaling', tekst: `De looptijd bedraagt ${esc(c.looptijd || 'nader overeen te komen')}. Aan het einde van de looptijd wordt de hoofdsom terugbetaald.` },
    { kop: 'Risico', tekst: `Investeerder is ermee bekend dat aan investeren in vastgoed risico's verbonden zijn en dat rendement noch hoofdsom gegarandeerd zijn. De inleg dient als achtergestelde financiering.` },
    { kop: 'Identiteit & Wwft', tekst: `Partijen voldoen aan de toepasselijke regelgeving, waaronder identificatie conform de Wwft.` },
    { kop: 'Bijzondere bepalingen', tekst: bijz },
    { kop: 'Toepasselijk recht', tekst: recht }
  ];
  return [
    { kop: 'Het werk', tekst: `Opdrachtgever draagt aan Aannemer op, die aanneemt, de uitvoering van het werk aan: <strong>${esc(onderwerp)}</strong>, conform de bij partijen bekende omschrijving.` },
    { kop: 'Aanneemsom', tekst: `De aanneemsom bedraagt <strong>${fmtMoney(bedrag)}</strong>, exclusief btw, tenzij anders vermeld.` },
    { kop: 'Planning en oplevering', tekst: `Het werk vangt aan op ${lever} en wordt opgeleverd binnen ${esc(c.looptijd || 'de overeengekomen termijn')}.` },
    { kop: 'Meer- en minderwerk', tekst: `Wijzigingen worden uitsluitend schriftelijk overeengekomen en als meer- of minderwerk verrekend.` },
    { kop: 'Betaling in termijnen', tekst: `Betaling vindt plaats in termijnen naar rato van de voortgang, na goedkeuring door Opdrachtgever.` },
    { kop: 'Garantie en oplevering', tekst: `Aannemer staat in voor deugdelijke uitvoering en verleent garantie conform de geldende normen. Oplevering geschiedt met een proces-verbaal van opnamepunten.` },
    { kop: 'Bijzondere bepalingen', tekst: bijz },
    { kop: 'Toepasselijk recht', tekst: recht }
  ];
}

function buildContractDoc(c) {
  const { homeinn, ander, aRol, bRol } = contractParties(c);
  const pand = propertyById(c.propertyId);
  const project = projectById(c.projectId);
  const onderwerp = pand ? `${pand.address}, ${pand.city}` : (project ? project.name : (c.type === 'Investeringsovereenkomst' ? 'de onderneming HomeINN' : 'het in deze overeenkomst omschreven object'));
  const clauses = contractClauses(c, { onderwerp });
  return `
    <header class="doc-head">
      <div>
        <img src="assets/logo-dark.png?v=20260614" alt="" class="doc-logo">
        <h1>${esc(c.type.toUpperCase())}</h1>
        <p class="doc-number">${esc(c.ref)} · ${fmtDate(c.datum || todayISO())}</p>
      </div>
      <div class="doc-company">
        <strong>${esc(homeinn.naam)}</strong><br>${esc(homeinn.adres)}<br>
        KvK ${esc(homeinn.kvk)}${homeinn.btw ? ` · ${esc(homeinn.btw)}` : ''}
      </div>
    </header>
    <p class="doc-note"><strong>De ondergetekenden:</strong><br>
      1. <strong>${esc(homeinn.naam)}</strong>, gevestigd te ${esc(homeinn.adres || '—')}, KvK ${esc(homeinn.kvk || '—')}, hierna "<strong>${aRol}</strong>";<br>
      2. <strong>${esc(ander.naam)}</strong>${ander.adres ? `, ${esc(ander.adres)}` : ''}, hierna "<strong>${bRol}</strong>";<br>
      komen het volgende overeen:</p>
    <div class="doc-body">
      ${clauses.map((cl, i) => `<h2>Artikel ${i + 1} — ${esc(cl.kop)}</h2><p>${cl.tekst}</p>`).join('')}
    </div>
    <div class="doc-sign">
      <div><strong>${aRol}</strong><br>${esc(homeinn.naam)}<div class="line">Naam &amp; handtekening · datum</div></div>
      <div><strong>${bRol}</strong><br>${esc(ander.naam)}<div class="line">Naam &amp; handtekening · datum</div></div>
    </div>
    <footer class="doc-footer">Opgesteld met HomeINN OS. Dit is een concept-modelovereenkomst — laat deze vóór ondertekening controleren door een jurist of notaris. Aan dit document kunnen geen rechten worden ontleend.</footer>`;
}

function printContract(id) {
  const c = state.contracten.find(x => x.id === id);
  if (!c) return;
  $('#print-area').innerHTML = buildContractDoc(c);
  window.print();
}

function openContractModal(id = null) {
  const form = $('#contract-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#contract-modal-title').textContent = id ? 'Contract bewerken' : `Contract opstellen (${nextRef('CON', state.contracten)})`;
  const c = id ? state.contracten.find(x => x.id === id) : null;
  fillSelect(form.elements.propertyId, state.properties, { empty: '— Geen pand —', selected: c?.propertyId || '' });
  fillSelect(form.elements.projectId, state.projects, { empty: '— Geen project —', selected: c?.projectId || '' });
  fillSelect(form.elements.contactId, state.contacts, { empty: '— Geen / handmatig —', selected: c?.contactId || '' });
  if (c) {
    ['type', 'positie', 'partijNaam', 'partijAdres', 'partijEmail', 'bedrag', 'datum', 'ingangsdatum', 'looptijd', 'rendementPct', 'note'].forEach(k => form.elements[k].value = c[k] ?? '');
  } else {
    form.elements.datum.value = todayISO();
  }
  $('#contract-modal').showModal();
}

function renderContracts() {
  const list = state.contracten.slice().sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const getekend = list.filter(c => c.status === 'Getekend').length;
  $('#contracts-body').innerHTML = `
    <div class="kpi-grid three">
      <article class="kpi"><span>Contracten</span><strong>${list.length}</strong></article>
      <article class="kpi"><span>Getekend</span><strong>${getekend}</strong></article>
      <article class="kpi"><span>In behandeling</span><strong>${list.length - getekend}</strong></article>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h2>Contracten &amp; overeenkomsten</h2><p>Genereer koop-, huur-, investerings- en aannemingsovereenkomsten uit je eigen gegevens. Bekijk/print met handtekeningblokken.</p></div>
        <button class="btn primary slim" data-action="new-contract">+ Nieuw contract</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Datum</th><th>Type</th><th>Betreft</th><th>Wederpartij</th><th>Bedrag</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map(c => {
          const pand = propertyById(c.propertyId);
          const project = projectById(c.projectId);
          const betreft = pand ? pand.address : (project ? project.name : '—');
          const partij = (contactById(c.contactId)?.name) || c.partijNaam || '—';
          return `<tr>
            <td>${fmtDate(c.datum)}</td><td><strong>${esc(c.type)}</strong><br><span class="sub">${esc(c.ref)}</span></td>
            <td>${esc(betreft)}</td><td>${esc(partij)}</td><td>${fmtMoney(c.bedrag)}</td>
            <td><select class="row-status" data-action="contract-status" data-id="${c.id}">
              ${['Concept', 'Verstuurd', 'Getekend'].map(s => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>${c.signedAt ? `<br><span class="sub maint-done">✔ digitaal getekend ${fmtDate(c.signedAt)}${c.signedName ? ' · ' + esc(c.signedName) : ''}</span>` : ''}</td>
            <td class="row-actions">
              <button class="btn secondary slim" data-action="print-contract" data-id="${c.id}">Bekijk / print</button>
              <button class="btn secondary slim" data-action="send-contract" data-id="${c.id}">Verstuur ter ondertekening</button>
              <button class="icon-btn" data-action="edit-contract" data-id="${c.id}" title="Bewerken">✎</button>
              <button class="icon-btn" data-action="del-contract" data-id="${c.id}" title="Verwijderen">🗑</button>
            </td></tr>`;
        }).join('') || emptyRow(7, 'Nog geen contracten. Klik op "+ Nieuw contract".')}</tbody>
      </table></div>
      <p class="hint">Tip: kies een pand/project en een wederpartij uit je relaties — dan vult HomeINN OS de partijgegevens automatisch in. Laat elk contract vóór ondertekening juridisch controleren.</p>
    </div>`;
}

/* ---------- Modals ---------- */
function fillSelect(select, items, { empty = null, selected = '' } = {}) {
  select.innerHTML = (empty !== null ? `<option value="">${esc(empty)}</option>` : '') +
    items.map(i => `<option value="${i.id}" ${i.id === selected ? 'selected' : ''}>${esc(i.name)}</option>`).join('');
}

function fillRefSelect(select, selected = '') {
  const opt = (value, label) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
  let html = '<option value="">— Algemeen —</option>' +
    '<optgroup label="Panden">' + state.properties.filter(p => p.status !== 'Verkocht').map(p => opt('p:' + p.id, p.address)).join('') + '</optgroup>' +
    '<optgroup label="Aankoopkansen">' + state.deals.filter(d => DEAL_STAGES.includes(d.status)).map(d => opt('d:' + d.id, d.address)).join('') + '</optgroup>';
  if (selected && !html.includes(`value="${selected}" selected`)) html += opt(selected, (refLabel(selected) || 'Onbekend') + ' (archief)');
  select.innerHTML = html;
}

function openActivityModal(contactId) {
  const c = contactById(contactId); if (!c) return;
  const form = $('#activity-form');
  form.reset();
  form.elements.contactId.value = contactId;
  form.elements.date.value = todayISO();
  $('#activity-modal-title').textContent = `Contactmoment — ${c.name}`;
  const acts = (c.activities || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  $('#activity-history').innerHTML = acts.length
    ? `<div class="check-list" style="max-height:170px;overflow:auto;margin-bottom:10px">${acts.map(a => `<div class="check-item"><span class="badge gray">${fmtDate(a.date)}</span><span><strong>${esc(a.type)}</strong> — ${esc(a.description)}${a.nextFollowUp ? ` · <span class="alert">vervolg ${fmtDate(a.nextFollowUp)}</span>` : ''}</span></div>`).join('')}</div>`
    : '<p class="hint">Nog geen contactmomenten vastgelegd.</p>';
  $('#activity-modal').showModal();
}

function openContactModal(id = null) {
  const form = $('#contact-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#contact-modal-title').textContent = id ? 'Relatie bewerken' : 'Relatie toevoegen';
  if (id) {
    const c = contactById(id);
    ['type', 'name', 'contact', 'email', 'phone', 'address', 'note'].forEach(k => form.elements[k].value = c[k] || '');
  } else if (filters.relation !== 'all' && currentView === 'relations') {
    form.elements.type.value = filters.relation;
  }
  $('#contact-modal').showModal();
}

function refreshDealPreview() {
  const f = $('#deal-form');
  const c = computeDeal({
    koopsom: Number(f.elements.koopsom.value) || 0,
    verbouwing: Number(f.elements.verbouwing.value) || 0,
    verkoopprijs: Number(f.elements.verkoopprijs.value) || 0,
    maanden: Number(f.elements.maanden.value) || 9
  });
  $('#deal-calc-preview').innerHTML = `
    <div><dt>Totale investering (incl. kosten &amp; houdkosten)</dt><dd>${fmtMoney(c.investering)}</dd></div>
    <div class="grand ${winstClass(c.winst)}"><dt>Verwachte winst</dt><dd>${fmtMoney(c.winst)} (${fmtNum(c.roi, 1)}% ROI)</dd></div>`;
}

function openDealModal(id = null, preset = {}) {
  const form = $('#deal-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#deal-modal-title').textContent = id ? 'Aankoopkans bewerken' : `Nieuwe aankoopkans (${nextRef('AK', state.deals)})`;
  const d = id ? dealById(id) : null;
  fillSelect(form.elements.makelaarId, state.contacts.filter(c => c.type === 'Makelaar'), { empty: '— Geen / onbekend —', selected: d?.makelaarId || '' });
  form.elements.status.querySelectorAll('option[data-extra]').forEach(o => o.remove());
  if (d && !DEAL_STAGES.includes(d.status)) form.elements.status.insertAdjacentHTML('beforeend', `<option data-extra>${esc(d.status)}</option>`);
  if (d) {
    ['address', 'city', 'ptype', 'status', 'vraagprijs', 'viewingDate', 'source', 'note', 'verkoperEmail'].forEach(k => form.elements[k].value = d[k] ?? '');
    ['koopsom', 'verbouwing', 'verkoopprijs', 'maanden'].forEach(k => form.elements[k].value = d.calc?.[k] ?? '');
  } else {
    Object.entries(preset).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
  }
  refreshDealPreview();
  $('#deal-modal').showModal();
}

function openBidModal(dealId) {
  const form = $('#bid-form');
  form.reset();
  form.elements.dealId.value = dealId;
  form.elements.id.value = '';
  form.elements.date.value = todayISO();
  form.elements.validUntil.value = addDaysISO(todayISO(), 5);
  const d = dealById(dealId);
  if (d?.calc?.koopsom) form.elements.amount.value = d.calc.koopsom;
  $('#bid-modal').showModal();
}

function openAcquireModal(dealId) {
  const d = dealById(dealId);
  if (!d) return;
  const form = $('#acquire-form');
  form.reset();
  form.elements.dealId.value = dealId;
  const s = calcDefaults();
  const koopsom = Number(d.calc?.koopsom) || 0;
  form.elements.date.value = todayISO();
  form.elements.koopsom.value = koopsom;
  form.elements.otb.value = Math.round(koopsom * s.otbPct / 100);
  form.elements.notaris.value = s.notaris;
  form.elements.makelaar.value = Math.round(koopsom * s.makelaarPct / 100);
  const financiers = state.contacts.filter(c => c.type === 'Financier');
  fillSelect(form.elements.financierId, financiers, { empty: '— Geen financiering —', selected: financiers[0]?.id || '' });
  form.elements.finBedrag.value = Math.round((koopsom + (Number(d.calc?.verbouwing) || 0)) * 0.8);
  form.elements.finRente.value = s.rentePct;
  $('#acquire-modal').showModal();
}

function openPropertyModal(id = null) {
  const form = $('#property-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#property-modal-title').textContent = id ? 'Pand bewerken' : `Pand toevoegen (${nextRef('PND', state.properties)})`;
  const p = id ? propertyById(id) : null;
  fillSelect(form.elements.financierId, state.contacts.filter(c => c.type === 'Financier'), { empty: '— Geen financiering —', selected: p?.financing?.financierId || '' });
  form.elements.status.querySelectorAll('option[data-extra]').forEach(o => o.remove());
  form.elements.status.disabled = false;
  if (p && p.status === 'Verkocht') {
    form.elements.status.insertAdjacentHTML('beforeend', '<option data-extra>Verkocht</option>');
    form.elements.status.disabled = true;
  }
  if (p) {
    ['address', 'city', 'ptype', 'status', 'label', 'taxatie', 'taxatieDatum', 'vraagprijs', 'teKoopSinds', 'vasteLasten', 'maandhuur', 'huurder', 'note', 'm2', 'kamers', 'webOmschrijving', 'huurIngang', 'huurEind', 'borg', 'huurIndexPct', 'huurderEmail', 'vveBijdrage', 'vveReserve', 'mjopDatum', 'doelLabel', 'subsidieType', 'subsidieBedrag', 'verduurzaming'].forEach(k => form.elements[k].value = p[k] ?? '');
    form.elements.purchaseDate.value = p.purchase?.date || '';
    form.elements.koopsom.value = p.purchase?.koopsom ?? '';
    form.elements.otb.value = p.purchase?.otb ?? 0;
    form.elements.notarisK.value = p.purchase?.notaris ?? 0;
    form.elements.makelaarK.value = p.purchase?.makelaar ?? 0;
    form.elements.overig.value = p.purchase?.overig ?? 0;
    form.elements.finBedrag.value = p.financing?.bedrag ?? 0;
    form.elements.finRente.value = p.financing?.rentePct ?? 0;
    form.elements.finEind.value = p.financing?.einddatum || '';
  } else {
    form.elements.purchaseDate.value = todayISO();
    form.elements.vasteLasten.value = state.settings.vasteLasten;
  }
  $('#property-modal').showModal();
}

function openProjectModal(id = null, presetPropertyId = '') {
  const pr0 = id ? projectById(id) : null;
  if (!state.properties.some(p => p.status !== 'Verkocht' || p.id === pr0?.propertyId)) {
    showToast('Voeg eerst een pand toe — een project hoort bij een pand.');
    return;
  }
  const form = $('#project-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#project-modal-title').textContent = id ? 'Project bewerken' : `Project toevoegen (${nextRef('PRJ', state.projects)})`;
  const pr = id ? projectById(id) : null;
  fillSelect(form.elements.propertyId, state.properties.filter(p => p.status !== 'Verkocht' || p.id === pr?.propertyId), { selected: pr?.propertyId || presetPropertyId });
  if (pr) {
    ['name', 'status', 'budget', 'startDate', 'endDate', 'note'].forEach(k => form.elements[k].value = pr[k] ?? '');
    form.elements.propertyId.value = pr.propertyId || '';
    form.elements.publish.checked = !!pr.publish;
    form.elements.investOpen.checked = !!pr.invest?.open;
    form.elements.doelbedrag.value = pr.invest?.doelbedrag ?? '';
    form.elements.minInleg.value = pr.invest?.minInleg ?? '';
    form.elements.rendementPct.value = pr.invest?.rendementPct ?? '';
    form.elements.looptijd.value = pr.invest?.looptijd ?? '';
  } else {
    form.elements.startDate.value = todayISO();
  }
  $('#project-modal').showModal();
}

function openCostModal(id = null, preset = {}) {
  if (!state.properties.length) {
    showToast('Voeg eerst een pand toe — kosten horen bij een pand.');
    return;
  }
  const form = $('#cost-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#cost-modal-title').textContent = id ? 'Kostenpost bewerken' : 'Kostenpost toevoegen';
  const k = id ? state.costs.find(x => x.id === id) : null;
  fillSelect(form.elements.propertyId, state.properties, { selected: k?.propertyId || preset.propertyId || '' });
  fillSelect(form.elements.projectId, state.projects, { empty: '— Geen project —', selected: k?.projectId || preset.projectId || '' });
  fillSelect(form.elements.contactId, state.contacts.filter(c => c.type !== 'Koper/Verkoper'), { empty: '— Geen / divers —', selected: k?.contactId || '' });
  if (k) {
    ['desc', 'category', 'amount', 'date', 'status'].forEach(key => form.elements[key].value = k[key] ?? '');
    form.elements.btwPct.value = (k.btwPct === 0 || k.btwPct) ? k.btwPct : 21;
  } else {
    form.elements.date.value = todayISO();
    if (preset.projectId) {
      const pr = projectById(preset.projectId);
      if (pr) form.elements.propertyId.value = pr.propertyId;
    }
  }
  $('#cost-modal').showModal();
}

function openViewingModal(propertyId) {
  const form = $('#viewing-form');
  form.reset();
  form.elements.propertyId.value = propertyId;
  form.elements.date.value = todayISO();
  $('#viewing-modal').showModal();
}

function openOfferModal(propertyId) {
  const form = $('#offer-form');
  form.reset();
  form.elements.propertyId.value = propertyId;
  form.elements.id.value = '';
  form.elements.date.value = todayISO();
  $('#offer-modal').showModal();
}

function refreshSalePreview() {
  const form = $('#sale-form');
  const p = propertyById(form.elements.propertyId.value);
  if (!p) { $('#sale-preview').innerHTML = ''; return; }
  const fin = propertyFinance(p);
  const verkoopprijs = Number(form.elements.verkoopprijs.value) || 0;
  const kosten = Number(form.elements.kosten.value) || 0;
  const winst = verkoopprijs - kosten + fin.huur - fin.investering;
  const roi = fin.investering ? winst / fin.investering * 100 : 0;
  $('#sale-preview').innerHTML = `
    <div><dt>Totale investering t/m vandaag</dt><dd>${fmtMoney(fin.investering)}</dd></div>
    <div class="grand ${winstClass(winst)}"><dt>Gerealiseerde winst</dt><dd>${fmtMoney(winst)} (${fmtNum(roi, 1)}% ROI)</dd></div>`;
}

function openSaleModal(propertyId) {
  const p = propertyById(propertyId);
  if (!p) return;
  const form = $('#sale-form');
  form.reset();
  form.elements.propertyId.value = propertyId;
  form.elements.date.value = todayISO();
  const fin = propertyFinance(p);
  form.elements.verkoopprijs.value = fin.hoogsteBod || p.vraagprijs || '';
  form.elements.kosten.value = Math.round((Number(form.elements.verkoopprijs.value) || 0) * calcDefaults().verkoopkostenPct / 100);
  const accepted = (p.offers || []).find(o => o.status === 'Geaccepteerd');
  if (accepted) form.elements.koper.value = accepted.name;
  refreshSalePreview();
  $('#sale-modal').showModal();
}

function openPlanModal(id = null, presetDate = '', presetRef = '') {
  const form = $('#plan-form');
  form.reset();
  form.elements.id.value = id || '';
  $('#plan-modal-title').textContent = id ? 'Planning bewerken' : 'Planning toevoegen';
  const pl = id ? state.planning.find(x => x.id === id) : null;
  fillRefSelect(form.elements.ref, pl?.ref || presetRef);
  if (pl) {
    ['date', 'type', 'title', 'who', 'recurrence', 'recurrenceEnd'].forEach(k => form.elements[k].value = pl[k] ?? '');
  } else {
    form.elements.date.value = presetDate || todayISO();
  }
  $('#plan-modal').showModal();
}

/* ---------- Foto's (website) ---------- */
// Foto's horen bij een pand óf een project (data-kind bepaalt welke)
function fotoHolder(kind, id) { return kind === 'project' ? projectById(id) : kind === 'deal' ? dealById(id) : propertyById(id); }

function handleFotoUpload(input) {
  const p = fotoHolder(input.dataset.kind, input.dataset.id);
  if (!p) return;
  p.fotos = p.fotos || [];
  const files = Array.from(input.files || []);
  if (!files.length) return;
  const verklein = file => new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1280;
      const schaal = Math.min(1, max / Math.max(img.width, img.height, 1));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * schaal));
      c.height = Math.max(1, Math.round(img.height * schaal));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
  (async () => {
    let toegevoegd = 0;
    let mislukt = 0;
    for (const file of files) {
      if (p.fotos.length >= 8) { showToast('Maximaal 8 foto\'s per pand — verwijder er eerst een.'); break; }
      const dataUrl = await verklein(file);
      if (!dataUrl) { mislukt++; continue; }
      p.fotos.push(dataUrl);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // direct, mét quota-detectie
        toegevoegd++;
      } catch {
        p.fotos.pop();
        save();
        showToast('Browseropslag vol — gebruik foto-URL\'s of de fotos-map in plaats van uploads.');
        break;
      }
    }
    input.value = '';
    if (toegevoegd) renderCurrent();
    if (toegevoegd && !mislukt) showToast(`${toegevoegd} foto${toegevoegd === 1 ? '' : '\'s'} toegevoegd.`);
    else if (mislukt) showToast(`${toegevoegd ? toegevoegd + ' toegevoegd, ' : ''}${mislukt} bestand${mislukt === 1 ? '' : 'en'} kon${mislukt === 1 ? '' : 'den'} niet worden gelezen — gebruik JPG of PNG (geen HEIC).`);
  })();
}

function handleDocUpload(input) {
  const p = propertyById(input.dataset.id);
  if (!p) return;
  p.docs = p.docs || [];
  const files = Array.from(input.files || []);
  if (!files.length) return;
  const lees = file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  const TOEGESTAAN = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  (async () => {
    let toegevoegd = 0, teGroot = 0, mislukt = 0, verkeerdType = 0;
    for (const file of files) {
      if (file.type && TOEGESTAAN.indexOf(file.type) === -1) { verkeerdType++; continue; }
      if (file.size > 3 * 1024 * 1024) { teGroot++; continue; } // browseropslag is beperkt
      const dataUrl = await lees(file);
      if (!dataUrl) { mislukt++; continue; }
      const doc = { id: uid('doc'), name: file.name, file: dataUrl, done: true };
      p.docs.push(doc);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        toegevoegd++;
      } catch {
        p.docs.pop();
        save();
        showToast('Browseropslag vol — bewaar grote documenten als bestandspad/URL i.p.v. upload.');
        break;
      }
    }
    input.value = '';
    if (toegevoegd) renderCurrent();
    const delen = [];
    if (toegevoegd) delen.push(`${toegevoegd} document${toegevoegd === 1 ? '' : 'en'} toegevoegd`);
    if (teGroot) delen.push(`${teGroot} te groot (max 3 MB — gebruik een bestandspad)`);
    if (verkeerdType) delen.push(`${verkeerdType} geweigerd (alleen PDF, afbeelding, Office of tekst)`);
    if (mislukt) delen.push(`${mislukt} mislukt`);
    if (delen.length) showToast(delen.join(' · ') + '.');
  })();
}

/* ---------- Opslaan vanuit modals ---------- */
function handleModalSubmit(event) {
  const form = event.target;
  if (event.submitter && event.submitter.value !== 'save') return; // annuleren / sluiten
  const formId = form.getAttribute('id'); // let op: form.id wordt overschaduwd door <input name="id">
  const data = new FormData(form);
  const id = data.get('id');
  const str = key => String(data.get(key) || '').trim();
  const num = key => Number(data.get(key)) || 0;

  if (formId === 'activity-form') {
    const c = contactById(data.get('contactId'));
    if (c) {
      c.activities = c.activities || [];
      c.activities.push({ id: uid('act'), type: str('type'), date: data.get('date') || todayISO(), description: str('description'), nextFollowUp: data.get('nextFollowUp') || '' });
      showToast('Contactmoment vastgelegd.');
    }
  }

  if (formId === 'contact-form') {
    const obj = { id: id || uid('r'), type: str('type'), name: str('name'), contact: str('contact'), email: str('email'), phone: str('phone'), address: str('address'), note: str('note') };
    if (id) Object.assign(contactById(id), obj); else state.contacts.push(obj);
    showToast(`Relatie ${obj.name} opgeslagen.`);
  }

  if (formId === 'deal-form') {
    const oud = id ? dealById(id) : null;
    const base = {
      address: str('address'), city: str('city'), ptype: str('ptype'),
      status: str('status') || oud?.status || 'Lead',
      vraagprijs: num('vraagprijs'), makelaarId: data.get('makelaarId') || '', viewingDate: data.get('viewingDate') || '',
      source: str('source'), note: str('note'), verkoperEmail: str('verkoperEmail'),
      calc: Object.assign({}, oud?.calc, { koopsom: num('koopsom'), verbouwing: num('verbouwing'), verkoopprijs: num('verkoopprijs'), maanden: num('maanden') || 9 })
    };
    if (id) Object.assign(dealById(id), base);
    else state.deals.push(Object.assign({ id: uid('d'), ref: nextRef('AK', state.deals), createdAt: todayISO(), biedingen: [] }, base));
    showToast(`Aankoopkans ${base.address} opgeslagen.`);
  }

  if (formId === 'bid-form') {
    const d = dealById(data.get('dealId'));
    if (d) {
      d.biedingen = d.biedingen || [];
      d.biedingen.push({ id: uid('b'), date: data.get('date'), amount: num('amount'), validUntil: data.get('validUntil') || '', status: 'Uitgebracht', note: str('note') });
      if (d.status === 'Lead' || d.status === 'Bezichtiging') d.status = 'Bod uitgebracht';
      showToast(`Bod van ${fmtMoney(num('amount'))} geregistreerd op ${d.address}.`);
    }
  }

  if (formId === 'acquire-form') {
    const d = dealById(data.get('dealId'));
    if (d) {
      const property = {
        id: uid('pnd'), ref: nextRef('PND', state.properties),
        address: d.address, city: d.city, ptype: d.ptype, status: 'In ontwikkeling',
        label: '', taxatie: 0, taxatieDatum: '', vraagprijs: 0, teKoopSinds: '',
        purchase: { date: data.get('date'), koopsom: num('koopsom'), otb: num('otb'), notaris: num('notaris'), makelaar: num('makelaar'), overig: num('overig') },
        financing: (data.get('financierId') || '')
          ? { financierId: data.get('financierId'), bedrag: num('finBedrag'), rentePct: num('finRente'), einddatum: data.get('finEind') || '' }
          : { financierId: '', bedrag: 0, rentePct: 0, einddatum: '' },
        vasteLasten: Number(state.settings.vasteLasten) || 0, maandhuur: 0, huurder: '',
        sale: null, dealId: d.id,
        docs: DEFAULT_DOCS.map(name => ({ id: uid('doc'), name, done: false })),
        viewings: [], offers: [], fotos: (d.fotos || []).slice(), note: `Aangekocht via ${d.ref}. ${d.note || ''}`.trim()
      };
      state.properties.push(property);
      d.status = 'Aangekocht';
      let toastMsg = `${d.address} toegevoegd aan portfolio.`;
      if (data.get('maakProject') && Number(d.calc?.verbouwing) > 0) {
        state.projects.push({
          id: uid('prj'), ref: nextRef('PRJ', state.projects), name: 'Ontwikkeling ' + d.address, propertyId: property.id,
          status: 'Voorbereiding', startDate: data.get('date'), endDate: addDaysISO(data.get('date'), (Number(d.calc?.maanden) || 9) * 30),
          budget: Number(d.calc.verbouwing), note: `Budget uit calculatie ${d.ref}.`,
          phases: DEFAULT_PHASES.map(name => ({ id: uid('ph'), name, status: 'Te doen' })),
          opleverpunten: []
        });
        toastMsg += ` Ontwikkelproject aangemaakt met budget ${fmtMoney(d.calc.verbouwing)}.`;
      }
      save();
      logAudit('aangekocht', `${d.address} → portfolio`);
      showToast(toastMsg);
      setView('portfolio', 'property', property.id);
      return;
    }
  }

  if (formId === 'property-form') {
    const oudP = id ? propertyById(id) : null;
    const base = {
      address: str('address'), city: str('city'), ptype: str('ptype'),
      status: oudP?.status === 'Verkocht' ? 'Verkocht' : (str('status') || oudP?.status || 'In ontwikkeling'),
      label: data.get('label') || '', taxatie: num('taxatie'), taxatieDatum: data.get('taxatieDatum') || '',
      vraagprijs: num('vraagprijs'), teKoopSinds: data.get('teKoopSinds') || '',
      purchase: { date: data.get('purchaseDate') || '', koopsom: num('koopsom'), otb: num('otb'), notaris: num('notarisK'), makelaar: num('makelaarK'), overig: num('overig') },
      financing: { financierId: data.get('financierId') || '', bedrag: num('finBedrag'), rentePct: num('finRente'), einddatum: data.get('finEind') || '' },
      vasteLasten: num('vasteLasten'), maandhuur: num('maandhuur'), huurder: str('huurder'), note: str('note'),
      m2: num('m2'), kamers: num('kamers'), webOmschrijving: str('webOmschrijving'),
      huurIngang: data.get('huurIngang') || '', huurEind: data.get('huurEind') || '', borg: num('borg'), huurIndexPct: num('huurIndexPct'),
      huurderEmail: str('huurderEmail'),
      vveBijdrage: num('vveBijdrage'), vveReserve: num('vveReserve'), mjopDatum: data.get('mjopDatum') || '',
      doelLabel: data.get('doelLabel') || '', subsidieType: str('subsidieType'), subsidieBedrag: num('subsidieBedrag'), verduurzaming: str('verduurzaming')
    };
    if (base.status === 'Te koop' && !base.teKoopSinds) base.teKoopSinds = todayISO();
    if (id) {
      const p = propertyById(id);
      const oldSale = p.sale;
      Object.assign(p, base);
      p.sale = oldSale; // verkoopafronding alleen via sale-modal
    } else {
      state.properties.push(Object.assign({ id: uid('pnd'), ref: nextRef('PND', state.properties), sale: null, dealId: '', docs: DEFAULT_DOCS.map(name => ({ id: uid('doc'), name, done: false })), viewings: [], offers: [], fotos: [] }, base));
    }
    showToast(`Pand ${base.address} opgeslagen.`);
  }

  if (formId === 'project-form') {
    const base = {
      name: str('name'), propertyId: data.get('propertyId'), status: str('status'), budget: num('budget'),
      startDate: data.get('startDate') || '', endDate: data.get('endDate') || '', note: str('note'),
      publish: !!data.get('publish'),
      invest: { open: !!data.get('investOpen'), doelbedrag: num('doelbedrag'), minInleg: num('minInleg'), rendementPct: num('rendementPct'), looptijd: str('looptijd') }
    };
    if (id) Object.assign(projectById(id), base);
    else state.projects.push(Object.assign({ id: uid('prj'), ref: nextRef('PRJ', state.projects), phases: DEFAULT_PHASES.map(name => ({ id: uid('ph'), name, status: 'Te doen' })), opleverpunten: [], updates: [], investeerders: [] }, base));
    showToast(`Project "${base.name}" opgeslagen.`);
  }

  if (formId === 'cost-form') {
    const base = { propertyId: data.get('propertyId'), projectId: data.get('projectId') || '', contactId: data.get('contactId') || '', desc: str('desc'), category: str('category'), amount: num('amount'), btwPct: num('btwPct'), date: data.get('date'), status: str('status') };
    if (base.projectId) {
      const pr = projectById(base.projectId);
      if (pr) base.propertyId = pr.propertyId; // kosten volgen het pand van het project
    }
    if (id) Object.assign(state.costs.find(x => x.id === id), base);
    else state.costs.push(Object.assign({ id: uid('k') }, base));
    showToast('Kostenpost opgeslagen.');
  }

  if (formId === 'viewing-form') {
    const p = propertyById(data.get('propertyId'));
    if (p) {
      p.viewings = p.viewings || [];
      p.viewings.push({ id: uid('v'), date: data.get('date'), name: str('name'), note: str('note') });
      showToast('Bezichtiging geregistreerd.');
    }
  }

  if (formId === 'offer-form') {
    const p = propertyById(data.get('propertyId'));
    if (p) {
      p.offers = p.offers || [];
      p.offers.push({ id: uid('o'), date: data.get('date'), name: str('name'), amount: num('amount'), status: 'Ontvangen', note: str('note') });
      showToast(`Bod van ${fmtMoney(num('amount'))} geregistreerd — vergeet niet te reageren.`);
    }
  }

  if (formId === 'sale-form') {
    const p = propertyById(data.get('propertyId'));
    if (p) {
      p.sale = { verkoopprijs: num('verkoopprijs'), date: data.get('date'), kosten: num('kosten'), koper: str('koper') };
      p.status = 'Verkocht';
      (p.offers || []).forEach(o => { if (o.status === 'Ontvangen') o.status = 'Afgewezen'; });
      const fin = propertyFinance(p);
      save();
      logAudit('verkocht', `${p.address} voor ${fmtMoney(p.sale.verkoopprijs)}`);
      showToast(`${p.address} verkocht voor ${fmtMoney(p.sale.verkoopprijs)} — winst ${fmtMoney(fin.winst)} (${fmtNum(fin.roi, 1)}% ROI).`);
      setView('sales');
      return;
    }
  }

  if (formId === 'plan-form') {
    const base = { date: data.get('date'), type: str('type'), title: str('title'), who: str('who'), ref: data.get('ref') || '', recurrence: data.get('recurrence') || '', recurrenceEnd: data.get('recurrenceEnd') || '' };
    if (id) Object.assign(state.planning.find(x => x.id === id), base);
    else state.planning.push(Object.assign({ id: uid('pl') }, base));
    showToast('Planning opgeslagen.');
  }

  if (formId === 'ad-form') {
    const p = propertyById(data.get('propertyId'));
    if (p) {
      p.advertenties = p.advertenties || [];
      const base = { kanaal: str('kanaal'), doel: str('doel'), status: str('status'), datum: data.get('datum') || '', kosten: num('kosten'), url: str('url') };
      if (id) { const a = p.advertenties.find(x => x.id === id); if (a) Object.assign(a, base); }
      else p.advertenties.push(Object.assign({ id: uid('ad') }, base));
      showToast(`Advertentie (${base.kanaal}) opgeslagen voor ${p.address}.`);
    }
  }

  if (formId === 'invoice-form') {
    const base = { soort: str('soort'), propertyId: data.get('propertyId') || '', debiteur: str('debiteur'), desc: str('desc'), amount: num('amount'), date: data.get('date'), due: data.get('due') || '', status: str('status') };
    if (id) Object.assign(state.invoices.find(x => x.id === id), base);
    else state.invoices.push(Object.assign({ id: uid('f') }, base));
    showToast('Factuur opgeslagen.');
  }

  if (formId === 'loan-form') {
    const base = { propertyId: data.get('propertyId'), financierId: data.get('financierId') || '', soort: str('soort'), bedrag: num('bedrag'), rentePct: num('rentePct'), aflossing: num('aflossing'), start: data.get('start') || '', eind: data.get('eind') || '' };
    if (id) Object.assign(state.loans.find(x => x.id === id), base);
    else state.loans.push(Object.assign({ id: uid('l') }, base));
    showToast('Lening opgeslagen.');
  }

  if (formId === 'payout-form') {
    const pr = projectById(data.get('projectId'));
    const inv = pr && (pr.investeerders || []).find(x => x.id === data.get('investorId'));
    if (inv) {
      inv.uitkeringen = inv.uitkeringen || [];
      const base = { kind: str('kind'), amount: num('amount'), date: data.get('date'), status: str('status'), note: str('note') };
      if (id) { const u = inv.uitkeringen.find(x => x.id === id); if (u) Object.assign(u, base); }
      else inv.uitkeringen.push(Object.assign({ id: uid('pay') }, base));
      if (!id && base.status === 'Uitbetaald' && inv.email && window.HCloud) {
        HCloud.notify({ to: inv.email, subject: `Uitkering van HomeINN — ${pr.name}`, html: `<p>Beste ${esc(inv.naam)},</p><p>Er is een uitkering geregistreerd voor je investering in <strong>${esc(pr.name)}</strong>:</p><p>${esc(base.kind)} · <strong>${fmtMoney(base.amount)}</strong> · ${fmtDate(base.date)}</p><p>Bekijk je overzicht in het investeerdersportaal.</p><p>Met vriendelijke groet,<br>HomeINN</p>` });
      }
      showToast('Uitkering opgeslagen.');
    }
  }

  if (formId === 'account-form') {
    const base = { naam: str('naam'), type: str('type'), saldo: num('saldo'), updatedAt: todayISO() };
    if (id) Object.assign(state.accounts.find(x => x.id === id), base);
    else state.accounts.push(Object.assign({ id: uid('acc') }, base));
    showToast(`Rekening "${base.naam}" opgeslagen.`);
  }

  if (formId === 'contract-form') {
    const base = {
      type: str('type'), positie: str('positie'), propertyId: data.get('propertyId') || '', projectId: data.get('projectId') || '',
      contactId: data.get('contactId') || '', partijNaam: str('partijNaam'), partijAdres: str('partijAdres'), partijEmail: str('partijEmail'),
      bedrag: num('bedrag'), datum: data.get('datum') || todayISO(), ingangsdatum: data.get('ingangsdatum') || '',
      looptijd: str('looptijd'), rendementPct: num('rendementPct'), note: str('note')
    };
    if (id) Object.assign(state.contracten.find(x => x.id === id), base);
    else state.contracten.push(Object.assign({ id: uid('c'), ref: nextRef('CON', state.contracten), status: 'Concept', createdAt: todayISO() }, base));
    showToast(`${base.type} opgeslagen.`);
  }

  if (formId === 'insurance-form') {
    const p = propertyById(data.get('propertyId'));
    if (p) {
      p.verzekeringen = p.verzekeringen || [];
      const base = { type: str('type'), verzekeraar: str('verzekeraar'), polis: str('polis'), premie: num('premie'), start: data.get('start') || '', eind: data.get('eind') || '' };
      if (id) { const v = p.verzekeringen.find(x => x.id === id); if (v) Object.assign(v, base); }
      else p.verzekeringen.push(Object.assign({ id: uid('vz') }, base));
      showToast(`Verzekering (${base.type}) opgeslagen.`);
    }
  }

  if (FORM_LABEL[formId]) logAudit(id ? 'bijgewerkt' : 'aangemaakt', FORM_LABEL[formId]);
  rerender();
}

/* ---------- Print (dealcalculatie voor financier) ---------- */
function buildCalcPrintDoc(title, subtitle, c) {
  const s = state.settings;
  return `
    <header class="doc-head">
      <div>
        <img src="assets/logo-dark.png?v=20260614" alt="" class="doc-logo">
        <h1>INVESTERINGSCALCULATIE</h1>
        <p class="doc-number">${esc(title)} · ${fmtDate(todayISO())}</p>
      </div>
      <div class="doc-company">
        <strong>${esc(s.companyName)}</strong><br>
        ${esc(s.address)}<br>
        ${esc(s.email)} · ${esc(s.phone)}<br>
        KvK ${esc(s.kvk)}
      </div>
    </header>
    ${subtitle ? `<p class="doc-note">${esc(subtitle)}</p>` : ''}
    <table class="doc-lines">
      <thead><tr><th>Post</th><th>Bedrag</th></tr></thead>
      <tbody>
        <tr><td>Koopsom</td><td>${fmtMoney(c.koopsom)}</td></tr>
        <tr><td>Overdrachtsbelasting</td><td>${fmtMoney(c.otb)}</td></tr>
        <tr><td>Notaris &amp; recherche</td><td>${fmtMoney(c.notaris)}</td></tr>
        <tr><td>Aankoopmakelaar</td><td>${fmtMoney(c.makelaar)}</td></tr>
        <tr><td>Verbouwing / ontwikkeling</td><td>${fmtMoney(c.verbouwing)}</td></tr>
        <tr><td>Rente financiering (${fmtNum(c.maanden, 0)} mnd over ${fmtMoney(c.financiering)})</td><td>${fmtMoney(c.rente)}</td></tr>
        <tr><td>Vaste lasten (${fmtNum(c.maanden, 0)} mnd)</td><td>${fmtMoney(c.lasten)}</td></tr>
      </tbody>
    </table>
    <table class="doc-totals">
      <tr><td>Totale investering</td><td>${fmtMoney(c.investering)}</td></tr>
      <tr><td>Financiering</td><td>${fmtMoney(c.financiering)}</td></tr>
      <tr><td>Eigen inbreng</td><td>${fmtMoney(c.eigenGeld)}</td></tr>
      <tr><td>Verwachte verkoopopbrengst (na kosten)</td><td>${fmtMoney(c.opbrengst)}</td></tr>
      <tr class="grand"><td>Verwacht resultaat</td><td>${fmtMoney(c.winst)} · ${fmtNum(c.roi, 1)}% ROI</td></tr>
    </table>
    <footer class="doc-footer">Indicatieve calculatie, opgesteld met HomeINN OS. Aan deze berekening kunnen geen rechten worden ontleend.</footer>`;
}

function printDeal(id) {
  const d = dealById(id);
  if (!d) return;
  $('#print-area').innerHTML = buildCalcPrintDoc(`${d.ref} — ${d.address}, ${d.city}`, d.note, computeDeal(d.calc));
  window.print();
}

function printCalcForm() {
  const input = readCalcForm();
  const title = input.address ? `${input.address}, ${input.city}` : 'Nieuwe calculatie';
  $('#print-area').innerHTML = buildCalcPrintDoc(title, '', computeDeal(input));
  window.print();
}

/* ---------- Export / backup ---------- */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function toCSV(rows) {
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n');
}

const csvNum = n => String((Number(n) || 0).toFixed(2)).replace('.', ',');

function exportCurrentView() {
  const t = todayISO();
  let rows, name;
  switch (currentView) {
    case 'deals':
      rows = [['Referentie', 'Adres', 'Plaats', 'Status', 'Vraagprijs', 'Koopsom/bod', 'Verbouwing', 'Verkoopprijs', 'Investering', 'Winst', 'ROI %']];
      state.deals.forEach(d => { const c = computeDeal(d.calc); rows.push([d.ref, d.address, d.city, d.status, csvNum(d.vraagprijs), csvNum(c.koopsom), csvNum(c.verbouwing), csvNum(c.verkoopprijs), csvNum(c.investering), csvNum(c.winst), csvNum(c.roi)]); });
      name = 'aankoopkansen'; break;
    case 'portfolio': case 'sales':
      rows = [['Referentie', 'Adres', 'Status', 'Aangekocht', 'Koopsom', 'Aankoop totaal', 'Ontwikkeld', 'Houdkosten', 'Investering', 'Waarde/verkoop', 'Winst', 'ROI %']];
      state.properties.forEach(p => { const fin = propertyFinance(p); rows.push([p.ref, p.address, p.status, p.purchase?.date, csvNum(p.purchase?.koopsom), csvNum(fin.aankoop), csvNum(fin.ontwikkeld), csvNum(fin.houdkosten), csvNum(fin.investering), csvNum(fin.waarde), fin.winst === null ? '' : csvNum(fin.winst), fin.roi === null ? '' : csvNum(fin.roi)]); });
      name = 'portfolio'; break;
    case 'projects':
      rows = [['Referentie', 'Project', 'Pand', 'Status', 'Start', 'Oplevering', 'Budget', 'Realisatie', 'Verschil']];
      state.projects.forEach(pr => { const a = projectActual(pr); rows.push([pr.ref, pr.name, propertyLabel(pr.propertyId), pr.status, pr.startDate, pr.endDate, csvNum(pr.budget), csvNum(a), csvNum((pr.budget || 0) - a)]); });
      name = 'projecten'; break;
    case 'costs':
      rows = [['Datum', 'Pand', 'Project', 'Leverancier', 'Omschrijving', 'Categorie', 'Bedrag', 'Status']];
      state.costs.forEach(k => rows.push([k.date, propertyLabel(k.propertyId), projectById(k.projectId)?.name || '', contactName(k.contactId), k.desc, k.category, csvNum(k.amount), k.status]));
      name = 'kosten'; break;
    case 'planning':
      rows = [['Datum', 'Type', 'Omschrijving', 'Wie', 'Betreft']];
      state.planning.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(pl => rows.push([pl.date, pl.type, pl.title, pl.who, refLabel(pl.ref)]));
      name = 'planning'; break;
    case 'relations':
      rows = [['Naam', 'Type', 'Contactpersoon', 'Email', 'Telefoon', 'Adres', 'Notitie']];
      state.contacts.forEach(c => rows.push([c.name, c.type, c.contact, c.email, c.phone, c.address, c.note]));
      name = 'relaties'; break;
    case 'inbox':
      rows = [['Datum', 'Type', 'Naam', 'Contact', 'E-mail', 'Telefoon', 'Portfolio', 'Betreft', 'Bericht', 'Status']];
      loadInbox().forEach(l => rows.push([l.date, l.type, l.name, l.contact, l.email, l.phone, l.portfolio, l.subject, l.message, l.handled ? 'Afgehandeld' : 'Nieuw']));
      name = 'aanvragen'; break;
    case 'money':
      rows = [['Datum', 'Soort', 'Pand', 'Aan', 'Omschrijving', 'Bedrag', 'Vervaldatum', 'Status']];
      state.invoices.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(f => rows.push([f.date, f.soort, propertyLabel(f.propertyId), f.debiteur, f.desc, csvNum(f.amount), f.due, f.status]));
      name = 'geld-in'; break;
    case 'finance':
      rows = [['Pand', 'Soort', 'Financier', 'Hoofdsom', 'Rente %', 'Aflossing/mnd', 'Startdatum', 'Vervaldatum']];
      state.loans.forEach(l => rows.push([propertyLabel(l.propertyId), l.soort, contactName(l.financierId), csvNum(l.bedrag), csvNum(l.rentePct), csvNum(l.aflossing), l.start, l.eind]));
      name = 'financiering'; break;
    case 'ads':
      rows = [['Pand', 'Kanaal', 'Doel', 'Status', 'Geplaatst', 'Kosten', 'Link']];
      state.properties.forEach(p => (p.advertenties || []).forEach(a => rows.push([p.address, a.kanaal, a.doel, a.status, a.datum, csvNum(a.kosten), a.url])));
      name = 'advertenties'; break;
    case 'liquidity': {
      rows = [['Rekening', 'Type', 'Saldo', 'Bijgewerkt']];
      state.accounts.forEach(a => rows.push([a.naam, a.type, csvNum(a.saldo), a.updatedAt]));
      rows.push([]);
      rows.push(['Saldoprognose 6 maanden']);
      rows.push(['Maand', 'Huur in', 'Uit', 'Netto', 'Verwacht saldo']);
      const lr = reportData(); const afl = state.loans.reduce((s, l) => s + (Number(l.aflossing) || 0), 0);
      let lb = state.accounts.reduce((s, a) => s + (Number(a.saldo) || 0), 0);
      lr.months.forEach(m => { const uit = m.vasteUit + m.geplandUit + afl; const net = m.huurIn - uit; lb += net; rows.push([m.label, csvNum(m.huurIn), csvNum(-uit), csvNum(net), csvNum(lb)]); });
      name = 'liquiditeit'; break;
    }
    case 'investors': {
      const inv = investorReportData();
      const jr = new Date().getFullYear();
      rows = [['Investeerder', 'E-mail', 'Totaal inleg', 'Afgesproken rendement %', 'Netto IRR %', 'Multiple (MOIC)', 'Verwacht per jaar', `Uitbetaald ${jr - 2}`, `Uitbetaald ${jr - 1}`, `Uitbetaald ${jr}`, 'Totaal uitbetaald', 'Wwft', 'Projecten']];
      inv.forEach(e => rows.push([e.naam, e.email, csvNum(e.inleg), csvNum(e.rendementPct), e.irr === null ? '' : csvNum(e.irr), e.moic === null ? '' : csvNum(e.moic), csvNum(e.verwachtJaar), csvNum(e.uitbetaaldPerJaar[jr - 2] || 0), csvNum(e.uitbetaaldPerJaar[jr - 1] || 0), csvNum(e.uitbetaaldPerJaar[jr] || 0), csvNum(e.uitbetaaldTotaal), e.wwft ? 'ja' : 'nee', e.projecten.map(p => p.project).join(' / ')]));
      name = 'investeerders-ledger'; break;
    }
    case 'contracts':
      rows = [['Referentie', 'Datum', 'Type', 'Betreft', 'Wederpartij', 'Bedrag', 'Looptijd', 'Status']];
      state.contracten.forEach(c => rows.push([c.ref, c.datum, c.type, propertyLabel(c.propertyId) || projectById(c.projectId)?.name || '', (contactById(c.contactId)?.name) || c.partijNaam, csvNum(c.bedrag), c.looptijd, c.status]));
      name = 'contracten'; break;
    case 'reports': {
      const r = reportData();
      rows = [['Rapportage HomeINN', t]];
      rows.push([]);
      rows.push(['Verwacht/gerealiseerd resultaat per pand']);
      rows.push(['Pand', 'Status', 'Investering', 'Waarde/verkoop', 'Winst', 'ROI %']);
      r.fins.forEach(({ p, f }) => rows.push([p.address, p.status, csvNum(f.investVerwacht), csvNum(f.waarde), f.winst === null ? '' : csvNum(f.winst), f.roi === null ? '' : csvNum(f.roi)]));
      rows.push([]);
      rows.push(['Cashflow-prognose 6 maanden']);
      rows.push(['Maand', 'Huur in', 'Rente+lasten', 'Geplande kosten', 'Netto', 'Aandachtspunten']);
      r.months.forEach(m => rows.push([m.label, csvNum(m.huurIn), csvNum(-m.vasteUit), csvNum(-m.geplandUit), csvNum(m.netto), m.events.join(' / ')]));
      name = 'rapportage'; break;
    }
    default:
      downloadBackup();
      return;
  }
  downloadFile(`homeinn-${name}-${t}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
  showToast(`Export "${name}" gedownload als CSV.`);
}

/* Boekhoud-export: facturen (Factuur ontvangen + Betaald) klaar voor je boekhouder/boekhoudpakket.
   Aanname: het ingevoerde bedrag is incl. 21% btw; excl. en btw worden teruggerekend. */
const GROOTBOEK = {
  'Aannemer': '4500 Onderhoud & renovatie',
  'Installaties': '4510 Installaties',
  'Materiaal': '4520 Materialen',
  'Architect & advies': '4310 Advieskosten',
  'Leges & vergunning': '4320 Leges & vergunningen',
  'Styling & oplevering': '4530 Styling & oplevering',
  'Overig': '4900 Diverse projectkosten'
};

function exportBoekhouding() {
  const facturen = state.costs
    .filter(k => k.status === 'Factuur ontvangen' || k.status === 'Betaald')
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (!facturen.length) { showToast('Nog geen facturen om te exporteren (status Factuur ontvangen of Betaald).'); return; }
  const rows = [['Boekstukdatum', 'Boekstuknr', 'Leverancier', 'Omschrijving', 'Grootboek', 'Pand', 'Project', 'Bedrag excl. btw', 'Btw-tarief', 'Btw-bedrag', 'Bedrag incl. btw', 'Status']];
  let totExcl = 0, totBtw = 0, totIncl = 0;
  facturen.forEach(k => {
    const pct = (k.btwPct === 0 || k.btwPct) ? Number(k.btwPct) : 21; // standaard 21% voor bestaande posten
    const incl = Number(k.amount) || 0;
    const excl = pct ? incl / (1 + pct / 100) : incl;
    const btw = incl - excl;
    totExcl += excl; totBtw += btw; totIncl += incl;
    rows.push([
      k.date, (k.id || '').toUpperCase(), contactName(k.contactId), k.desc,
      GROOTBOEK[k.category] || k.category, propertyLabel(k.propertyId), projectById(k.projectId)?.name || '',
      csvNum(excl), pct + '%', csvNum(btw), csvNum(incl), k.status
    ]);
  });
  rows.push([]);
  rows.push(['', '', '', '', '', '', 'TOTAAL', csvNum(totExcl), '', csvNum(totBtw), csvNum(totIncl), '']);
  downloadFile(`homeinn-boekhouding-${todayISO()}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
  showToast(`Boekhoud-export: ${facturen.length} facturen · ${fmtMoney(Math.round(totIncl))} incl. btw, btw per regel teruggerekend op het ingestelde tarief.`);
}

/* Planning exporteren als iCal (.ics) — importeerbaar in Google/Outlook/Apple Agenda. */
function exportPlanningAsIcal() {
  const icalEsc = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const freq = { weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3' };
  const stamp = todayISO().replace(/-/g, '') + 'T000000Z';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HomeINN OS//NL', 'CALSCALE:GREGORIAN'];
  state.planning.forEach(pl => {
    const d = (pl.date || '').replace(/-/g, '');
    if (!d) return;
    ics.push('BEGIN:VEVENT', 'UID:' + pl.id + '@homeinn-os', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'SUMMARY:' + icalEsc(pl.type + ': ' + pl.title));
    const desc = [pl.who, pl.ref ? refLabel(pl.ref) : ''].filter(Boolean).join(' · ');
    if (desc) ics.push('DESCRIPTION:' + icalEsc(desc));
    if (pl.recurrence && freq[pl.recurrence]) {
      let rrule = 'RRULE:' + freq[pl.recurrence];
      if (pl.recurrenceEnd) rrule += ';UNTIL=' + pl.recurrenceEnd.replace(/-/g, '');
      ics.push(rrule);
    }
    ics.push('END:VEVENT');
  });
  ics.push('END:VCALENDAR');
  downloadFile('homeinn-planning.ics', ics.join('\r\n'), 'text/calendar;charset=utf-8');
  showToast('Agenda geëxporteerd (.ics) — importeer in Google, Outlook of Apple Agenda.');
}

/* Aanbod publiceren: panden Te koop / Onder bod → aanbod.json voor de website */
function buildAanbodJson() {
  const aanbod = state.properties
    .filter(p => p.status === 'Te koop' || p.status === 'Onder bod')
    .map(p => ({
      id: p.ref, adres: p.address, plaats: p.city, type: p.ptype, status: p.status,
      prijs: Number(p.vraagprijs) || 0, label: p.label || '',
      m2: Number(p.m2) || 0, kamers: Number(p.kamers) || 0,
      omschrijving: p.webOmschrijving || '',
      fotos: p.fotos || []
    }));
  const verkocht = state.properties
    .filter(p => p.status === 'Verkocht')
    .slice(-6)
    .map(p => ({ adres: p.address, plaats: p.city, type: p.ptype, label: p.label || '' }));
  const projecten = state.projects.filter(pr => pr.publish).map(pr => {
    const p = propertyById(pr.propertyId) || {};
    const phases = pr.phases || [];
    return {
      id: pr.ref, titel: pr.name, adres: p.address || '', plaats: p.city || '', type: p.ptype || '',
      status: pr.status,
      voortgang: phases.length ? Math.round(phases.filter(f => f.status === 'Klaar').length / phases.length * 100) : 0,
      start: pr.startDate || '', oplevering: pr.endDate || '',
      omschrijving: p.webOmschrijving || '', // bewust GEEN fallback op pr.note: dat is intern
      fotos: (pr.fotos && pr.fotos.length) ? pr.fotos : (p.fotos || []),
      updates: (pr.updates || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(u => ({ datum: u.date, tekst: u.text })),
      investering: pr.invest?.open ? {
        doelbedrag: Number(pr.invest.doelbedrag) || 0,
        opgehaald: (pr.investeerders || []).reduce((s, i) => s + (Number(i.bedrag) || 0), 0),
        minInleg: Number(pr.invest.minInleg) || 0,
        rendementPct: Number(pr.invest.rendementPct) || 0,
        looptijd: pr.invest.looptijd || ''
      } : null
    };
  });
  return JSON.stringify({ bijgewerkt: todayISO(), aanbod, projecten, verkocht }, null, 2);
}

function publishAanbod() {
  const teKoop = state.properties.filter(p => p.status === 'Te koop' || p.status === 'Onder bod');
  const zonderInfo = teKoop.filter(p => !p.webOmschrijving || !Number(p.vraagprijs));
  const projZonder = state.projects.filter(pr => pr.publish && !propertyById(pr.propertyId)?.webOmschrijving);
  const tips = [...zonderInfo.map(p => p.address), ...projZonder.map(pr => pr.name)];
  if (tips.length) showToast(`Tip: ${[...new Set(tips)].join(', ')} mist nog een vraagprijs of website-omschrijving (Pand bewerken → Website-presentatie).`);
  downloadFile('aanbod.json', buildAanbodJson(), 'application/json');
  const pubProjecten = state.projects.filter(pr => pr.publish).length;
  setTimeout(() => showToast(`aanbod.json gedownload: ${teKoop.length} woning${teKoop.length === 1 ? '' : 'en'} te koop + ${pubProjecten} project${pubProjecten === 1 ? '' : 'en'} om te volgen. Vervang het bestand in je software-map en op je hosting.`), zonderInfo.length ? 3700 : 0);
}

function downloadBackup() {
  state.lastBackup = todayISO();
  save();
  downloadFile(`homeinn-backup-${todayISO()}.json`, JSON.stringify(state, null, 2), 'application/json');
  showToast('Backup gedownload. Bewaar dit bestand veilig.');
}

/* ---------- Zoeken ---------- */
function renderSearch(query) {
  const box = $('#search-results');
  const q = query.trim().toLowerCase();
  if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
  const hit = txt => String(txt || '').toLowerCase().includes(q);
  const results = [];
  state.properties.filter(p => hit(p.address) || hit(p.ref) || hit(p.city)).slice(0, 4)
    .forEach(p => results.push({ group: 'Pand', label: p.address, sub: p.status, go: 'pand:' + p.id }));
  state.deals.filter(d => hit(d.address) || hit(d.ref)).slice(0, 4)
    .forEach(d => results.push({ group: 'Kans', label: d.address, sub: d.status, go: 'deal:' + d.id }));
  state.projects.filter(pr => hit(pr.name) || hit(pr.ref) || hit(propertyLabel(pr.propertyId))).slice(0, 3)
    .forEach(pr => results.push({ group: 'Project', label: pr.name, sub: propertyLabel(pr.propertyId), go: 'project:' + pr.id }));
  state.contacts.filter(c => hit(c.name) || hit(c.contact) || hit(c.email)).slice(0, 3)
    .forEach(c => results.push({ group: 'Relatie', label: c.name, sub: c.type, go: 'relations' }));
  state.costs.filter(k => hit(k.desc)).slice(0, 3)
    .forEach(k => results.push({ group: 'Kosten', label: k.desc, sub: propertyLabel(k.propertyId), go: 'costs' }));
  box.innerHTML = results.length ? results.slice(0, 10).map(r => `
    <button type="button" data-action="search-go" data-go="${esc(r.go)}">
      <span class="badge gray">${r.group}</span> <strong>${esc(r.label)}</strong> <span class="sub">${esc(r.sub)}</span>
    </button>`).join('') : '<p class="empty">Geen resultaten.</p>';
  box.hidden = false;
}

/* ---------- Cmd-K command palette ---------- */
const CMDK_RECENT_KEY = 'homeinn-cmdk-recent';
let cmdkResults = [], cmdkIdx = 0;

function loadCmdkRecent() { try { return JSON.parse(localStorage.getItem(CMDK_RECENT_KEY) || '[]'); } catch (e) { return []; } }
function pushCmdkRecent(label) {
  let r = loadCmdkRecent().filter(x => x !== label);
  r.unshift(label); r = r.slice(0, 5);
  try { localStorage.setItem(CMDK_RECENT_KEY, JSON.stringify(r)); } catch (e) { /* quota */ }
}

function cmdkActions() {
  const A = [];
  Object.keys(VIEWS).forEach(v => { if (v !== 'landing') A.push({ label: 'Ga naar ' + VIEWS[v], cat: 'Navigatie', ic: '→', run: () => setView(v) }); });
  A.push(
    { label: 'Nieuwe aankoopkans', cat: 'Aanmaken', ic: '＋', run: () => openDealModal() },
    { label: 'Pand toevoegen', cat: 'Aanmaken', ic: '＋', run: () => openPropertyModal() },
    { label: 'Nieuw ontwikkelproject', cat: 'Aanmaken', ic: '＋', run: () => openProjectModal() },
    { label: 'Nieuwe kostenpost', cat: 'Aanmaken', ic: '＋', run: () => openCostModal() },
    { label: 'Factuur opstellen', cat: 'Aanmaken', ic: '＋', run: () => openInvoiceModal() },
    { label: 'Lening toevoegen', cat: 'Aanmaken', ic: '＋', run: () => openLoanModal() },
    { label: 'Bankrekening toevoegen', cat: 'Aanmaken', ic: '＋', run: () => openAccountModal() },
    { label: 'Nieuwe relatie', cat: 'Aanmaken', ic: '＋', run: () => openContactModal() },
    { label: 'Planning toevoegen', cat: 'Aanmaken', ic: '＋', run: () => openPlanModal() },
    { label: 'Nieuw contract', cat: 'Aanmaken', ic: '＋', run: () => openContractModal() },
    { label: 'Backup downloaden', cat: 'Acties', ic: '⤓', run: () => downloadBackup() },
    { label: 'Huidige weergave exporteren', cat: 'Acties', ic: '⤓', run: () => exportCurrentView() },
    { label: 'Cloud synchroniseren', cat: 'Acties', ic: '☁', run: () => { const b = document.querySelector('[data-action="cloud-sync"]'); b ? b.click() : setView('settings'); } }
  );
  return A;
}

function cmdkEntities(q) {
  const hit = txt => String(txt || '').toLowerCase().includes(q);
  const r = [];
  state.properties.filter(p => hit(p.address) || hit(p.ref) || hit(p.city)).slice(0, 5)
    .forEach(p => r.push({ label: p.address, cat: 'Pand', ic: '🏠', sub: p.status, run: () => goTo('pand:' + p.id) }));
  state.deals.filter(d => hit(d.address) || hit(d.ref)).slice(0, 5)
    .forEach(d => r.push({ label: d.address, cat: 'Kans', ic: '🔑', sub: d.status, run: () => goTo('deal:' + d.id) }));
  state.projects.filter(pr => hit(pr.name) || hit(pr.ref)).slice(0, 4)
    .forEach(pr => r.push({ label: pr.name, cat: 'Project', ic: '🏗️', sub: propertyLabel(pr.propertyId), run: () => goTo('project:' + pr.id) }));
  state.contacts.filter(c => hit(c.name) || hit(c.email) || hit(c.contact)).slice(0, 4)
    .forEach(c => r.push({ label: c.name, cat: 'Relatie', ic: '👤', sub: c.type, run: () => goTo('relations') }));
  state.costs.filter(k => hit(k.desc)).slice(0, 3)
    .forEach(k => r.push({ label: k.desc, cat: 'Kosten', ic: '🧾', sub: propertyLabel(k.propertyId), run: () => goTo('costs') }));
  return r;
}

function cmdkCompute(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    const acts = cmdkActions();
    const recents = loadCmdkRecent().map(lbl => acts.find(a => a.label === lbl)).filter(Boolean);
    const rest = acts.filter(a => !recents.includes(a));
    return recents.concat(rest).slice(0, 12);
  }
  const ents = cmdkEntities(q);
  const acts = cmdkActions().filter(a => a.label.toLowerCase().includes(q));
  return ents.concat(acts).slice(0, 16);
}

function cmdkRender() {
  const list = $('#cmdk-list'); if (!list) return;
  cmdkResults = cmdkCompute($('#cmdk-input').value);
  if (cmdkIdx >= cmdkResults.length) cmdkIdx = 0;
  if (!cmdkResults.length) { list.innerHTML = '<p class="cmdk-empty">Niets gevonden. Probeer een adres, naam of een actie zoals “nieuwe kostenpost”.</p>'; return; }
  list.innerHTML = cmdkResults.map((it, i) => `
    <div class="cmdk-item ${i === cmdkIdx ? 'active' : ''}" data-cmdk="${i}">
      <span class="cmdk-ic">${it.ic || '•'}</span><span>${esc(it.label)}</span>
      <span class="cmdk-sub">${esc(it.sub || it.cat || '')}</span>
    </div>`).join('');
  const active = list.querySelector('.cmdk-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function openCmdK() {
  const dlg = $('#cmdk'); if (!dlg || dlg.open) return;
  $('#cmdk-input').value = ''; cmdkIdx = 0; cmdkRender();
  dlg.showModal();
  setTimeout(() => $('#cmdk-input').focus(), 20);
}

function cmdkRun(i) {
  const it = cmdkResults[i]; if (!it) return;
  if (it.cat === 'Navigatie' || it.cat === 'Aanmaken' || it.cat === 'Acties') pushCmdkRecent(it.label);
  $('#cmdk').close();
  try { it.run(); } catch (e) { showToast('Actie mislukt: ' + (e.message || e)); }
}

/* ---------- Toast ---------- */
let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

/* ---------- Acties (event delegation) ---------- */
function confirmDel(msg) { return window.confirm(msg); }

document.addEventListener('click', event => {
  const el = event.target.closest('[data-action]');
  if (!el) {
    if (!event.target.closest('.search')) $('#search-results').hidden = true;
    return;
  }
  const { action, id, item, phase, date, go } = el.dataset;

  switch (action) {
    // Aankoop
    case 'open-deal': setView('deals', 'deal', id); break;
    case 'back-to-deals': setView('deals'); break;
    case 'edit-deal': openDealModal(id); break;
    case 'del-deal':
      if (confirmDel('Aankoopkans definitief verwijderen?')) { state.deals = state.deals.filter(x => x.id !== id); rerender(); showToast('Aankoopkans verwijderd.'); }
      break;
    case 'bid-for-deal': openBidModal(id); break;
    case 'del-bid': {
      const d = dealById(id);
      d.biedingen = (d.biedingen || []).filter(b => b.id !== item);
      rerender();
      break;
    }
    case 'acquire-deal': openAcquireModal(id); break;
    case 'drop-deal': {
      const d = dealById(id);
      if (confirmDel(`Afhaken bij ${d.address}? De kans gaat naar het archief.`)) { d.status = 'Afgehaakt'; rerender(); showToast('Kans gearchiveerd als afgehaakt.'); }
      break;
    }
    case 'print-deal': printDeal(id); break;
    case 'cmp-toggle':
      if (compareSet.has(id)) compareSet.delete(id); else compareSet.add(id);
      renderDeals();
      break;
    case 'open-compare': renderComparison(); break;
    case 'clear-compare': compareSet.clear(); renderDeals(); break;
    case 'close-compare': $('#compare-modal').close(); break;
    case 'funnel-jump': {
      const idx = DEAL_STAGES.indexOf(el.dataset.stage);
      const col = document.querySelectorAll('#deal-board .lead-column')[idx];
      if (col) { col.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); col.classList.add('flash'); setTimeout(() => col.classList.remove('flash'), 1200); }
      break;
    }
    // Portfolio
    case 'open-property': setView('portfolio', 'property', id); break;
    case 'back-to-portfolio': setView('portfolio'); break;
    case 'edit-property': openPropertyModal(id); break;
    case 'del-property': {
      const p = propertyById(id);
      if (!p) break;
      const linked = state.projects.some(pr => pr.propertyId === id) || state.costs.some(k => k.propertyId === id);
      if (linked) { showToast(`${p.address} heeft gekoppelde projecten of kosten — verwijder die eerst.`); break; }
      if (confirmDel(`Pand "${p.address}" verwijderen?`)) { state.properties = state.properties.filter(x => x.id !== id); rerender(); showToast('Pand verwijderd.'); }
      break;
    }
    case 'toggle-doc': {
      const p = propertyById(id);
      if (!p) break;
      const doc = (p.docs || []).find(x => x.id === item);
      if (doc) { doc.done = !doc.done; rerender(); }
      break;
    }
    case 'del-doc': {
      const p = propertyById(id);
      if (!p) break;
      p.docs = (p.docs || []).filter(x => x.id !== item); rerender();
      break;
    }
    case 'new-project-for': openProjectModal(null, id); break;
    case 'new-cost-for': openCostModal(null, { propertyId: id }); break;
    case 'new-cost-for-project': openCostModal(null, { projectId: id }); break;
    case 'viewing-for': openViewingModal(id); break;
    case 'offer-for': openOfferModal(id); break;
    case 'del-offer': {
      const p = propertyById(id);
      if (!p) break;
      p.offers = (p.offers || []).filter(o => o.id !== item); rerender();
      break;
    }
    case 'del-viewing': {
      const p = propertyById(id);
      if (!p) break;
      p.viewings = (p.viewings || []).filter(v => v.id !== item); rerender();
      break;
    }
    case 'sale-for': openSaleModal(id); break;
    // Projecten
    case 'open-project': setView('projects', 'project', id); break;
    case 'back-to-projects': setView('projects'); break;
    case 'edit-project': openProjectModal(id); break;
    case 'del-project': {
      const pr = projectById(id);
      if (!pr) break;
      if (confirmDel(`Project "${pr.name}" verwijderen? Gekoppelde kosten blijven op het pand staan.`)) {
        state.costs.forEach(k => { if (k.projectId === id) k.projectId = ''; });
        state.projects = state.projects.filter(x => x.id !== id);
        if (detailId.project === id) detailId.project = null;
        rerender(); showToast('Project verwijderd.');
      }
      break;
    }
    case 'del-phase': {
      const pr = projectById(id);
      if (!pr) break;
      pr.phases = (pr.phases || []).filter(x => x.id !== phase); rerender();
      break;
    }
    case 'toggle-phase-task': {
      const pr = projectById(id);
      const ph = pr && (pr.phases || []).find(x => x.id === phase);
      const tk = ph && (ph.tasks || []).find(x => x.id === item);
      if (tk) { tk.done = !tk.done; rerender(); }
      break;
    }
    case 'del-phase-task': {
      const pr = projectById(id);
      const ph = pr && (pr.phases || []).find(x => x.id === phase);
      if (ph) { ph.tasks = (ph.tasks || []).filter(x => x.id !== item); rerender(); }
      break;
    }
    case 'toggle-oplever': {
      const pr = projectById(id);
      if (!pr) break;
      const o = (pr.opleverpunten || []).find(x => x.id === item);
      if (o) { o.done = !o.done; rerender(); }
      break;
    }
    case 'del-oplever': {
      const pr = projectById(id);
      if (!pr) break;
      pr.opleverpunten = (pr.opleverpunten || []).filter(x => x.id !== item); rerender();
      break;
    }
    // Kosten
    case 'edit-cost': openCostModal(id); break;
    case 'del-cost':
      if (confirmDel('Kostenpost verwijderen?')) { state.costs = state.costs.filter(x => x.id !== id); rerender(); }
      break;
    // Planning
    case 'edit-plan': openPlanModal(id); break;
    case 'add-plan': openPlanModal(null, date); break;
    // Relaties
    case 'log-activity': openActivityModal(id); break;
    case 'edit-contact': openContactModal(id); break;
    case 'del-contact': {
      const c = contactById(id);
      if (!c) break;
      const used = state.deals.some(d => d.makelaarId === id) || state.costs.some(k => k.contactId === id) || state.properties.some(p => p.financing?.financierId === id);
      if (used) { showToast(`${c.name} is gekoppeld aan kansen, panden of kosten en kan niet worden verwijderd.`); break; }
      if (confirmDel(`Relatie "${c.name}" verwijderen?`)) { state.contacts = state.contacts.filter(x => x.id !== id); rerender(); showToast('Relatie verwijderd.'); }
      break;
    }
    // Taken & navigatie
    case 'toggle-task': {
      const task = state.tasks.find(x => x.id === id);
      if (task) { task.done = !task.done; rerender(); }
      break;
    }
    case 'del-task': state.tasks = state.tasks.filter(x => x.id !== id); rerender(); break;
    case 'foto-del': {
      const p = fotoHolder(el.dataset.kind, id);
      if (!p) break;
      p.fotos = (p.fotos || []).filter((_, i) => i !== Number(el.dataset.index));
      rerender();
      break;
    }
    case 'foto-hoofd': {
      const p = fotoHolder(el.dataset.kind, id);
      if (!p) break;
      const i = Number(el.dataset.index);
      if (p.fotos && p.fotos[i]) { p.fotos.unshift(p.fotos.splice(i, 1)[0]); rerender(); showToast('Hoofdfoto gewijzigd.'); }
      break;
    }
    case 'del-update': {
      const pr = projectById(id);
      if (!pr) break;
      pr.updates = (pr.updates || []).filter(u => u.id !== item); rerender();
      break;
    }
    case 'del-maint': {
      const p = propertyById(id);
      p.onderhoud = (p.onderhoud || []).filter(o => o.id !== el.dataset.item);
      rerender();
      break;
    }
    case 'add-payout': openPayoutModal(id, item); break;
    case 'wwft-toggle': {
      const pr = projectById(id);
      const inv = (pr.investeerders || []).find(x => x.id === el.dataset.item);
      if (inv) inv.wwft = !inv.wwft;
      rerender();
      break;
    }
    case 'del-investor': {
      const pr = projectById(id);
      if (confirmDel('Investeerder verwijderen uit de administratie?')) { pr.investeerders = (pr.investeerders || []).filter(i => i.id !== item); rerender(); }
      break;
    }
    // Adverteren
    case 'open-adtext': openAdTextModal(id); break;
    case 'ad-add': openAdModal(id); break;
    case 'ad-edit': openAdModal(id, item); break;
    case 'ad-del': {
      const p = propertyById(id);
      if (confirmDel('Advertentiekanaal verwijderen?')) { p.advertenties = (p.advertenties || []).filter(a => a.id !== item); rerender(); }
      break;
    }
    case 'copy-ad': {
      const ta = $('#adtext-' + el.dataset.idx);
      if (ta) { ta.select(); ta.setSelectionRange(0, ta.value.length); try { navigator.clipboard.writeText(ta.value); } catch { document.execCommand('copy'); } showToast('Advertentietekst gekopieerd.'); }
      break;
    }
    // Geld-in
    case 'new-invoice': openInvoiceModal(); break;
    case 'invoice-edit': openInvoiceModal(id); break;
    case 'invoice-del':
      if (confirmDel('Factuur verwijderen?')) { state.invoices = state.invoices.filter(f => f.id !== id); rerender(); }
      break;
    case 'gen-rent': genRentInvoices(); break;
    case 'invoice-reminder': {
      const f = state.invoices.find(x => x.id === id);
      if (!f) break;
      const p = propertyById(f.propertyId);
      const email = (p && p.huurderEmail) || '';
      const niveau = f.status === 'Herinnering verzonden' ? 'Aanmaning 1' : (f.status === 'Aanmaning 1' ? 'Aanmaning 2' : 'Herinnering verzonden');
      const dgn = f.due ? daysBetween(f.due, todayISO()) : 0;
      if (email && window.HCloud) {
        HCloud.notify({ to: email, subject: `${niveau} — openstaande betaling HomeINN`, html: `<p>Beste ${esc(f.debiteur || '')},</p><p>Onze administratie laat zien dat de volgende betaling nog openstaat:</p><p><strong>${esc(f.desc)}</strong><br>Bedrag: <strong>${fmtMoney(f.amount)}</strong><br>Vervaldatum: ${fmtDate(f.due)} (${dgn} dagen geleden)</p><p>Wij verzoeken u vriendelijk het bedrag zo spoedig mogelijk te voldoen. Heeft u al betaald? Dan kunt u deze ${niveau.toLowerCase()} als niet verzonden beschouwen.</p><p>Met vriendelijke groet,<br>HomeINN</p>` });
        f.status = niveau;
        rerender();
        showToast(`${niveau} verstuurd naar ${email}.`);
      } else {
        f.status = niveau;
        rerender();
        showToast(`Status op "${niveau}" gezet. Geen e-mail van de huurder bekend (vul die in bij het pand) — verstuur de herinnering handmatig.`);
      }
      break;
    }
    // Financiering
    case 'new-loan': openLoanModal(); break;
    case 'loan-edit': openLoanModal(id); break;
    case 'loan-del':
      if (confirmDel('Lening verwijderen?')) { state.loans = state.loans.filter(l => l.id !== id); rerender(); }
      break;
    // Verzekeringen
    case 'ins-add': openInsuranceModal(id); break;
    case 'ins-edit': openInsuranceModal(id, item); break;
    case 'ins-del': {
      const p = propertyById(id);
      if (confirmDel('Verzekering verwijderen?')) { p.verzekeringen = (p.verzekeringen || []).filter(v => v.id !== item); rerender(); }
      break;
    }
    // Liquiditeit
    case 'new-account': openAccountModal(); break;
    case 'edit-account': openAccountModal(id); break;
    case 'del-account':
      if (confirmDel('Rekening verwijderen?')) { state.accounts = state.accounts.filter(a => a.id !== id); rerender(); }
      break;
    // Contracten
    case 'new-contract': openContractModal(); break;
    case 'edit-contract': openContractModal(id); break;
    case 'print-contract': printContract(id); break;
    case 'del-contract':
      if (confirmDel('Contract verwijderen?')) { state.contracten = state.contracten.filter(c => c.id !== id); rerender(); }
      break;
    case 'send-contract': {
      const c = state.contracten.find(x => x.id === id);
      if (!c) break;
      if (!window.HCloud || !HCloud.status().ready) { showToast('Cloud niet beschikbaar — log eerst in via Instellingen → Cloud.'); break; }
      const email = c.partijEmail || (contactById(c.contactId)?.email) || '';
      if (!email) { showToast('Vul eerst een e-mail van de wederpartij in (Contract bewerken).'); break; }
      const payload = {
        local_id: c.id, type: c.type, ref: c.ref, party_email: email,
        amount: Number(c.bedrag) || 0, body_html: buildContractDoc(c), status: 'Verstuurd'
      };
      showToast('Versturen…');
      HCloud.sendContract(payload)
        .then(() => {
          c.status = 'Verstuurd'; save(); renderCurrent();
          HCloud.notify({ to: email, subject: `Je ${c.type.toLowerCase()} van HomeINN staat klaar`, html: `<p>Beste,</p><p>Er staat een ${esc(c.type.toLowerCase())} voor je klaar ter ondertekening. Log in op het HomeINN-portaal om deze te bekijken en digitaal te ondertekenen:</p><p><a href="${location.origin + location.pathname.replace(/portaal\.html$/, '')}inloggen.html">Inloggen op het portaal</a></p><p>Met vriendelijke groet,<br>HomeINN</p>` });
          showToast(`Contract verstuurd naar ${email}. De wederpartij kan het in het portaal ondertekenen.`);
        })
        .catch(e => showToast('Versturen mislukt: ' + (e.message || e)));
      break;
    }
    case 'export-investors': exportCurrentView(); break;
    case 'toggle-investor': {
      const row = document.getElementById('inv-detail-' + el.dataset.idx);
      if (row) { row.hidden = !row.hidden; el.classList.toggle('open', !row.hidden); }
      break;
    }
    case 'maint-messages': openMaintMessages(id); break;
    case 'export-ical': exportPlanningAsIcal(); break;
    case 'export-audit': {
      const rows = [['Wanneer', 'Gebruiker', 'Actie', 'Onderdeel']];
      (state.audit || []).forEach(a => rows.push([a.ts, a.user, a.action, a.detail]));
      downloadFile(`homeinn-wijzigingshistorie-${todayISO()}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
      showToast('Wijzigingshistorie geëxporteerd.');
      break;
    }
    // Mailing
    case 'send-mailing': {
      const audiences = $$('.mail-aud:checked').map(c => c.value);
      const subject = ($('#mail-subject').value || '').trim();
      const bodyTxt = ($('#mail-body').value || '').trim();
      if (!audiences.length) { showToast('Kies minstens één doelgroep.'); break; }
      if (!subject || !bodyTxt) { showToast('Vul onderwerp en bericht in.'); break; }
      const recipients = mailingAudienceEmails(audiences);
      if (!recipients.length) { showToast('Geen e-mailadressen in deze doelgroep(en).'); break; }
      if (!window.HCloud || !HCloud.status().staff) { showToast('Log in als eigenaar/team om te versturen (Instellingen → Cloud).'); break; }
      if (!confirmDel(`Mailing "${subject}" versturen naar ${recipients.length} ontvanger(s)?`)) break;
      showToast('Versturen…');
      HCloud.broadcast({ subject, html: mailingHtml(bodyTxt), recipients })
        .then(res => {
          const resultaat = res && res.skipped ? 'Resend niet ingesteld' : (res ? `${res.sent || 0} verzonden${res.failed ? ', ' + res.failed + ' mislukt' : ''}` : 'verstuurd');
          state.campaigns.unshift({ id: uid('camp'), datum: todayISO(), onderwerp: subject, audience: audiences, aantal: recipients.length, resultaat });
          save(); renderCurrent();
          showToast(res && res.skipped ? 'Resend-key nog niet ingesteld — niets verzonden (zie Instellingen).' : `Mailing verstuurd: ${resultaat}.`);
        })
        .catch(e => showToast('Mailing mislukt: ' + (e.message || e)));
      break;
    }
    // Team & toegang
    case 'team-refresh': showToast('Team laden…'); renderTeamPanel(); break;
    // Cloud
    case 'cloud-sync': {
      if (!window.HCloud) break;
      showToast('Synchroniseren…');
      const vorigeMeldingIds = new Set((state.cloudMaintenance || []).map(x => x.id));
      HCloud.pushAll(state)
        .then(r => Promise.all([HCloud.pullMaintenance(), HCloud.pullContracts()]).then(([m, contracts]) => {
          state.cloudMaintenance = m;
          // ondertekenstatus terugkoppelen naar lokale contracten + operator mailen
          let getekend = 0;
          const opEmail = state.settings.email;
          (contracts || []).forEach(cc => {
            const local = state.contracten.find(x => x.id === cc.local_id);
            if (local && cc.status === 'Getekend' && local.status !== 'Getekend') {
              local.status = 'Getekend'; local.signedAt = cc.signed_at; local.signedName = cc.signed_name; getekend++;
              if (opEmail && window.HCloud) HCloud.notify({ to: opEmail, subject: `Contract ondertekend: ${local.ref || ''} (${local.type})`, html: `<p>Het contract <strong>${esc(local.type)}</strong>${local.ref ? ' (' + esc(local.ref) + ')' : ''} is digitaal ondertekend door <strong>${esc(cc.signed_name || '—')}</strong> op ${fmtDate(cc.signed_at)}.</p>` });
            }
          });
          // nieuwe huurder-meldingen → operator mailen (samengevat)
          const nieuweMeldingen = m.filter(x => x.status === 'Open' && !vorigeMeldingIds.has(x.id));
          if (nieuweMeldingen.length && opEmail && window.HCloud) {
            HCloud.notify({ to: opEmail, subject: `${nieuweMeldingen.length} nieuwe onderhoudsmelding${nieuweMeldingen.length === 1 ? '' : 'en'} via het huurdersportaal`, html: `<p>Er ${nieuweMeldingen.length === 1 ? 'is' : 'zijn'} ${nieuweMeldingen.length} nieuwe melding${nieuweMeldingen.length === 1 ? '' : 'en'} binnengekomen:</p><ul>${nieuweMeldingen.map(x => `<li>${esc(x.address || '')}: ${esc(x.descr)}</li>`).join('')}</ul><p>Bekijk en handel af in HomeINN OS.</p>` });
          }
          save();
          renderCurrent();
          const open = m.filter(x => x.status === 'Open').length;
          showToast(`Gesynchroniseerd: ${r.panden} panden, ${r.projecten} projecten, ${r.investeerders} investeerders, ${r.overig || 0} overige records. ${m.length} melding${m.length === 1 ? '' : 'en'}${open ? ` (${open} open)` : ''}${getekend ? `, ${getekend} contract(en) ondertekend` : ''}.`);
        }))
        .catch(e => showToast('Sync mislukt: ' + (e.message || e)));
      break;
    }
    case 'cloud-backup':
      if (window.HCloud) {
        showToast('Backup naar cloud…');
        HCloud.saveState(state).then(() => showToast('Volledige werkstaat geback-upt naar de cloud.')).catch(e => showToast('Backup mislukt: ' + (e.message || e)));
      }
      break;
    case 'cloud-restore':
      if (window.HCloud) {
        HCloud.loadState().then(res => {
          if (!res || !res.data) { showToast('Nog geen cloud-backup gevonden.'); return; }
          if (!confirmDel(`Cloud-backup van ${fmtDateTime(res.updated_at)} herstellen? Dit overschrijft je huidige lokale gegevens.`)) return;
          const vorige = state;
          try {
            state = sanitizeState(res.data);
            renderCurrent(); // bewijs dat het rendert…
            save();          // …dan pas persisteren
            showToast('Cloud-backup hersteld.');
          } catch (err) {
            console.error('Cloud-herstel mislukt, teruggedraaid:', err);
            state = vorige; renderCurrent();
            showToast('Cloud-backup kon niet worden geladen — niets gewijzigd.');
          }
        }).catch(e => showToast('Herstel mislukt: ' + (e.message || e)));
      }
      break;
    case 'cloud-logout':
      if (window.HCloud) HCloud.signOut().then(() => { if (currentView === 'settings') renderCloudPanel(); });
      break;
    // Aanvragen
    case 'inbox-to-deal': {
      const lead = loadInbox().find(l => l.id === id);
      if (lead) {
        setLeadHandled(id, true);
        openDealModal(null, {
          source: 'Website-aanvraag',
          note: `Aanvraag ${fmtDateTime(lead.date)} van ${lead.name || 'onbekend'} (${leadContactInfo(lead) || 'geen contactgegevens'}). ${lead.subject || ''} ${lead.message || ''}`.trim()
        });
      }
      break;
    }
    case 'inbox-to-contact': {
      const lead = loadInbox().find(l => l.id === id);
      if (lead) {
        const heeftMail = (lead.contact || '').includes('@');
        state.contacts.push({
          id: uid('r'),
          type: (lead.subject || '').toLowerCase().includes('verkopen') ? 'Koper/Verkoper' : 'Overig',
          name: lead.name || 'Onbekend', contact: lead.name || '',
          email: lead.email || (heeftMail ? lead.contact : ''),
          phone: lead.phone || (!heeftMail ? (lead.contact || '') : ''),
          address: '',
          note: `Websiteaanvraag ${fmtDateTime(lead.date)} · ${lead.subject || ''}${lead.message ? ' · ' + lead.message : ''}`.trim()
        });
        setLeadHandled(id, true);
        rerender();
        showToast(`${lead.name || 'Aanvraag'} toegevoegd aan Relaties.`);
      }
      break;
    }
    case 'inbox-handled': {
      const lead = loadInbox().find(l => l.id === id);
      if (lead) { setLeadHandled(id, !lead.handled); renderCurrent(); }
      break;
    }
    case 'inbox-del':
      if (confirmDel('Aanvraag verwijderen?')) { saveInbox(loadInbox().filter(l => l.id !== id)); renderCurrent(); }
      break;
    case 'signal-go':
    case 'search-go': goTo(go); break;
  }
});

document.addEventListener('change', event => {
  if (event.target.id === 'foto-upload') { handleFotoUpload(event.target); return; }
  if (event.target.id === 'doc-upload') { handleDocUpload(event.target); return; }
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action, id, item, phase } = el.dataset;
  switch (action) {
    case 'deal-status': {
      const d = dealById(id);
      if (!d) return;
      d.status = el.value; rerender();
      if (el.value === 'Notaris') showToast('Plan de passeerafspraak in de planning en regel de bankgarantie.');
      break;
    }
    case 'bid-status': {
      const d = dealById(id);
      if (!d) return;
      const b = (d.biedingen || []).find(x => x.id === item);
      if (!b) return;
      b.status = el.value;
      if (el.value === 'Geaccepteerd' && DEAL_STAGES.includes(d.status)) {
        d.status = 'Onder voorbehoud';
        showToast('Bod geaccepteerd! Status → Onder voorbehoud. Rond af via "Aangekocht →".');
      }
      rerender();
      break;
    }
    case 'property-status': {
      const p = propertyById(id);
      if (!p) return;
      p.status = el.value;
      if (el.value === 'Te koop' && !p.teKoopSinds) p.teKoopSinds = todayISO();
      if (el.value === 'Te koop' && !p.label) showToast('Let op: energielabel is wettelijk verplicht bij verkoop.');
      rerender();
      break;
    }
    case 'offer-status': {
      const p = propertyById(id);
      if (!p) return;
      const o = (p.offers || []).find(x => x.id === item);
      if (!o) return;
      o.status = el.value;
      if (el.value === 'Geaccepteerd' && p.status === 'Te koop') {
        p.status = 'Onder bod';
        showToast('Bod geaccepteerd — status naar Onder bod. Rond af via "Verkoop afronden".');
      }
      rerender();
      break;
    }
    case 'cost-status': { const k = state.costs.find(x => x.id === id); if (k) k.status = el.value; rerender(); break; }
    case 'maint-status': {
      const p = propertyById(id);
      if (!p) return;
      const o = (p.onderhoud || []).find(x => x.id === el.dataset.item);
      if (o) o.status = el.value;
      rerender();
      break;
    }
    case 'invoice-status': {
      const f = state.invoices.find(x => x.id === id);
      if (f) f.status = el.value;
      rerender();
      break;
    }
    case 'contract-status': {
      const c = state.contracten.find(x => x.id === id);
      if (c) c.status = el.value;
      rerender();
      break;
    }
    case 'set-role': {
      const role = el.value;
      if (window.HCloud) HCloud.setRole(id, role)
        .then(() => showToast(`Rol bijgewerkt naar ${role}.`))
        .catch(e => showToast('Rol wijzigen mislukt: ' + (e.message || e)));
      break;
    }
    case 'cloud-maint-status': {
      const m = (state.cloudMaintenance || []).find(x => x.id === id);
      const nieuw = el.value;
      if (m) m.status = nieuw; // optimistisch
      save();
      if (window.HCloud) {
        HCloud.setMaintenanceStatus(id, nieuw)
          .then(() => showToast('Status bijgewerkt — de huurder ziet dit in zijn portaal.'))
          .catch(e => { showToast('Bijwerken in cloud mislukt: ' + (e.message || e)); });
      }
      break;
    }
    case 'phase-status': {
      const pr = projectById(id);
      if (!pr || !pr.phases) return;
      const ph = pr.phases.find(x => x.id === phase);
      if (ph) ph.status = el.value;
      rerender();
      break;
    }
  }
});

/* Inline-formulieren (fases, opleverpunten, documenten) + taken + instellingen */
document.addEventListener('submit', event => {
  const form = event.target;
  if (form.matches('.modal-card')) { handleModalSubmit(event); return; }
  if (form.dataset.form) {
    event.preventDefault();
    const data = new FormData(form);
    if (form.dataset.form === 'cloud-login') {
      const email = String(data.get('email') || '').trim();
      if (email && window.HCloud) {
        HCloud.signIn(email)
          .then(() => showToast(`Inloglink verstuurd naar ${email} — open de link in je mail.`))
          .catch(e => showToast('Inloggen mislukt: ' + (e.message || e)));
      }
      form.reset();
      return;
    }
    if (form.dataset.form === 'add-phase') {
      const pr = projectById(form.dataset.id);
      if (!pr) return;
      pr.phases.push({ id: uid('ph'), name: String(data.get('name')).trim(), status: 'Te doen' });
    }
    if (form.dataset.form === 'add-phase-task') {
      const pr = projectById(form.dataset.id);
      const ph = pr && (pr.phases || []).find(x => x.id === form.dataset.phase);
      if (ph) { ph.tasks = ph.tasks || []; ph.tasks.push({ id: uid('pt'), title: String(data.get('title')).trim(), done: false }); }
    }
    if (form.dataset.form === 'add-oplever') {
      const pr = projectById(form.dataset.id);
      if (!pr) return;
      pr.opleverpunten.push({ id: uid('op'), desc: String(data.get('desc')).trim(), done: false });
    }
    if (form.dataset.form === 'add-doc') {
      const p = propertyById(form.dataset.id);
      if (!p) return;
      const v = String(data.get('name')).trim();
      const isPad = /^https?:\/\//i.test(v) || v.includes('/');
      p.docs.push(isPad
        ? { id: uid('doc'), name: v.split('/').pop() || v, url: v, done: true }
        : { id: uid('doc'), name: v, done: false });
    }
    if (form.dataset.form === 'add-foto') {
      const p = fotoHolder(form.dataset.kind, form.dataset.id);
      if (!p) return;
      p.fotos = p.fotos || [];
      p.fotos.push(String(data.get('url')).trim());
    }
    if (form.dataset.form === 'add-maint') {
      const p = propertyById(form.dataset.id);
      if (!p) return;
      p.onderhoud = p.onderhoud || [];
      p.onderhoud.push({ id: uid('mnt'), date: todayISO(), desc: String(data.get('desc')).trim(), status: 'Open' });
    }
    if (form.dataset.form === 'add-update') {
      const pr = projectById(form.dataset.id);
      if (!pr) return;
      pr.updates = pr.updates || [];
      pr.updates.push({ id: uid('u'), date: todayISO(), text: String(data.get('text')).trim() });
    }
    if (form.dataset.form === 'add-investor') {
      const pr = projectById(form.dataset.id);
      if (!pr) return;
      pr.investeerders = pr.investeerders || [];
      const nieuweInv = { id: uid('inv'), naam: String(data.get('naam')).trim(), email: String(data.get('email') || '').trim(), bedrag: Number(data.get('bedrag')) || 0, wwft: false, datum: todayISO() };
      pr.investeerders.push(nieuweInv);
      if (nieuweInv.email && window.HCloud) {
        HCloud.notify({ to: nieuweInv.email, subject: 'Welkom als investeerder bij HomeINN', html: `<p>Beste ${esc(nieuweInv.naam)},</p><p>Je investering van <strong>${fmtMoney(nieuweInv.bedrag)}</strong> in het project <strong>${esc(pr.name)}</strong> is geregistreerd. Welkom!</p><p>Volg je investering, rendement en projectupdates in je persoonlijke portaal — log in met dit e-mailadres (je ontvangt een beveiligde inloglink, geen wachtwoord nodig):</p><p><a href="${location.origin + location.pathname.replace(/portaal\.html$/, '')}inloggen.html">Inloggen op het HomeINN-portaal</a></p><p>Met vriendelijke groet,<br>HomeINN</p>` });
      }
    }
    form.reset();
    rerender();
  }
  if (form.id === 'task-form') {
    event.preventDefault();
    const title = $('#task-input').value.trim();
    if (!title) return;
    state.tasks.push({ id: uid('t'), title, due: $('#task-date').value || '', done: false });
    form.reset();
    rerender();
  }
  if (form.id === 'settings-form') {
    event.preventDefault();
    const data = new FormData(form);
    ['companyName', 'address', 'email', 'phone', 'kvk', 'btw'].forEach(k => state.settings[k] = String(data.get(k) || '').trim());
    ['otbPct', 'notaris', 'makelaarPct', 'rentePct', 'vasteLasten', 'verkoopkostenPct', 'doelROI'].forEach(k => {
      const v = Number(data.get(k));
      if (!Number.isNaN(v)) state.settings[k] = v;
    });
    rerender();
    showToast('Instellingen opgeslagen.');
  }
});

/* ---------- Statische listeners ---------- */
function initStatic() {
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  $$('[data-view-jump]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.viewJump)));
  $('#back-to-app').addEventListener('click', () => setView('dashboard'));
  window.addEventListener('hashchange', applyHash);
  window.addEventListener('storage', e => { if (e.key === INBOX_KEY) renderCurrent(); });

  $('#primary-action').addEventListener('click', () => PRIMARY_ACTIONS[currentView]?.[1]());
  $('#export-btn').addEventListener('click', exportCurrentView);
  $('#search-input').addEventListener('input', e => renderSearch(e.target.value));
  $('#search-input').addEventListener('keydown', e => { if (e.key === 'Escape') { $('#search-results').hidden = true; e.target.blur(); } });

  // Cmd/Ctrl+K command palette
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openCmdK(); }
  });
  const cmdkInput = $('#cmdk-input');
  if (cmdkInput) {
    cmdkInput.addEventListener('input', () => { cmdkIdx = 0; cmdkRender(); });
    cmdkInput.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdkIdx = Math.min(cmdkResults.length - 1, cmdkIdx + 1); cmdkRender(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkIdx = Math.max(0, cmdkIdx - 1); cmdkRender(); }
      else if (e.key === 'Enter') { e.preventDefault(); cmdkRun(cmdkIdx); }
    });
  }
  const cmdkDlg = $('#cmdk');
  if (cmdkDlg) cmdkDlg.addEventListener('click', e => {
    const it = e.target.closest('[data-cmdk]');
    if (it) cmdkRun(Number(it.dataset.cmdk));
    else if (e.target === cmdkDlg) cmdkDlg.close();
  });

  // Filters
  $$('#portfolio-filter button').forEach(b => b.addEventListener('click', () => { filters.portfolio = b.dataset.pfilter; $$('#portfolio-filter button').forEach(x => x.classList.toggle('active', x === b)); renderPortfolio(); }));
  $$('#project-filter button').forEach(b => b.addEventListener('click', () => { filters.project = b.dataset.prfilter; $$('#project-filter button').forEach(x => x.classList.toggle('active', x === b)); renderProjects(); }));
  $$('#cost-filter button').forEach(b => b.addEventListener('click', () => { filters.cost = b.dataset.cfilter; $$('#cost-filter button').forEach(x => x.classList.toggle('active', x === b)); renderCosts(); }));
  $$('#relation-filter button').forEach(b => b.addEventListener('click', () => { filters.relation = b.dataset.rfilter; $$('#relation-filter button').forEach(x => x.classList.toggle('active', x === b)); renderRelations(); }));

  // Planning
  $('#week-prev').addEventListener('click', () => { weekOffset--; renderPlanning(); });
  $('#week-next').addEventListener('click', () => { weekOffset++; renderPlanning(); });
  $('#week-today').addEventListener('click', () => { weekOffset = 0; renderPlanning(); });

  // Dealcalculator
  $('#calc-form').addEventListener('input', refreshCalcResult);
  $('#calc-save').addEventListener('click', event => {
    event.preventDefault();
    const input = readCalcForm();
    if (!input.address) { showToast('Vul een adres in om de calculatie op te slaan.'); return; }
    state.deals.push({
      id: uid('d'), ref: nextRef('AK', state.deals), address: input.address, city: input.city || 'Rotterdam',
      ptype: 'Appartement', status: 'Lead', vraagprijs: input.vraagprijs, makelaarId: '', viewingDate: '',
      source: 'Dealcalculator', createdAt: todayISO(), note: '',
      calc: {
        koopsom: input.koopsom, verbouwing: input.verbouwing, verkoopprijs: input.verkoopprijs, maanden: input.maanden,
        financieringPct: input.financieringPct, otbPct: input.otbPct, notaris: input.notaris, makelaarPct: input.makelaarPct,
        rentePct: input.rentePct, vasteLasten: input.vasteLasten, verkoopkostenPct: input.verkoopkostenPct
      },
      biedingen: []
    });
    save();
    showToast(`${input.address} opgeslagen als aankoopkans.`);
    setView('deals');
  });
  $('#calc-print').addEventListener('click', event => { event.preventDefault(); printCalcForm(); });
  // Hold-vs-flip-velden staan buiten het formulier: alleen het resultaatblok herrekenen (focus behouden).
  $('#calc-scenarios').addEventListener('input', e => {
    const inp = e.target.closest('.hold-input');
    if (!inp) return;
    const key = inp.dataset.hold;
    calcHold[key] = Number(inp.value) || 0;
    renderHoldResult(readCalcForm());
  });

  // Live previews in modals
  $('#deal-form').addEventListener('input', refreshDealPreview);
  $('#sale-form').addEventListener('input', refreshSalePreview);

  // Annuleren/sluiten zijn géén submit-knoppen: anders is × de default button en gooit Enter alle invoer weg
  $$('.modal [value="cancel"], .modal .close').forEach(b => {
    b.type = 'button';
    b.addEventListener('click', () => b.closest('dialog')?.close());
  });

  // Advertentietekst-modal sluiten
  $$('[data-close-adtext]').forEach(b => b.addEventListener('click', () => $('#adtext-modal').close()));

  // Onderhoud-berichten
  $$('[data-close-maintmsg]').forEach(b => b.addEventListener('click', () => $('#maintmsg-modal').close()));
  $('#maintmsg-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!_currentMaint || !window.HCloud) return;
    const body = e.target.elements.body.value.trim();
    if (!body) return;
    HCloud.addMaintenanceMessage(_currentMaint.id, body, 'operator')
      .then(() => {
        if (_currentMaint.email) HCloud.notify({ to: _currentMaint.email, subject: 'Reactie van HomeINN op je onderhoudsmelding', html: `<p>HomeINN heeft gereageerd op je onderhoudsmelding:</p><p>${esc(body)}</p><p>Log in op het huurdersportaal om te reageren.</p>` });
        e.target.reset();
        loadMaintThread(_currentMaint.id);
      })
      .catch(err => showToast('Versturen mislukt: ' + (err.message || err)));
  });

  // Boekhoud-export
  $('#export-boekhouding').addEventListener('click', exportBoekhouding);

  // Website publiceren
  $('#publish-aanbod').addEventListener('click', publishAanbod);
  $('#publish-site-projects').addEventListener('click', publishAanbod);

  // Backup / herstel / reset
  $('#backup-btn').addEventListener('click', downloadBackup);
  $('#restore-input').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.properties) || !Array.isArray(parsed.deals)) throw new Error('Ongeldig bestand');
        const vorige = state;
        state = sanitizeState(parsed);
        try {
          renderCurrent(); // eerst bewijzen dat de data rendert…
          save();          // …pas daarna persisteren
          showToast('Backup hersteld.');
        } catch (renderErr) {
          console.error('Backup rendert niet, terugggedraaid:', renderErr);
          state = vorige;
          renderCurrent();
          showToast('Backup kon niet worden geladen — er is niets gewijzigd.');
        }
      } catch {
        showToast('Dit bestand is geen geldige HomeINN-backup.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });
  $('#reset-btn').addEventListener('click', () => {
    if (confirmDel('Alles wissen en terug naar demo-gegevens? Dit kan niet ongedaan worden gemaakt (maak eerst een backup).')) {
      localStorage.removeItem(STORAGE_KEY);
      state = seedData();
      save();
      setView('dashboard');
      showToast('Teruggezet naar demo-gegevens.');
    }
  });
}

/* ---------- Init ---------- */
load();
initStatic();
applyHash();

/* PWA: registreer de service worker zodat het portaal installeerbaar + offline bruikbaar is.
   Alleen op http(s) — onder file:// werkt dit niet en hoeft het ook niet. */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // Zodra een nieuwe service worker de controle overneemt: één keer automatisch herladen,
  // zodat nieuwe code/logo's meteen verschijnen (voorkomt het "twee keer verversen"-gedoe).
  let _swRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (_swRefreshing) return;
    _swRefreshing = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => { try { reg.update(); } catch (e) {} }).catch(() => {});
  });
}

/* Beheerportaal-gate: vraag login (eigenaar/team) tenzij de gebruiker bewust lokaal werkt.
   Sluit niemand buiten — "lokaal verdergaan" is altijd mogelijk en wordt onthouden. */
function updatePortalGate() {
  const gate = $('#portal-gate');
  if (!gate) return;
  const local = localStorage.getItem('hios-portal-local') === '1';
  const st = window.HCloud ? HCloud.status() : { ready: false };
  if (!st.ready || local || st.staff) { gate.hidden = true; return; }
  $('#gate-title').textContent = st.email ? 'Geen toegang tot het beheerportaal' : 'Inloggen vereist';
  $('#gate-msg').textContent = st.email
    ? `Je bent ingelogd als ${st.email}, maar dit account heeft geen beheerrechten. Log in met een eigenaar-/teamaccount of ga lokaal verder.`
    : 'Log in als eigenaar of teamlid om met de cloud te werken en dit beheerportaal te beschermen.';
  gate.hidden = false;
}

const _gateLocalBtn = $('#gate-local');
if (_gateLocalBtn) _gateLocalBtn.addEventListener('click', () => {
  localStorage.setItem('hios-portal-local', '1');
  $('#portal-gate').hidden = true;
});

/* Cloud-laag (optioneel): init + paneel verversen bij in-/uitloggen. */
if (window.HCloud) {
  HCloud.onChange(() => { if (currentView === 'settings') renderCloudPanel(); updatePortalGate(); });
  HCloud.init();
  // Real-time: pollt ondertekenstatus terwijl je in de Contracten-view bent
  setInterval(() => {
    if (currentView !== 'contracts' || !HCloud.status().staff) return;
    HCloud.pullContracts().then(contracts => {
      let changed = 0;
      (contracts || []).forEach(cc => {
        const local = state.contracten.find(x => x.id === cc.local_id);
        if (local && cc.status === 'Getekend' && local.status !== 'Getekend') {
          local.status = 'Getekend'; local.signedAt = cc.signed_at; local.signedName = cc.signed_name; changed++;
        }
      });
      if (changed) { save(); renderCurrent(); showToast(`${changed} contract(en) zojuist digitaal ondertekend.`); }
    }).catch(() => {});
  }, 45000);
} else {
  updatePortalGate();
}
