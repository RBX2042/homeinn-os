# Claims die nog bewijs nodig hebben

Opgesteld 6 september 2026. Deze cijfers en beweringen staan op de site, komen elk
maar op één plek voor en zijn nergens in deze repository onderbouwd. Ze spreken niets
tegen — er is alleen geen bron. Bewaar per claim een document, dan is de site
verdedigbaar als een koper, investeerder of toezichthouder ernaar vraagt.

| Claim | Waar | Wat als bewijs volstaat |
|---|---|---|
| **"25+ panden door ons team aangekocht en ontwikkeld"** | `over-ons.html` (cijferbalk) | Lijst met adressen en transactiedata |
| **"€ 4 mln+ aan gerealiseerde verkopen door ons team"** | `over-ons.html` (cijferbalk) | Optelling van verkoopakten |
| **"ruim duizend vierkante meter woonoppervlak in actief beheer"** | `over-ons.html` (tijdlijn, "Nu") | Beheerovereenkomsten + m² per object |
| **"ruim twintig panden"** | `over-ons.html` (tijdlijn, 2014) | Zelfde lijst als bij "25+ panden" |
| **"Ervaring van het team sinds 2007"** | `over-ons.html`, meerdere pagina's | Eerste aankoopakte |
| **"advertentie op de grote huurplatforms (waaronder Pararius)"** | `verhuur.html` | Lopend account/abonnement bij Pararius |
| **"Reactie binnen vier uur op werkdagen"** | `investeren.html`, `contact.html` | Interne afspraak die ook echt gehaald wordt |
| **"Voorstel binnen 48 uur na de opname"** | 14 pagina's | Idem — dit is de kernbelofte van de verkoopfunnel |

## Wat wél is nagerekend en klopt

- **13 woningen op 8 locaties**: de som van `eenheden` in `aanbod.json` is exact 13,
  over 8 projecten. Consistent op alle acht pagina's waar het staat.
- **Beheertarieven**: 5% / minimaal € 95 (€ 114,95 incl. 21% btw) en 8% / minimaal
  € 135 (€ 163,35). De rekenmodule geeft bij € 1.200 huur € 135 per maand, effectief
  11,3% en netto € 1.065 — alle drie correct. Het omslagpunt "€ 1.688" klopt
  (135 / 0,08 = 1.687,50).
- **Bedrijfsgegevens**: KvK 96713437, btw NL867727548B01, Rosestraat 1321 en het
  telefoonnummer staan overal identiek, ook in alle JSON-LD.
- **Leestijden** van de drie kennisartikelen kloppen met het aantal woorden.
- **Cookieclaim**: er staat nergens in de HTML of JS een `document.cookie`, analytics-
  of trackingaanroep, dus "deze website plaatst geen cookies" is waar.

## Wie bouwt er — bevestigd op 6 september 2026

**HomeINN bouwt uitsluitend met Lageweg Services B.V.** Er is geen eigen
bouwpersoneel. Bevestigd door de eigenaar.

Bedrijfsgegevens van de bouwpartner (overgenomen van lagewegservices.nl,
gecontroleerd op 20 september 2026): Lageweg Services B.V., aannemersbedrijf in
Rotterdam en Hoogvliet, Klompenmakerstraat 125, 3194 DD Hoogvliet,
KvK 92560199, VCA-gecertificeerd. Hun site noemt HomeINN zelf als partner
(lagewegservices.nl/partner-homeinn) — de vermelding is dus wederzijds.
Logo en website staan op `projectontwikkeling.html`, `development-en.html`,
de partnerlijst op de homepage en in de footer van alle pagina's. Het logo is
hun eigen bestand (`assets/lageweg-services-logo.svg`); wijzigt hun huisstijl,
dan dit bestand verversen.

De site sprak op elf plekken over een "vast eigen bouwteam" en op twee plekken
over "onze eigen bouwpartner" — beide onjuist. Alles staat nu op **"onze vaste
bouwpartner"**, met de naam voluit op `over-ons.html` en
`projectontwikkeling.html`. Ook weggehaald: formuleringen die suggereerden dat
HomeINN zélf verbouwt ("zelf verbouwen met onze vaste bouwpartner",
"ontwikkelen en verduurzamen doen wij daarna zelf").

Let hierop bij nieuwe teksten: *aankopen*, *ontwikkelen sturen*, *verhuren*,
*beheren* en *verkopen* doet HomeINN zelf; **bouwen niet**. "Wij verbouwen" is
alleen correct met "met onze vaste bouwpartner" erbij.

## Openstaand

**Het investeringsaanbod** — zie `COMPLIANCE-INVESTEREN.md`.


## Leadformulieren: end-to-end getest (6 sep 2026)

Alle zeven formulieren zijn in de browser ingevuld en verstuurd. Elk schrijft de
aanvraag weg met het juiste leadtype en toont zijn eigen bevestiging:

| Pagina | Leadtype | Bevestiging |
|---|---|---|
| `contact.html` | Contact | ✓ |
| `investeren.html` | Investeerder | ✓ |
| `te-koop.html` | Aanbod-interesse | ✓ |
| `vastgoedbeheer.html` | Beheer-offerte | ✓ |
| `verhuur.html` | Huuraanvraag | ✓ |
| `homeinn-public.html` (modal) | Gesprek | ✓ |
| `pand-verkopen.html` (5 stappen) | Verkoopvoorstel | ✓ |

Ook getest met een **mislukte** bezorging: de lead blijft dan lokaal bewaard en de
bezoeker krijgt een foutmelding mét telefoonnummer, in plaats van een bevestiging.
Dat is het gedrag dat je wilt — een stil verdwenen lead is het ergste scenario.

**Bewust niet gedaan:** de `saveLead`-functie is op elke pagina een eigen kopie.
Dat is dubbele code, maar elke kopie stuurt andere velden mee en er is geen
testsuite. Samenvoegen raakt de omzetlijn van het bedrijf; de winst (minder
duplicatie) weegt niet op tegen het risico. De drie hulpfuncties eromheen
(`escHtml`, `_isBot`, `verwijderLokaleLead`) zijn wél identiek — die zijn een
veilige eerste stap als iemand dit later wil opruimen.

## Aanvulling 19 september 2026

**"Achtergesteld" staat nergens op de site.** De modelovereenkomst in de eigen software
(`app.js:3180`) noemt de inleg "achtergestelde financiering"; geen enkele publieke pagina
zegt dat. Als de echte overeenkomst dat ook bepaalt, is dat een materieel risicokenmerk
dat in de werving ontbreekt. Zie `COMPLIANCE-INVESTEREN.md` § 1 — dit is de eerste vraag
voor de advocaat en mag niet zonder bevestiging aan de site worden toegevoegd.

**`te-koop.html` is een permanent lege, wél geïndexeerde pagina.** `aanbod.json` heeft
`"aanbod": []` en `"tehuur": []`; de pagina staat in `sitemap.xml` met een canonical en
`CollectionPage`-schema, `woning.html` komt daardoor altijd in de niet-gevonden-staat en
`funda-feed.xml`/`pararius-feed.xml` zijn lege plaatshouders. Geen fout, wel een zwak
signaal naar zoekmachines zolang er niets te koop staat — overweeg `noindex` tot de eerste
oplevering.

## Fase per pand (investeerderstools, 19 sep 2026)
`portefeuille.json` zet voor alle elf panden `fase: 2` (Planvorming & vergunning), afgeleid van status
"In ontwikkeling". De eigenaar moet per pand de werkelijke fase (1–4) doorgeven; tot dan toont de
fase-tracker overal dezelfde stand. Coördinaten op de schematische kaart zijn indicatief.
