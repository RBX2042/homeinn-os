# Opdracht aan een advocaat financieel recht — het investeringsaanbod van HomeINN

**Opgesteld:** 20 september 2026 · **Opdrachtgever:** HomeINN B.V., Rotterdam
**Onderwerp:** kwalificatie en toelaatbaarheid van de deelnamestructuur op `homeinn.nl/investeren.html`
**Bijlage bij dit stuk:** `COMPLIANCE-INVESTEREN.md` (feitenonderzoek 19 september 2026, met bronnen)
**Tweede bijlage:** `ONDERZOEK-STRUCTUREN-INVESTEREN.md` (praktijkonderzoek 20 september 2026:
hoe Nederlandse vastgoedpartijen dit inrichten — obligatielening, stichting obligatiehouders,
prospectusvrijstelling met melding en informatiedocument, ECSP-platform)

> Dit document is geen juridisch advies en is niet door een jurist opgesteld. Het is een
> overdrachtsdocument: het zet de feiten uit onze eigen website en software op een rij die
> een advocaat anders niet te zien krijgt, en stelt de vragen die wij beantwoord willen
> hebben. Alle wetsverwijzingen zijn overgenomen uit het bijgevoegde feitenonderzoek en
> moeten door u worden geverifieerd.

---

## 1. Begeleidende e-mail (knip-en-plak)

> Geachte heer/mevrouw,
>
> HomeINN B.V. koopt, verbouwt en verkoopt woningen in Rotterdam en omstreken. Wij laten
> particulieren en zakelijke relaties meedoen in onze projecten: zij stellen een bedrag ter
> beschikking en ontvangen daarover een vooraf vastgelegd rendement.
>
> Bij een interne controle van onze website en administratiesoftware is gebleken dat onze
> publieke werving en onze modelovereenkomst twee verschillende producten beschrijven. Dat
> raakt de vraag welk toezichtregime van toepassing is (art. 3:5 Wft, prospectusplicht,
> beleggingsobject) en of onze huidige werving toelaatbaar is.
>
> Wij vragen u om een schriftelijk oordeel. Bijgevoegd vindt u een overdrachtsdocument met
> de feiten, negen concrete vragen en de stukken. Wij ontvangen graag eerst een korte
> inschatting van doorlooptijd en kosten. Het onderwerp is voor ons urgent: er zijn reeds
> overeenkomsten gesloten en de pagina is publiek toegankelijk.
>
> Met vriendelijke groet,
> [naam] — HomeINN B.V.

---

## 2. Wat HomeINN aanbiedt (feitelijk, zoals het nu op de site staat)

- **Product:** deelname per project. De investeerder stelt een bedrag ter beschikking; HomeINN
  koopt het pand op eigen naam, verbouwt het met vaste bouwpartner Lageweg Services B.V. en
  brengt het daarna op de markt.
- **Rendement:** "streefrendement 7% per jaar", per project vooraf schriftelijk vastgelegd,
  uitdrukkelijk niet gegarandeerd.
- **Looptijd:** vanaf één jaar.
- **Uitkering (volgens de site):** "bij verkoop wordt uw inleg plus het afgesproken rendement
  uitgekeerd via de notaris".
- **Minimale deelname:** € 100.000 ineens per deelnemer (sinds 20 september 2026, zie § 5).
- **Hoe het loopt:** de bezoeker vraagt via een formulier projectinformatie aan; er volgt een
  persoonlijk gesprek; daarna wordt een individuele overeenkomst getekend. De site noemt
  zichzelf een "uitnodiging tot kennismaking, geen aanbod".
- **Portefeuille:** 11 panden in Rotterdam en Vlaardingen, 33 appartementsrechten na splitsing,
  getaxeerde waarde na renovatie € 14,8 mln, renovatiebudget € 3,9 mln.

## 3. Het kernprobleem: site en contract beschrijven niet hetzelfde product

| | Website (`investeren.html`) | Modelovereenkomst in onze software (`app.js:3176-3180`) |
|---|---|---|
| Wat de investeerder krijgt | uitkering van inleg + rendement **bij verkoop van het pand**, via de notaris | rendement **jaarlijks** uit te keren; **hoofdsom aan het einde van de looptijd** terug |
| Koppeling aan een pand | aan de verkoop van dát pand | vordering op "de Onderneming" (HomeINN B.V.) |
| Rang van de inleg | **niet genoemd**; het woord *achtergesteld* staat op geen enkele publieke pagina | "De inleg dient als **achtergestelde** financiering" |
| Rendement | "streefrendement 7% per jaar" | één percentage per project, voor iedere investeerder gelijk |

De letterlijke clausules uit de modelovereenkomst staan in bijlage B hieronder.

Drie gevolgen die wij zelf al zien:

1. **Achterstelling ontbreekt in de werving.** Bij faillissement staat een achtergestelde
   schuldeiser achter alle gewone schuldeisers. Dat is een materieel risicokenmerk.
2. **De kwalificatie hangt hieraan.** Uitkering bij verkoop van een specifiek pand wijst
   richting *beleggingsobject* (art. 1:1 en 2:55 Wft); een achtergestelde lening aan de
   vennootschap wijst richting *opvorderbare gelden* (art. 3:5 Wft).
3. **Eén rendementspercentage per project voor alle investeerders is standaardisatie** — een
   van de elementen waarmee de AFM verhandelbaarheid toetst (Beleidsregel verhandelbaarheid).

Verder in onze software: een kapitaaloproep die extra stortingen pro rata over investeerders
verdeelt met een berekend aandeelspercentage (`app.js:1706-1718`) — een kenmerk dat bij eigen
vermogen hoort; Wwft-identificatie als enkel afvinkpunt (`app.js:1975`); en geen registratie
van het per rollend twaalfmaandsvenster opgehaalde bedrag, alleen een cumulatief totaal
(`app.js:2568`).

---

## 4. De negen vragen

**1. Welk product is het werkelijk?**
Lever de daadwerkelijk ondertekende overeenkomst(en) aan, niet de modeltekst uit de software.
Jaarlijkse rente plus hoofdsom terug (lening aan HomeINN B.V.), of uitkering uit de
verkoopopbrengst van één pand? *Alles hieronder hangt hiervan af.*

**2. Is de inleg achtergesteld?**
Zo ja: dat moet in de werving staan. Hoe formuleren wij dat, en op welke plaatsen?

**3. Bij een lening — is art. 3:5 Wft overtreden, en welke uitweg is werkbaar?**
De vier routes uit het onderzoek: (a) uitsluitend professionele marktpartijen — minimuminleg
€ 100.000 ineens, art. 3 lid 2 Besluit definitiebepalingen Wft; (b) effecten conform de
Prospectusverordening; (c) een ECSP-platform; (d) ontheffing van DNB. Wij hebben route (a)
voorlopig ingericht (§ 5) — **is dat houdbaar, gegeven dat de pagina publiek vindbaar is?**
Is een reikwijdtevraag bij DNB verstandig? En wat betekent dit voor de reeds gesloten
overeenkomsten?

**3b. De scharniervraag uit ons praktijkonderzoek.** Art. 3:5 lid 2 Wft zondert gelden uit
die worden verkregen "als gevolg van het aanbieden van effecten". Geldt die uitzondering ook
wanneer wij een obligatielening uitgeven onder een beroep op de **vrijstelling** van de
prospectusplicht (dus zonder goedgekeurd prospectus), mits wij vooraf melden, het
informatiedocument beschikbaar stellen en de vrijstellingsvermelding gebruiken? Daarop staat
of valt de hele structuur die in Nederland gangbaar is.

**4. Bij effecten — loop het stroomschema van de Beleidsregel verhandelbaarheid af**, met de
standaardisatie uit § 3 als gegeven. Geldt de grens van € 12 miljoen (art. 3 lid 2
Prospectusverordening, door de AFM gehanteerd sinds 5 juni 2026) of de € 5 miljoen uit
art. 53 Vrijstellingsregeling Wft? Is de meldplicht vooraf van toepassing, bestaat het
informatiedocument volgens bijlage A, en welke vrijstellingsvermelding (Nrgfo bijlage 1.1,
1.2 of de gecombineerde 1.3) hoort waar? **In onze administratie is geen spoor van een
melding bij de AFM.**

**5. Bij een recht op de opbrengst van een pand — is het een beleggingsobject** (art. 1:1
Wft)? Drie van de vier elementen lijken vervuld; het vierde is precies het punt waarop site
en contract elkaar tegenspreken. Moet de minimale inleg dan € 100.000 nominaal per object
zijn (art. 2:59 Wft)?

**6. Blijft HomeINN buiten de AIFMD** op grond van het algemene bedrijfsdoel ("de bouw van
onroerend goed")? Verandert dat als meerdere investeerders in één pand meedoen, of als de
kapitaaloproep uit § 3 wordt gebruikt? Wat als het rendement winstafhankelijk zou worden
gemaakt?

**7. Is HomeINN Wwft-plichtig** bij het aannemen van deze gelden, en wat moet vóór de eerste
storting zijn vastgelegd? Wie is de UBO-controleur, en volstaat onze huidige vastlegging?

**8. Mag "streefrendement 7% per jaar" zo prominent staan?**
De Beleidsregel Informatieverstrekking (§ 2.2.3) eist dat risico's even inzichtelijk zijn als
de voordelen. Welke essentiële gegevens ontbreken nu op de pagina — kosten, achterstelling,
zekerheden, opzegging, eigendomspositie? Graag een concrete lijst van wat erbij moet.

**9. Wie bewaakt het opgehaalde bedrag per rollend twaalfmaandsvenster**, en over welke
groepsentiteiten wordt dat opgeteld? Onze software houdt alleen een cumulatief totaal bij.

---

## 4b. De vijf structuurvarianten die wij overwegen

Wat wij feitelijk willen: geld van derden gebruiken om een pand te kopen en te verbouwen,
tegen een vooraf afgesproken vergoeding, waarbij HomeINN eigenaar is en het werk doet.
Economisch is dat vreemd vermogen met een vaste vergoeding. Hieronder de routes die wij
kennen, met wat elk ervan van ons zou vragen. **Wij vragen u aan te geven welke route bij
onze situatie haalbaar is, en wat wij per route moeten inrichten.**

| | Route | Wat het betekent | Wat wij dan moeten regelen |
|---|---|---|---|
| **A** | Uitsluitend professionele marktpartijen — ≥ € 100.000 ineens per deelnemer (art. 3 lid 2 Besluit definitiebepalingen Wft) | Buiten "het publiek", dus buiten art. 3:5 Wft. Dit hebben wij nu ingericht. | De beperking moet feitelijk kloppen, niet alleen op de site staan: geen enkele deelnemer onder € 100.000, vastlegging per deelnemer, en de vraag of een publiek toegankelijke website hiermee verenigbaar is |
| **B** | Obligatielening als *effect*, aangeboden onder de prospectusvrijstelling (art. 3:5 lid 2 onder d Wft) | Wij mogen dan ook bedragen onder € 100.000 aantrekken, mits onder de vrijstellingsgrens en met de bijbehorende documenten | Melding vooraf bij de AFM met de elf gegevens (art. 53 lid 3 Vrijstellingsregeling), informatiedocument volgens bijlage A, vrijstellingsvermelding in élke uiting, en bewaking van de grens per rollend twaalfmaandsvenster (€ 12 mln of € 5 mln — zie vraag 4) |
| **C** | Ophalen via een platform met ECSP-vergunning (art. 24b Vrijstellingsregeling) | Het platform draagt de vergunning en de informatieplichten | Selectie van een platform, kosten en afdracht, en de vraag of onze projectstructuur erin past |
| **D** | Ontheffing van DNB (art. 3:5 lid 4 Wft) | Maatwerk | Aanvraagtraject; wij weten niet of dit realistisch is voor een partij van onze omvang |
| **E** | Geen geld lenen maar **mede-eigendom**: de investeerder neemt deel in het pand of in een vennootschap per pand | Geen terugbetalingsverplichting, dus art. 3:5 Wft speelt niet | Maar dan komt de AIFMD in beeld (beleggingsinstelling), plus notariële levering, splitsing van zeggenschap en een uitstapregeling. Ons huidige voordeel — "algemeen bedrijfsdoel, geen collectieve belegging" — kan daarmee juist wegvallen |

Onze voorlopige voorkeur is **A of B**, omdat die het dichtst bij onze huidige werkwijze
liggen. Wij horen graag of dat juist is, en met name:

- Kunnen wij route A houden terwijl onze website publiek toegankelijk blijft, of moet de
  werving dan achter een afgeschermde omgeving of buiten de site plaatsvinden?
- Als route B: wie doet de melding, welk informatiedocument hoort erbij, welke van de drie
  vrijstellingsvermeldingen, en wat betekent dat voor de reeds gesloten overeenkomsten?
- Is een combinatie denkbaar — bestaande deelnemers op de huidige voet, nieuwe onder een
  nieuwe structuur — of maakt dat de positie juist zwakker?

---

## 5. Wat wij al hebben aangepast (en bewust níét)

**Doorgevoerd op 19 en 20 september 2026:**

| Maatregel | Status |
|---|---|
| Zelfkwalificatie "geen aanbieding van effecten" verwijderd | gedaan (19 sep) |
| Investeringspagina's tijdelijk op `noindex`, uit de sitemap | gedaan 19 sep, **op 20 sep op verzoek van de eigenaar teruggedraaid** |
| Minimale deelname € 100.000 ineens: rekenvoorbeeld, formuliercategorieën, hero, "Belangrijk"-box | gedaan (20 sep) |
| Verplichte bevestiging in het aanvraagformulier dat de deelnemer als professionele marktpartij met ≥ € 100.000 ineens deelneemt; uitkomst wordt per lead vastgelegd | gedaan (20 sep) |
| Risicotekst bij elke rendementsvermelding ("niet gegarandeerd", "inleg kan geheel of gedeeltelijk verloren gaan") | aanwezig |
| Geen cookies, geen trackers, geen analytics; privacyverklaring bij elk formulier | aanwezig |

**Bewust niet gedaan, omdat het zonder uw oordeel niet kan:**

- het woord *achtergesteld* in de werving opnemen — dat mag alleen als de werkelijke
  overeenkomst dat bevestigt, en juist dat is vraag 1;
- een vrijstellingsvermelding plaatsen — er zijn drie varianten en de verkeerde variant is
  zelf een overtreding;
- een uitspraak doen over prospectusplicht of vergunningplicht.

---

## 6. Mee te sturen stukken

- [ ] **De daadwerkelijk ondertekende investeringsovereenkomst(en)** — alle varianten die in
      omloop zijn, niet de modeltekst
- [ ] Overzicht van de reeds aangetrokken gelden: per deelnemer bedrag, datum, looptijd,
      afgesproken rendement, en of het bedrag al is gestort
- [ ] Het totaal per rollend twaalfmaandsvenster, en over welke groepsentiteiten
- [ ] Een PDF of schermafdruk van `homeinn.nl/investeren.html` en `homeinn.nl/invest-en.html`
      zoals ze vandaag live staan
- [ ] `COMPLIANCE-INVESTEREN.md` (het feitenonderzoek met bronnen)
- [ ] Dit document
- [ ] Bijlage B hieronder (de modelovereenkomst uit onze software)
- [ ] Eventuele eerdere correspondentie met AFM of DNB — voor zover aanwezig

## 7. Feiten die alleen de eigenaar kan invullen

| Vraag | Antwoord |
|---|---|
| Hoeveel deelnemers zijn er nu? | … |
| Welk bedrag is in totaal aangetrokken? | … |
| Wat is het hoogste bedrag in één twaalfmaandsvenster? | … |
| Legt elke deelnemer € 100.000 of meer ineens in? Zo nee: hoeveel niet? | … |
| Welke entiteiten trekken gelden aan (alleen HomeINN B.V. of ook andere)? | … |
| Is er ooit een melding gedaan bij de AFM of DNB? | … |
| Is er per deelnemer een Wwft-dossier? | … |
| Wordt er geworven buiten de website (mail, telefoon, bijeenkomsten)? | … |

---

## Bijlage A — bronnen uit het feitenonderzoek

| Onderwerp | Bron |
|---|---|
| Art. 3:5 Wft, "van het publiek" | https://wetten.overheid.nl/BWBR0020368 |
| Wetsgeschiedenis besloten kring | Kamerstuk 33849 nr. 3 · Kamerstuk 36885 nr. 3, § 7.1.1 |
| Professionele marktpartij, € 100.000 ineens | Besluit definitiebepalingen Wft art. 3 lid 2 — https://wetten.overheid.nl/BWBR0020412 |
| Beleidsregel verhandelbaarheid (sinds 15 feb 2011) | https://wetten.overheid.nl/BWBR0029573 |
| Prospectusverordening, geconsolideerd 5 juni 2026 | https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:02017R1129-20260605 |
| AFM over prospectusplicht en de grens van € 12 mln | https://www.afm.nl/nl-nl/sector/effectenuitgevende-ondernemingen/prospectustoezicht/prospectusplicht |
| Vrijstellingsregeling Wft art. 53 (€ 5 mln, meldplicht vooraf) | https://wetten.overheid.nl/BWBR0020536 |
| Beleggingsobject, art. 1:1 Wft | https://wetten.overheid.nl/BWBR0020368/2026-09-01 |
| AIFMD-Q&A AFM (juli 2026), bedrijfsdoel p. 49-50, vreemd vermogen p. 8 | https://www.afm.nl/~/profmedia/files/doelgroepen/aifm/aifmd-faq.pdf |
| Vrijstellingsvermelding, drie varianten (Nrgfo art. 2:1) | https://wetten.overheid.nl/BWBR0020540 · https://www.afm.nl/vrijstellingsvermelding |

## Bijlage B — de modelovereenkomst uit onze software

Letterlijk overgenomen uit `app.js:3176-3182`, type *Investeringsovereenkomst* (`${...}` zijn
velden die per contract worden ingevuld):

> **De investering** — Investeerder verstrekt aan de Onderneming een bedrag van `${bedrag}`
> ten behoeve van `${onderwerp}`.
>
> **Rendement** — De Onderneming vergoedt over de inleg een rendement van
> `${rendementPct}% per jaar`, jaarlijks uit te keren.
>
> **Looptijd & terugbetaling** — De looptijd bedraagt `${looptijd}`. Aan het einde van de
> looptijd wordt de hoofdsom terugbetaald.
>
> **Risico** — Investeerder is ermee bekend dat aan investeren in vastgoed risico's verbonden
> zijn en dat rendement noch hoofdsom gegarandeerd zijn. De inleg dient als achtergestelde
> financiering.
>
> **Identiteit & Wwft** — Partijen voldoen aan de toepasselijke regelgeving, waaronder
> identificatie conform de Wwft.

## Bijlage C — waar het in de code en op de site staat

| Bestand | Wat |
|---|---|
| `investeren.html` / `invest-en.html` | hero met 7%, PMP-regel, rekenvoorbeeld, aanvraagformulier met bevestiging, "Belangrijk"-box |
| `app.js:3176-3182` | modelovereenkomst: jaarlijkse rente, hoofdsom terug, achtergesteld, Wwft |
| `app.js:236, 1968, 1974` | één `rendementPct` per project |
| `app.js:1706-1718` | kapitaaloproep pro rata (eigen-vermogenskenmerk) |
| `app.js:2568` | alleen cumulatief totaal, geen twaalfmaandsteller |
| `projecten.html`, `projectontwikkeling.html`, `werkgebied.html`, `homeinn-public.html` | overige uitingen en risicotaal; FAQ ook in JSON-LD |
| `voorwaarden.html` | artikel deelname (uitnodiging tot gesprek, geen aanbod) |
