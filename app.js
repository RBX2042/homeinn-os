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
    settings: {
      companyName: 'HomeINN', address: 'Rotterdam', email: 'info@homeinn.nl', phone: '[TELEFOON]',
      kvk: '[KVK-NUMMER]', btw: '[BTW-NUMMER]',
      otbPct: 8, notaris: 1500, makelaarPct: 1, rentePct: 6, vasteLasten: 300, verkoopkostenPct: 1.25, doelROI: 15
    },
    contacts: [
      { id: 'r1', type: 'Makelaar', name: 'Maaskant Makelaardij', contact: 'D. Maaskant', email: 'info@maaskantmakelaardij.nl', phone: '010-1112233', address: 'Rotterdam', note: 'Brengt off-market portiekpanden. Snel schakelen.' },
      { id: 'r2', type: 'Makelaar', name: 'Van Vliet & Partners', contact: 'S. van Vliet', email: 'verkoop@vanvlietpartners.nl', phone: '010-2223344', address: 'Rotterdam', note: 'Verkopend makelaar van onze panden. Courtage 1,1%.' },
      { id: 'r3', type: 'Notaris', name: 'Notariskantoor Maas', contact: 'mr. R. Maas', email: 'vastgoed@notarismaas.nl', phone: '010-3334455', address: 'Rotterdam', note: 'Vaste notaris. Passeert binnen 2 weken.' },
      { id: 'r4', type: 'Aannemer', name: 'Bouwbedrijf Vos', contact: 'K. Vos', email: 'planning@bouwbedrijfvos.nl', phone: '010-4445566', address: 'Schiedam', note: 'Hoofdaannemer renovaties. Plant 4-6 wkn vooruit.' },
      { id: 'r5', type: 'Aannemer', name: 'Installatietechniek Botlek', contact: 'M. Aydin', email: 'service@itbotlek.nl', phone: '010-5556677', address: 'Rotterdam-Zuid', note: 'W/E-installaties, ook keuringen.' },
      { id: 'r6', type: 'Financier', name: 'Rijnmond Vastgoedfinanciering', contact: 'P. de Lange', email: 'p.delange@rijnmondvf.nl', phone: '010-6667788', address: 'Rotterdam', note: 'Bridge- en ontwikkelfinanciering, 70-80% LTV.' },
      { id: 'r7', type: 'Koper/Verkoper', name: 'B. Janssen', contact: 'B. Janssen', email: 'b.janssen@example.nl', phone: '06-11223344', address: '', note: 'Bod uitgebracht op Laan op Zuid 304.' },
      { id: 'r8', type: 'Overig', name: 'Taxatiebureau Erasmus', contact: 'L. Vermeer', email: 'planning@taxatie-erasmus.nl', phone: '010-7778899', address: 'Rotterdam', note: 'Gevalideerde taxaties binnen 5 werkdagen.' },
      { id: 'r9', type: 'Aannemer', name: 'Stukadoors- & afbouwbedrijf Demir', contact: 'E. Demir', email: 'demir.afbouw@example.nl', phone: '06-99887766', address: 'Schiedam', note: 'Afbouw en styling richting oplevering.' }
    ],
    deals: [
      {
        id: 'd1', ref: 'AK-2026-007', address: 'Schiedamseweg 77C', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Lead', vraagprijs: 285000, makelaarId: 'r1', viewingDate: '', source: 'Off-market via Maaskant',
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
        createdAt: addDaysISO(t, -28), note: 'Koopovereenkomst getekend o.v.v. financiering — stukken vóór 20-06 bij Rijnmond VF.',
        calc: { koopsom: 240000, verbouwing: 45000, verkoopprijs: 365000, maanden: 8 },
        biedingen: [{ id: 'b3', date: addDaysISO(t, -16), amount: 240000, validUntil: addDaysISO(t, -12), status: 'Geaccepteerd', note: 'O.v.v. financiering' }]
      },
      {
        id: 'd5', ref: 'AK-2026-003', address: 'Wolphaertsbocht 219', city: 'Rotterdam', ptype: 'Portiekpand',
        status: 'Notaris', vraagprijs: 210000, makelaarId: 'r1', viewingDate: addDaysISO(t, -35), source: 'Veiling',
        createdAt: addDaysISO(t, -42), note: 'Passeert 24-06 bij Notariskantoor Maas.',
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
        webOmschrijving: 'Karakteristieke eengezinswoning aan de Kralingse Plas, volledig gerenoveerd met uitbouw en energielabel A. Binnenkort in verkoop.',
        sale: null, dealId: 'd-oud1',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc1' + i, name, done: i < 3 })),
        viewings: [], offers: [],
        note: 'Volledige renovatie, daarna verkoop. Taxatie na renovatie € 565k.'
      },
      {
        id: 'pnd2', ref: 'PND-2025-011', address: 'Laan op Zuid 304', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Te koop', label: 'A', taxatie: 410000, taxatieDatum: addDaysISO(t, -40),
        vraagprijs: 415000, teKoopSinds: addDaysISO(t, -26),
        purchase: { date: addDaysISO(t, -208), koopsom: 275000, otb: 28600, notaris: 1380, makelaar: 2750, overig: 600 },
        financing: { financierId: 'r6', bedrag: 220000, rentePct: 6.4, einddatum: addDaysISO(t, 150) },
        vasteLasten: 290, maandhuur: 0, huurder: '', m2: 92, kamers: 3,
        webOmschrijving: 'Volledig gerenoveerd 3-kamerappartement op de Kop van Zuid. Nieuwe installaties, warmtepomp, energielabel A en hoogwaardige afwerking — direct te betrekken.',
        sale: null, dealId: 'd-oud2',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc2' + i, name, done: true })),
        viewings: [
          { id: 'v1', date: addDaysISO(t, -9), name: 'Fam. Pietersen (via Van Vliet)', note: 'Serieus, tweede bezichtiging aangevraagd' },
          { id: 'v2', date: addDaysISO(t, -4), name: 'B. Janssen', note: 'Direct geïnteresseerd, financiering rond' }
        ],
        offers: [{ id: 'o1', date: addDaysISO(t, -2), name: 'B. Janssen', amount: 392000, status: 'Ontvangen', note: 'Zonder voorbehoud' }],
        note: 'Gerenoveerd opgeleverd. Strategie: vasthouden aan € 405k+.'
      },
      {
        id: 'pnd3', ref: 'PND-2025-008', address: 'Bergweg 91A', city: 'Rotterdam', ptype: 'Appartement',
        status: 'Verhuurd', label: 'C', taxatie: 265000, taxatieDatum: addDaysISO(t, -120),
        vraagprijs: 0, teKoopSinds: '',
        purchase: { date: addDaysISO(t, -300), koopsom: 198000, otb: 20592, notaris: 1350, makelaar: 1980, overig: 400 },
        financing: { financierId: 'r6', bedrag: 160000, rentePct: 5.9, einddatum: addDaysISO(t, 41) },
        vasteLasten: 240, maandhuur: 1450, huurder: 'S. el Amrani',
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
        sale: { verkoopprijs: 489000, date: addDaysISO(t, -43), kosten: 6100, koper: 'Fam. Oduber' },
        dealId: '',
        docs: DEFAULT_DOCS.map((name, i) => ({ id: 'doc4' + i, name, done: true })),
        viewings: [{ id: 'v3', date: addDaysISO(t, -75), name: 'Fam. Oduber', note: 'Bood na 2e bezichtiging' }],
        offers: [{ id: 'o2', date: addDaysISO(t, -65), name: 'Fam. Oduber', amount: 489000, status: 'Geaccepteerd', note: '' }],
        note: 'Afgerond. Resultaat boven calculatie.'
      }
    ],
    projects: [
      {
        id: 'prj1', ref: 'PRJ-2026-003', name: 'Volledige renovatie + tuinkamer', propertyId: 'pnd1',
        status: 'Uitvoering', startDate: addDaysISO(t, -56), endDate: addDaysISO(t, 34), budget: 85000,
        note: 'Bouwbedrijf Vos hoofdaannemer. Oplevering richting half juli.',
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
      { id: 'pl1', date: addDaysISO(t, 1), type: 'Bezichtiging', title: 'Bezichtiging Bergselaan 110B (aankoop)', who: 'Eigen + Maaskant', ref: 'd:d2' },
      { id: 'pl2', date: addDaysISO(t, 2), type: 'Aannemer', title: 'Bouwoverleg Vos — afbouwplanning Kralingse Plaslaan', who: 'Eigen + Vos', ref: 'p:pnd1' },
      { id: 'pl3', date: addDaysISO(t, 3), type: 'Bezichtiging', title: '2e bezichtiging fam. Pietersen — Laan op Zuid 304', who: 'Van Vliet', ref: 'p:pnd2' },
      { id: 'pl4', date: addDaysISO(t, 6), type: 'Taxatie', title: 'Taxatie Erasmus — herfinanciering Bergweg 91A', who: 'Eigen', ref: 'p:pnd3' },
      { id: 'pl5', date: addDaysISO(t, 14), type: 'Notaris', title: 'Passeren Wolphaertsbocht 219 bij Notariskantoor Maas', who: 'Eigen', ref: 'd:d5' },
      { id: 'pl6', date: addDaysISO(t, 9), type: 'Oplevering', title: 'Voorschouw installaties Kralingse Plaslaan', who: 'Eigen + ITB', ref: 'p:pnd1' }
    ],
    tasks: [
      { id: 't1', title: 'Reageren op bod € 392k van B. Janssen (Laan op Zuid)', due: t, done: false },
      { id: 't2', title: 'Financieringsstukken Mathenesserweg naar Rijnmond VF', due: addDaysISO(t, 3), done: false },
      { id: 't3', title: 'Herfinanciering Bergweg 91A opstarten', due: addDaysISO(t, 7), done: false },
      { id: 't4', title: 'Bankgarantie Wolphaertsbocht geregeld', due: addDaysISO(t, -5), done: true }
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
  // Ontwikkeling
  state.projects.filter(pr => pr.status !== 'Afgerond').forEach(pr => {
    const actual = state.costs.filter(k => k.projectId === pr.id).reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
    if (actual > (Number(pr.budget) || 0)) {
      signals.push({ level: 'hoog', text: `${pr.name} (${propertyLabel(pr.propertyId)}) is ${fmtMoney(actual - pr.budget)} over budget.`, go: 'project:' + pr.id });
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
  // Website-aanvragen
  const nieuweLeads = loadInbox().filter(l => !l.handled).length;
  if (nieuweLeads) {
    signals.push({ level: 'hoog', text: `${nieuweLeads} nieuwe aanvra${nieuweLeads === 1 ? 'ag' : 'gen'} via de website — bekijk en volg op.`, go: 'inbox' });
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
  portfolio: 'Panden', projects: 'Ontwikkelprojecten', costs: 'Kosten', sales: 'Verkoop',
  planning: 'Planning', relations: 'Relaties', settings: 'Instellingen'
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
  planning: ['Planning toevoegen', () => openPlanModal()],
  relations: ['Nieuwe relatie', () => openContactModal()],
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
    case 'sales': renderSales(); break;
    case 'planning': renderPlanning(); break;
    case 'relations': renderRelations(); break;
    case 'settings': renderSettings(); break;
  }
}

function rerender() { save(); renderCurrent(); }

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
    .sort((a, b) => a.date.localeCompare(b.date));
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

  $('#deal-board').innerHTML = DEAL_STAGES.map(stage => {
    const cards = active.filter(d => d.status === stage);
    return `<section class="lead-column">
      <h3>${stage} <span class="sub">(${cards.length})</span></h3>
      ${cards.map(d => {
        const c = computeDeal(d.calc);
        return `<article class="lead-card" data-action="open-deal" data-id="${d.id}">
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
    </div>`;
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
      <td><strong>${esc(p.address)}</strong><br><span class="sub">${esc(p.ref)} · ${esc(p.ptype)}${p.label ? ' · label ' + esc(p.label) : ''}</span></td>
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
        <div class="panel-head compact"><h2>Documenten</h2></div>
        <div class="check-list">
          ${(p.docs || []).map(doc => `
            <div class="check-item ${doc.done ? 'done' : ''}">
              <button class="task-check ${doc.done ? 'checked' : ''}" data-action="toggle-doc" data-id="${p.id}" data-item="${doc.id}" aria-label="Afvinken"></button>
              <span>${esc(doc.name)}</span>
              <button class="icon-btn" data-action="del-doc" data-id="${p.id}" data-item="${doc.id}" title="Verwijderen">🗑</button>
            </div>`).join('') || '<p class="empty">Geen documenten.</p>'}
        </div>
        <form class="inline-form" data-form="add-doc" data-id="${p.id}">
          <input name="name" placeholder="Nieuw document…" required>
          <button class="btn primary slim" type="submit">+</button>
        </form>
      </section>
    </div>
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
    </div>`;
}

/* ---------- Ontwikkelprojecten ---------- */
function projectActual(pr) {
  return state.costs.filter(k => k.projectId === pr.id).reduce((sum, k) => sum + (Number(k.amount) || 0), 0);
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
    const phases = pr.phases || [];
    const progress = phases.length ? Math.round(phases.filter(ph => ph.status === 'Klaar').length / phases.length * 100) : 0;
    return `<tr data-action="open-project" data-id="${pr.id}">
      <td><strong>${esc(pr.name)}</strong><br><span class="sub">${esc(pr.ref)} · ${fmtDate(pr.startDate)} → ${fmtDate(pr.endDate)}</span></td>
      <td>${esc(propertyLabel(pr.propertyId))}</td>
      <td>${statusBadge(pr.status)}</td>
      <td>${fmtMoney(pr.budget)}</td>
      <td>${fmtMoney(actual)}</td>
      <td class="${diff < 0 ? 'alert' : ''}"><strong>${fmtMoney(diff)}</strong></td>
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
    <div class="kpi-grid">
      <article class="kpi small"><span>Budget</span><strong>${fmtMoney(budget)}</strong></article>
      <article class="kpi small"><span>Realisatie</span><strong>${fmtMoney(actual)}</strong><small>${costs.length} kostenposten</small></article>
      <article class="kpi small"><span>${diff < 0 ? 'Over budget' : 'Resterend budget'}</span><strong class="${diff < 0 ? 'alert' : ''}">${fmtMoney(Math.abs(diff))}</strong></article>
      <article class="kpi small"><span>Geplande oplevering</span><strong>${fmtDate(pr.endDate)}</strong>${pr.endDate && pr.endDate < todayISO() && pr.status !== 'Afgerond' ? '<small class="alert">uitgelopen</small>' : ''}</article>
    </div>
    <div class="split detail-grid">
      <section class="panel">
        <div class="panel-head compact"><h2>Fases</h2></div>
        <div class="phase-list">
          ${phases.map(ph => `
            <div class="phase ${ph.status === 'Klaar' ? 'done' : ''}">
              <strong>${esc(ph.name)}</strong>
              <select data-action="phase-status" data-id="${pr.id}" data-phase="${ph.id}">
                ${['Te doen', 'Bezig', 'Klaar'].map(s => `<option ${ph.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
              <button class="icon-btn" data-action="del-phase" data-id="${pr.id}" data-phase="${ph.id}" title="Fase verwijderen">🗑</button>
            </div>`).join('')}
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
    const items = state.planning.filter(pl => pl.date === day);
    return `<div class="day-col ${day === t ? 'today' : ''}">
      <header><strong>${fmtDayLabel(day)}</strong>
        <button class="icon-btn" data-action="add-plan" data-date="${day}" title="Toevoegen">+</button>
      </header>
      ${items.map(pl => `
        <article class="plan-card" data-action="edit-plan" data-id="${pl.id}">
          <span class="badge ${typeBadge[pl.type] ?? ''}">${esc(pl.type)}</span>
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
      <td class="sub">${esc(c.note || '')}</td>
      <td class="row-actions">
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
    ['address', 'city', 'ptype', 'status', 'vraagprijs', 'viewingDate', 'source', 'note'].forEach(k => form.elements[k].value = d[k] ?? '');
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
    ['address', 'city', 'ptype', 'status', 'label', 'taxatie', 'taxatieDatum', 'vraagprijs', 'teKoopSinds', 'vasteLasten', 'maandhuur', 'huurder', 'note', 'm2', 'kamers', 'webOmschrijving'].forEach(k => form.elements[k].value = p[k] ?? '');
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
    ['date', 'type', 'title', 'who'].forEach(k => form.elements[k].value = pl[k] ?? '');
  } else {
    form.elements.date.value = presetDate || todayISO();
  }
  $('#plan-modal').showModal();
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
      source: str('source'), note: str('note'),
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
        viewings: [], offers: [], note: `Aangekocht via ${d.ref}. ${d.note || ''}`.trim()
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
      m2: num('m2'), kamers: num('kamers'), webOmschrijving: str('webOmschrijving')
    };
    if (base.status === 'Te koop' && !base.teKoopSinds) base.teKoopSinds = todayISO();
    if (id) {
      const p = propertyById(id);
      const oldSale = p.sale;
      Object.assign(p, base);
      p.sale = oldSale; // verkoopafronding alleen via sale-modal
    } else {
      state.properties.push(Object.assign({ id: uid('pnd'), ref: nextRef('PND', state.properties), sale: null, dealId: '', docs: DEFAULT_DOCS.map(name => ({ id: uid('doc'), name, done: false })), viewings: [], offers: [] }, base));
    }
    showToast(`Pand ${base.address} opgeslagen.`);
  }

  if (formId === 'project-form') {
    const base = { name: str('name'), propertyId: data.get('propertyId'), status: str('status'), budget: num('budget'), startDate: data.get('startDate') || '', endDate: data.get('endDate') || '', note: str('note') };
    if (id) Object.assign(projectById(id), base);
    else state.projects.push(Object.assign({ id: uid('prj'), ref: nextRef('PRJ', state.projects), phases: DEFAULT_PHASES.map(name => ({ id: uid('ph'), name, status: 'Te doen' })), opleverpunten: [] }, base));
    showToast(`Project "${base.name}" opgeslagen.`);
  }

  if (formId === 'cost-form') {
    const base = { propertyId: data.get('propertyId'), projectId: data.get('projectId') || '', contactId: data.get('contactId') || '', desc: str('desc'), category: str('category'), amount: num('amount'), date: data.get('date'), status: str('status') };
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
      showToast(`${p.address} verkocht voor ${fmtMoney(p.sale.verkoopprijs)} — winst ${fmtMoney(fin.winst)} (${fmtNum(fin.roi, 1)}% ROI).`);
      setView('sales');
      return;
    }
  }

  if (formId === 'plan-form') {
    const base = { date: data.get('date'), type: str('type'), title: str('title'), who: str('who'), ref: data.get('ref') || '' };
    if (id) Object.assign(state.planning.find(x => x.id === id), base);
    else state.planning.push(Object.assign({ id: uid('pl') }, base));
    showToast('Planning opgeslagen.');
  }

  rerender();
}

/* ---------- Print (dealcalculatie voor financier) ---------- */
function buildCalcPrintDoc(title, subtitle, c) {
  const s = state.settings;
  return `
    <header class="doc-head">
      <div>
        <img src="assets/logo-dark.png" alt="" class="doc-logo">
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
      state.planning.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(pl => rows.push([pl.date, pl.type, pl.title, pl.who, refLabel(pl.ref)]));
      name = 'planning'; break;
    case 'relations':
      rows = [['Naam', 'Type', 'Contactpersoon', 'Email', 'Telefoon', 'Adres', 'Notitie']];
      state.contacts.forEach(c => rows.push([c.name, c.type, c.contact, c.email, c.phone, c.address, c.note]));
      name = 'relaties'; break;
    case 'inbox':
      rows = [['Datum', 'Type', 'Naam', 'Contact', 'E-mail', 'Telefoon', 'Portfolio', 'Betreft', 'Bericht', 'Status']];
      loadInbox().forEach(l => rows.push([l.date, l.type, l.name, l.contact, l.email, l.phone, l.portfolio, l.subject, l.message, l.handled ? 'Afgehandeld' : 'Nieuw']));
      name = 'aanvragen'; break;
    default:
      downloadBackup();
      return;
  }
  downloadFile(`homeinn-${name}-${t}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
  showToast(`Export "${name}" gedownload als CSV.`);
}

/* Aanbod publiceren: panden Te koop / Onder bod → aanbod.json voor de website */
function buildAanbodJson() {
  const aanbod = state.properties
    .filter(p => p.status === 'Te koop' || p.status === 'Onder bod')
    .map(p => ({
      id: p.ref, adres: p.address, plaats: p.city, type: p.ptype, status: p.status,
      prijs: Number(p.vraagprijs) || 0, label: p.label || '',
      m2: Number(p.m2) || 0, kamers: Number(p.kamers) || 0,
      omschrijving: p.webOmschrijving || ''
    }));
  const verkocht = state.properties
    .filter(p => p.status === 'Verkocht')
    .slice(-6)
    .map(p => ({ adres: p.address, plaats: p.city, type: p.ptype, label: p.label || '' }));
  return JSON.stringify({ bijgewerkt: todayISO(), aanbod, verkocht }, null, 2);
}

function publishAanbod() {
  const teKoop = state.properties.filter(p => p.status === 'Te koop' || p.status === 'Onder bod');
  const zonderInfo = teKoop.filter(p => !p.webOmschrijving || !Number(p.vraagprijs));
  if (zonderInfo.length) showToast(`Tip: ${zonderInfo.map(p => p.address).join(', ')} mist nog een vraagprijs of website-omschrijving (Pand bewerken → Website-presentatie).`);
  downloadFile('aanbod.json', buildAanbodJson(), 'application/json');
  setTimeout(() => showToast(`aanbod.json gedownload met ${teKoop.length} woning${teKoop.length === 1 ? '' : 'en'}. Vervang het bestand in je software-map en op je hosting.`), zonderInfo.length ? 3700 : 0);
}

function downloadBackup() {
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
    // Portfolio
    case 'open-property': setView('portfolio', 'property', id); break;
    case 'back-to-portfolio': setView('portfolio'); break;
    case 'edit-property': openPropertyModal(id); break;
    case 'del-property': {
      const p = propertyById(id);
      const linked = state.projects.some(pr => pr.propertyId === id) || state.costs.some(k => k.propertyId === id);
      if (linked) { showToast(`${p.address} heeft gekoppelde projecten of kosten — verwijder die eerst.`); break; }
      if (confirmDel(`Pand "${p.address}" verwijderen?`)) { state.properties = state.properties.filter(x => x.id !== id); rerender(); showToast('Pand verwijderd.'); }
      break;
    }
    case 'toggle-doc': {
      const p = propertyById(id);
      const doc = p.docs.find(x => x.id === item);
      doc.done = !doc.done; rerender();
      break;
    }
    case 'del-doc': {
      const p = propertyById(id);
      p.docs = p.docs.filter(x => x.id !== item); rerender();
      break;
    }
    case 'new-project-for': openProjectModal(null, id); break;
    case 'new-cost-for': openCostModal(null, { propertyId: id }); break;
    case 'new-cost-for-project': openCostModal(null, { projectId: id }); break;
    case 'viewing-for': openViewingModal(id); break;
    case 'offer-for': openOfferModal(id); break;
    case 'del-offer': {
      const p = propertyById(id);
      p.offers = (p.offers || []).filter(o => o.id !== item); rerender();
      break;
    }
    case 'del-viewing': {
      const p = propertyById(id);
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
      pr.phases = pr.phases.filter(x => x.id !== phase); rerender();
      break;
    }
    case 'toggle-oplever': {
      const pr = projectById(id);
      const o = pr.opleverpunten.find(x => x.id === item);
      o.done = !o.done; rerender();
      break;
    }
    case 'del-oplever': {
      const pr = projectById(id);
      pr.opleverpunten = pr.opleverpunten.filter(x => x.id !== item); rerender();
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
    case 'edit-contact': openContactModal(id); break;
    case 'del-contact': {
      const c = contactById(id);
      const used = state.deals.some(d => d.makelaarId === id) || state.costs.some(k => k.contactId === id) || state.properties.some(p => p.financing?.financierId === id);
      if (used) { showToast(`${c.name} is gekoppeld aan kansen, panden of kosten en kan niet worden verwijderd.`); break; }
      if (confirmDel(`Relatie "${c.name}" verwijderen?`)) { state.contacts = state.contacts.filter(x => x.id !== id); rerender(); showToast('Relatie verwijderd.'); }
      break;
    }
    // Taken & navigatie
    case 'toggle-task': {
      const task = state.tasks.find(x => x.id === id);
      task.done = !task.done; rerender();
      break;
    }
    case 'del-task': state.tasks = state.tasks.filter(x => x.id !== id); rerender(); break;
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
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const { action, id, item, phase } = el.dataset;
  switch (action) {
    case 'deal-status': {
      const d = dealById(id);
      d.status = el.value; rerender();
      if (el.value === 'Notaris') showToast('Plan de passeerafspraak in de planning en regel de bankgarantie.');
      break;
    }
    case 'bid-status': {
      const d = dealById(id);
      const b = d.biedingen.find(x => x.id === item);
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
      p.status = el.value;
      if (el.value === 'Te koop' && !p.teKoopSinds) p.teKoopSinds = todayISO();
      if (el.value === 'Te koop' && !p.label) showToast('Let op: energielabel is wettelijk verplicht bij verkoop.');
      rerender();
      break;
    }
    case 'offer-status': {
      const p = propertyById(id);
      const o = p.offers.find(x => x.id === item);
      o.status = el.value;
      if (el.value === 'Geaccepteerd' && p.status === 'Te koop') {
        p.status = 'Onder bod';
        showToast('Bod geaccepteerd — status naar Onder bod. Rond af via "Verkoop afronden".');
      }
      rerender();
      break;
    }
    case 'cost-status': state.costs.find(x => x.id === id).status = el.value; rerender(); break;
    case 'phase-status': {
      const pr = projectById(id);
      pr.phases.find(x => x.id === phase).status = el.value;
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
    if (form.dataset.form === 'add-phase') {
      const pr = projectById(form.dataset.id);
      pr.phases.push({ id: uid('ph'), name: String(data.get('name')).trim(), status: 'Te doen' });
    }
    if (form.dataset.form === 'add-oplever') {
      const pr = projectById(form.dataset.id);
      pr.opleverpunten.push({ id: uid('op'), desc: String(data.get('desc')).trim(), done: false });
    }
    if (form.dataset.form === 'add-doc') {
      const p = propertyById(form.dataset.id);
      p.docs.push({ id: uid('doc'), name: String(data.get('name')).trim(), done: false });
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

  // Live previews in modals
  $('#deal-form').addEventListener('input', refreshDealPreview);
  $('#sale-form').addEventListener('input', refreshSalePreview);

  // Annuleren/sluiten zijn géén submit-knoppen: anders is × de default button en gooit Enter alle invoer weg
  $$('.modal [value="cancel"], .modal .close').forEach(b => {
    b.type = 'button';
    b.addEventListener('click', () => b.closest('dialog')?.close());
  });

  // Aanbod publiceren
  $('#publish-aanbod').addEventListener('click', publishAanbod);

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
