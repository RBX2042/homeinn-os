# Wft/AFM — het investeringsaanbod van HomeINN

Herschreven 19 september 2026 op basis van een onderzoek waarin elke bewering door twee
onafhankelijke toetsers tegen de opgegeven bron is gehouden. Van 32 beweringen zijn er 18
overeind gebleven; wat hieronder staat is uitsluitend dat wat de bron daadwerkelijk draagt.
**Dit is geen juridisch advies.** Het is een overdrachtsdocument voor een advocaat
financieel recht, met de feiten uit de eigen code erbij die zo'n advocaat anders niet ziet.

> **Correctie op de vorige versie van dit document.** Die noemde een "vrijstelling vanaf
> € 100.000 per tegenpartij" in de Vrijstellingsregeling Wft. Dat is onjuist. De
> Vrijstellingsregeling bevat voor een vastgoedontwikkelaar géén vrijstelling van het
> verbod in art. 3:5 Wft. De € 100.000 is de drempel waarboven een tegenpartij als
> *professionele marktpartij* geldt (art. 3 lid 2 Besluit definitiebepalingen Wft) — en
> daarmee niet tot "het publiek" behoort. Dat is een andere route met andere gevolgen.

---

## 1. De kernvondst: de site en het contract beschrijven twee verschillende producten

Dit is belangrijker dan elke kwalificatievraag, want het bepaalt welke regels gelden én is
op zichzelf al een probleem.

| | De website (`investeren.html`) | De modelovereenkomst (`app.js:3176-3180`) |
|---|---|---|
| Wat de investeerder krijgt | "Bij verkoop wordt uw inleg plus het afgesproken rendement uitgekeerd via de notaris" (regel 139) | Rendement **jaarlijks uit te keren**; **hoofdsom terugbetaald aan het einde van de looptijd** |
| Koppeling aan een pand | Uitkering gekoppeld aan de verkoop van dát pand | Vordering op "de Onderneming" (HomeINN B.V.) |
| Rang van de inleg | **niet genoemd** — het woord *achtergesteld* komt op geen enkele publieke pagina voor | "De inleg dient als **achtergestelde** financiering" |
| Rendement | "streefrendement 7% per jaar" (regels 124, 127, 138, 144) | één `rendementPct` per project, voor iedere investeerder gelijk (`app.js:236, 1968, 1974`) |

Gevolgen:

1. **Achterstelling is een materieel risicokenmerk dat in de werving ontbreekt.** Bij
   faillissement staat een achtergestelde schuldeiser achter alle gewone schuldeisers. Dat
   hoort op de pagina zelf, niet pas in het contract — ongeacht welk toezichtregime geldt
   (art. 4:19 Wft: informatie moet correct, duidelijk en niet misleidend zijn; en de regels
   over oneerlijke handelspraktijken).
2. **Welke van de twee is de echte afspraak?** Uitkering bij verkoop van het pand wijst
   richting *beleggingsobject* (art. 1:1 Wft, zie § 4); een achtergestelde lening aan
   HomeINN B.V. wijst richting *opvorderbare gelden* (art. 3:5 Wft, zie § 2). De site zegt
   het een, het contract het ander.
3. **Eén rendementspercentage per project voor alle investeerders is standaardisatie.**
   Dat is één van de drie elementen waarmee de AFM verhandelbaarheid (en dus "effect")
   toetst (zie § 3). Het verweer "individueel maatwerk" is daarmee moeilijk vol te houden.

De software kent verder een kapitaaloproep die extra stortingen pro rata over investeerders
verdeelt met een berekend aandeelspercentage (`app.js:1706-1718`) — een kenmerk van
eigen vermogen — en behandelt Wwft-identificatie als een afvinkpunt (`app.js:1975`). Er
is geen registratie van het per rollend twaalfmaandsvenster opgehaalde bedrag; alleen een
cumulatief totaal (`app.js:2568`).

---

## 2. Opvorderbare gelden (art. 3:5 Wft) — het regime dat op de huidige vormgeving het meest waarschijnlijk bijt

**Wettekst.** "Het is een ieder verboden in Nederland in de uitoefening van een bedrijf van
het publiek opvorderbare gelden aan te trekken, ter beschikking te verkrijgen of ter
beschikking te hebben." (art. 3:5 lid 1 Wft, geldend per 1 september 2026 —
https://wetten.overheid.nl/BWBR0020368).

**"Besloten kring" staat niet meer in de wet.** Tot 1 augustus 2014 luidde de tekst "buiten
besloten kring … van anderen dan professionele marktpartijen"; sindsdien staat er "van het
publiek" (vergelijking van de versies 2014-01-01 en 2014-08-01 op wetten.overheid.nl). De
wetgever bedoelde daarmee geen inhoudelijke wijziging; de oude begrippen blijven de maatstaf
bij de uitleg van "publiek" (MvT Kamerstuk 33849 nr. 3 —
https://zoek.officielebekendmakingen.nl/kst-33849-3.html). In 2026 bevestigt de wetgever
opnieuw dat aantrekken van professionele marktpartijen buiten het verbod blijft (MvT
Kamerstuk 36885 nr. 3, § 7.1.1 — https://zoek.officielebekendmakingen.nl/kst-36885-3.html).

**De drempel voor "professionele marktpartij": € 100.000, ineens verstrekt** (art. 3 lid 2
Besluit definitiebepalingen Wft — https://wetten.overheid.nl/BWBR0020412; vóór 2012 was
dit € 50.000). Het formulier op `investeren.html` biedt "tot € 25.000", "€ 25.000 – 50.000"
en "€ 50.000 – 100.000": al die deelnemers zijn per definitie *publiek*.

**Er is geen passende vrijstelling.** § 3.2 van de Vrijstellingsregeling Wft (art. 19 t/m
24c, versie 1 januari 2026 — https://wetten.overheid.nl/BWBR0020536/2026-01-01) kent
uitsluitend situatieve vrijstellingen: notarissen, betaaldienstverleners, trustkantoren,
Europese crowdfunding (art. 24b), kansspelen. Niets voor een vastgoedontwikkelaar.

**De vier uitwegen die de wet wél kent** (art. 3:5 lid 2, 3 en 4 Wft):
- uitsluitend werven bij professionele marktpartijen (≥ € 100.000 ineens per deelnemer);
- financieren met **effecten** aangeboden conform de Prospectusverordening (lid 2 onder d)
  — dan geldt § 3;
- crowdfunding via een platform met ECSP-vergunning (art. 24b Vrijstellingsregeling);
- een ontheffing van DNB (lid 4).

**Een website is geen besloten kring.** De AFM stelt in haar AIFMD-Q&A dat een aanbod via een
website "per definitie gericht [is] aan meer dan 150 personen" (versie juli 2026, p. 12 —
https://www.afm.nl/~/profmedia/files/doelgroepen/aifm/aifmd-faq.pdf). Die uitspraak staat
in de context van art. 2:66a Wft, maar de gedachtegang ondermijnt elke verdediging die op
een beperkte kring steunt: `investeren.html` is openbaar, indexeerbaar, heeft een canonical
en een open aanvraagformulier.

**Toezicht en sanctie.** Dit is DNB-terrein. De opgegeven boetecategorie 3 (basisbedrag
€ 2.500.000, maximum € 5.000.000) en de strafbaarstelling via de WED zijn in het onderzoek
genoemd maar **niet zelfstandig tegen de bron geverifieerd** — laat de advocaat dit
bevestigen.

---

## 3. Prospectusplicht — geldt alleen als de deelname een *effect* is

**Verhandelbaarheid is het scharnier, en de AFM toetst economisch, niet formeel.** "Alle
constructies waarbij het economische belang van een gestandaardiseerd waardebewijs of
deelnemingsrecht middellijk of onmiddellijk wordt of kan worden overgedragen aan een derde,
beschouwt de AFM als verhandelbare waardebewijzen of deelnemingsrechten." (Beleidsregel
verhandelbaarheid, geldend sinds 15 februari 2011 —
https://wetten.overheid.nl/BWBR0029573). Het etiket "onderhandse overeenkomst" is dus geen
verweer; standaardisatie (één percentage per project, § 1) weegt mee.

**"Aanbieding aan het publiek" is breed:** "een in om het even welke vorm en met om het even
welk middel tot personen gerichte mededeling waarin voldoende informatie over de voorwaarden
van de aanbieding en de aangeboden effecten wordt verstrekt om een belegger in staat te
stellen tot aankoop te besluiten" (art. 2 onder d Verordening (EU) 2017/1129, versie 5 juni
2026 — https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:02017R1129-20260605).
De huidige tekst "uitnodiging tot kennismaking, geen aanbod" op `investeren.html` is daartegen
verdedigbaar maar kwetsbaar: de pagina noemt 7% per jaar, looptijd, inlegcategorieën en
concrete adressen.

**Twee drempels naast elkaar.** Sinds 5 juni 2026 gaat de AFM uit van de verhoogde
vrijstellingsgrens van **€ 12 miljoen** per twaalf maanden (art. 3 lid 2
Prospectusverordening; AFM-pagina Prospectusplicht —
https://www.afm.nl/nl-nl/sector/effectenuitgevende-ondernemingen/prospectustoezicht/prospectusplicht),
terwijl **art. 53 Vrijstellingsregeling Wft nog € 5 miljoen** noemt. Welke grens HomeINN
aanhoudt en of de nationale verplichtingen boven € 5 miljoen doorlopen, is een vraag voor de
advocaat.

**Aan de vrijstelling hangt een meldplicht VOORAF** (art. 53 lid 3 onder a Vrijstellingsregeling
— https://wetten.overheid.nl/BWBR0020536): melding bij de AFM met elf gegevens, waaronder
namen en geboortedata van bestuurders, de website, de maximale omvang, de aanbiedingsperiode
en "een kopie van het aanbiedingsdocument en eventueel reclamemateriaal" — dus van de site
zelf. Daarnaast het informatiedocument volgens bijlage A en de vrijstellingsvermelding in
elke uiting. In de repository is geen spoor van een melding.

---

## 4. Beleggingsinstelling en beleggingsobject

**Beleggingsinstelling (AIFMD) — waarschijnlijk niet, en dat is het sterkste argument dat
HomeINN heeft.** Een vehikel is alleen een instelling voor collectieve belegging als het
géén algemeen zakelijk of bedrijfsdoel heeft; "de bouw van onroerend goed" als voornaamste
activiteit is zo'n bedrijfsdoel (AFM AIFMD-Q&A, juli 2026, p. 49-50). HomeINN koopt op eigen
naam, laat bouwen en verkoopt. Bovendien kwalificeert een vehikel dat uitsluitend *vreemd
vermogen* ophaalt niet als abi, en achterstelling alléén maakt het nog geen eigen vermogen
(p. 8). Keerzijde: wordt het rendement winstafhankelijk gemaakt ("deel van de
verkoopwinst"), dan kan de AFM het als eigen vermogen herkwalificeren. Het soort activa
(vastgoed) is uitdrukkelijk irrelevant.

**Beleggingsobject (art. 1:1 Wft)** — "een zaak, een recht op een zaak of een recht op het
… rendement in geld of een gedeelte van de opbrengst van een zaak … welke anders dan om
niet wordt verkregen, bij welke verkrijging aan de verkrijger een rendement in geld in het
vooruitzicht wordt gesteld en waarbij het beheer van de zaak hoofdzakelijk wordt uitgevoerd
door een ander dan de verkrijger" (https://wetten.overheid.nl/BWBR0020368/2026-09-01).
Drie van de vier elementen zijn vervuld. Het vierde — recht op de opbrengst van een
*specifiek pand* — is precies waar site en contract elkaar tegenspreken (§ 1). Aanbieden van
beleggingsobjecten is vergunningplichtig (art. 2:55 Wft) met een vrijstelling vanaf
€ 100.000 nominaal per object (art. 2:59 Wft).

---

## 5. Reclame en de vrijstellingsvermelding

- Er zijn **drie** varianten, niet twee: bijlage 1.1 (vergunningplicht), 1.2
  (prospectusplicht) en **1.3 gecombineerd** (Nrgfo Wft art. 2:1 lid 2 —
  https://wetten.overheid.nl/BWBR0020540). Als zowel de vergunning- als de
  prospectusvrijstelling geldt, is 1.1 of 1.2 gebruiken fout.
- De uitleg staat in **hoofdstuk 11** van de Beleidsregel Informatieverstrekking (3e versie,
  30 september 2024); de AFM-site verwijst nog naar het verouderde hoofdstuk 7.
- Het symbool is een onsplitsbare banner (tekst + pictogram in één bestand, 1063×40 of
  797×58 px), te downloaden via https://www.afm.nl/vrijstellingsvermelding; de oorspronkelijke
  verhouding mag niet worden gewijzigd (art. 2:1 lid 4 Nrgfo).
- De letterlijke teksten en de exacte plaatsingseisen (o.a. bovenaan, volle breedte,
  minimaal 10% van de hoogte van de uiting — art. 2:1 lid 5 sub c Nrgfo) zijn in het
  onderzoek niet sluitend tegen de geldende regelingtekst geverifieerd; de bijlagen staan
  op wetten.overheid.nl als afbeeldingen. Laat de advocaat de definitieve variant en
  plaatsing aanwijzen.
- Op de site staat nu **geen enkele** vrijstellingsvermelding. Dat is bewust: welke variant
  geldt, hangt af van de kwalificatie, en een verkeerde vermelding is zelf een overtreding.
  De site telt 287 uitingen die naar meedoen/investeren verwijzen, op 31 pagina's; de
  meta-tags en JSON-LD tellen mee.

---

## 6. Wat op 19 september 2026 op de site staat (en waarom)

- Alle rendementsvermeldingen dragen risicotaal in het blok zelf; de snippet-teksten
  (meta/og) noemen geen kaal percentage meer.
- "Dit is geen aanbieding van effecten" is overal verwijderd — een aanbieder kan die
  kwalificatie niet over zichzelf uitspreken.
- De zin "uitnodiging tot kennismaking, geen aanbod" staat er wél; zie § 3 voor de
  kwetsbaarheid daarvan.
- **Niet gedaan, en dat kan ik niet zelf:** het woord *achtergesteld* toevoegen aan de
  werving. Dat mag alleen als de echte overeenkomst dat ook zegt — en juist dát staat ter
  discussie (§ 1).

---

## 7. De vragen voor de advocaat, in volgorde van gewicht

1. **Welk product is het echt?** Lever de daadwerkelijk ondertekende overeenkomst aan (niet
   de modeltekst uit de software). Jaarlijkse rente + hoofdsom terug (lening aan HomeINN
   B.V.), of uitkering uit de verkoopopbrengst van één pand? Alles hieronder hangt hiervan af.
2. **Is de inleg achtergesteld?** Zo ja: dat moet in de werving; hoe formuleren we dat?
3. Bij een lening: is er een overtreding van art. 3:5 Wft, en welke van de vier uitwegen
   is werkbaar — professionele marktpartijen (minimuminleg € 100.000 ineens; dan moeten de
   lagere categorieën van het formulier af), effecten conform de Prospectusverordening,
   ECSP-platform, of DNB-ontheffing? Is een reikwijdtevraag bij DNB verstandig? Wat betekent
   dit voor al gesloten overeenkomsten?
4. Bij effecten: loop het stroomschema van de Beleidsregel verhandelbaarheid af, met de
   standaardisatie uit § 1 als gegeven. Geldt € 12 miljoen of € 5 miljoen? Is de melding
   vooraf gedaan, bestaat het informatiedocument, en welke vrijstellingsvermelding (1.1, 1.2
   of 1.3) hoort waar?
5. Bij een recht op de opbrengst van een pand: beleggingsobject (art. 2:55 Wft)? Moet de
   minimale inleg dan naar € 100.000?
6. Blijft HomeINN buiten de AIFMD op grond van het algemene bedrijfsdoel, en verandert dat
   als meerdere investeerders in één pand meedoen of als de kapitaaloproep (§ 1) wordt
   gebruikt?
7. Is HomeINN Wwft-plichtig bij het aannemen van deze gelden, en wat moet vóór de eerste
   storting zijn vastgelegd?
8. Mag "streefrendement 7% per jaar" zo prominent in een kop staan (risico's "even
   inzichtelijk" als voordelen, Beleidsregel Informatieverstrekking § 2.2.3), en welke
   essentiële gegevens (kosten, achterstelling, zekerheden, opzegging, eigendomspositie)
   ontbreken nu op de pagina?
9. Wie houdt het per rollend twaalfmaandsvenster opgehaalde bedrag bij, over welke
   groepsentiteiten?

## 8. Wat er tot die antwoorden binnen zijn moet gebeuren

De site mag met de investeringspagina's in de huidige vorm **niet zonder juridisch oordeel
live**. Minimaal veilig tot dan: de investeringspagina's tijdelijk niet indexeren en de
inlegcategorieën onder € 100.000 uit het formulier halen, óf de pagina terugbrengen tot een
kennismakingsuitnodiging zonder rendementspercentage. Dat is een keuze van de eigenaar.

## Waar het in de code staat

| Bestand | Wat |
|---|---|
| `investeren.html` | hero met 7%, uitkering via notaris (r. 139), formulier met inlegcategorieën (r. 184-191), `.iv-disclaimer` |
| `app.js:3176-3180` | modelovereenkomst: jaarlijkse rente, hoofdsom terug, **achtergesteld**, Wwft |
| `app.js:236, 1968, 1974` | één `rendementPct` per project |
| `app.js:1706-1718` | kapitaaloproep pro rata (eigen-vermogenskenmerk) |
| `app.js:2568` | alleen cumulatief totaal, geen twaalfmaandsteller |
| `projecten.html`, `projectontwikkeling.html`, `werkgebied.html`, `homeinn-public.html` | overige uitingen + risicotaal; FAQ óók in JSON-LD |
| `voorwaarden.html` | artikel deelname (uitnodiging tot gesprek, geen aanbod) |
