# Wft/AFM — openstaande toets op het investeringsaanbod

Opgesteld 6 september 2026 tijdens de sitebrede audit. **Dit is geen juridisch advies.**
Het is een overdrachtsdocument: wat er op de site staat, welke regels erop kunnen zien,
en welke vragen een financieel-recht advocaat moet beantwoorden.

## Wat de site aanbiedt

`investeren.html` (en in kortere vorm `projecten.html`, `projectontwikkeling.html`,
`werkgebied.html` en de homepage) beschrijft:

- deelnemen met geld in één concreet verbouwproject van HomeINN;
- **streefrendement 7% per jaar** bij een looptijd van één jaar, per project schriftelijk
  vastgelegd in een **onderhandse overeenkomst**;
- inleg + rendement worden bij verkoop **uitgekeerd via de notaris**;
- inlegcategorieën in het formulier lopen van "tot € 25.000" tot "meer dan € 250.000";
- werving loopt via een openbaar toegankelijke webpagina met een aanvraagformulier.

## Waarom dit een toets verdient

Twee regimes kunnen hierop zien. Welke, hangt af van de juridische vormgeving van de
overeenkomst — en die staat niet in deze repository.

**1. Aantrekken van opvorderbare gelden (art. 3:5 Wft).**
Wie bedrijfsmatig opvorderbaar geld aantrekt van het publiek, mag dat in beginsel niet
zonder bankvergunning. De Vrijstellingsregeling Wft kent uitzonderingen, waaronder
aantrekken van professionele marktpartijen, bedragen van **€ 100.000 of meer per
tegenpartij**, en een **besloten kring**. Let op: de laagste inlegcategorie op de site
is nu "tot € 25.000", ruim onder die € 100.000-grens, en een openbare website met
formulier is lastig als besloten kring te verdedigen.

**2. Aanbieding van effecten → prospectusplicht.**
Is de deelname vormgegeven als een verhandelbaar recht (obligatie, participatie, note),
dan geldt de prospectusplicht. Nederland kent een vrijstelling voor aanbiedingen onder
**€ 5 miljoen per 12 maanden**, maar die vrijstelling is niet gratis: er geldt een
**meldplicht vooraf bij de AFM**, het verplichte **AFM-informatiedocument** moet
beschikbaar zijn, en in **elke uiting** (dus ook op de website) moet de
**vrijstellingsvermelding** staan — de zin *"Let op! U belegt buiten AFM-toezicht.
Geen prospectusplicht voor deze activiteit."* mét het voorgeschreven AFM-symbool.

## Wat op 6 september 2026 is aangepast

- De zin **"dit is geen aanbieding van effecten"** is overal verwijderd. Dat is een
  juridische kwalificatie die een aanbieder niet eenzijdig over zichzelf kan uitspreken;
  hij bood schijnzekerheid en zou bij een andere kwalificatie tegen HomeINN werken.
  Vervangen door een feitelijke beschrijving: *"Deze pagina is een uitnodiging tot
  kennismaking, geen aanbod: deelname komt pas tot stand na een persoonlijk gesprek en
  ondertekening van een individuele overeenkomst."*
- `projectontwikkeling.html` had negen "Investeer mee"-knoppen zonder enige
  risicovermelding; die staat er nu.
- `werkgebied.html` sprak van **"meefinancieren"**, wat naar een lening en daarmee naar
  art. 3:5 Wft wijst. Gewijzigd naar "meedoen in", met risicozin.
- De looptijd was intern tegenstrijdig (7% "bij één jaar" tegenover een formulier met
  "langer dan twee jaar"); dat is eenduidig gemaakt.
- De risicozin staat nu op elke pagina waar een rendement of een investeringsknop staat.

**Bewust niet gedaan:** er is géén AFM-vrijstellingsvermelding toegevoegd. Welke van de
twee verplichte zinnen van toepassing is — en óf er een van toepassing is — hangt af van
de juridische vormgeving. Een verkeerde vermelding is zelf een overtreding.

## Vragen voor de advocaat financieel recht

1. Is de deelname civielrechtelijk een **geldlening** (opvorderbare gelden, art. 3:5 Wft)
   of een **effect** (prospectusplicht)? Lever de modelovereenkomst aan.
2. Bij geldlening: op welke vrijstelling steunt HomeINN? Zo ja, moet de minimale inleg
   dan naar **€ 100.000** en moeten de lagere inlegcategorieën uit het formulier?
3. Bij effecten: is de **AFM-melding** gedaan, bestaat het **informatiedocument**, en
   moet de **vrijstellingsvermelding + symbool** op alle uitingen?
4. Blijft het totaal aangetrokken bedrag onder **€ 5 miljoen per 12 maanden**? Wie
   bewaakt die teller?
5. Mag "streefrendement 7% per jaar" zo prominent in een hero staan, of moet de
   risicovermelding daar even zwaar aangezet worden?

## Waar het in de code staat

| Bestand | Wat |
|---|---|
| `investeren.html` | hero met 7%, stappenplan, formulier, `.iv-disclaimer` (volledige risicotekst) |
| `projecten.html` | `.pj-disclaimer` |
| `projectontwikkeling.html` | `.pf-risico` onder de portefeuille |
| `homeinn-public.html` | `.hero-risico`, `.pa-note`, FAQ-antwoord + hetzelfde antwoord in de FAQPage JSON-LD |
| `werkgebied.html` | `.wg-note` |
| `voorwaarden.html` | artikel over deelname in projecten |

Wijzigt de risicotekst, wijzig hem dan **ook in de JSON-LD** van `homeinn-public.html`,
anders geeft Google een ander antwoord dan de pagina.
