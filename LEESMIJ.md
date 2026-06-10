# HomeINN OS — Vastgoedsoftware

Eén software voor **aankoop van panden, projectontwikkeling en verkoop** — inclusief
je eigen website. Geen WordPress, geen abonnementen, geen externe afhankelijkheden.

## Starten

**Dubbelklik op `Start HomeINN OS.command`** — de software start en opent in je browser.

(Eerste keer: rechtermuisknop → Open, omdat macOS onbekende bestanden blokkeert.
Alternatief: open `index.html` rechtstreeks in je browser.)

## De software bestaat uit twee delen

1. **Het portaal** (`index.html`) — jouw werkomgeving
2. **De website** (`homeinn-public.html`) — wat bezoekers zien, met werkende formulieren

Die twee zijn gekoppeld: **vult iemand een formulier in op de website (gratis gesprek,
pand verkopen, contact), dan verschijnt die aanvraag automatisch in het portaal**
onder "Aanvragen" — met een melding in je actielijst. Vandaar zet je hem met één
klik om naar een aankoopkans of relatie.

## Modules

| Module | Wat je ermee doet |
|---|---|
| **Dashboard** | Portfolio-waarde, pijplijnwinst, te koop, gerealiseerde winst, kapitaal per pand, automatische actielijst, eigen taken |
| **Aanvragen** | Website-formulieren komen hier binnen → omzetten naar aankoopkans of relatie |
| **Aankoopkansen** | Pijplijn: Lead → Bezichtiging → Bod → Onder voorbehoud → Notaris, met biedingen en calculatie per kans |
| **Dealcalculator** | Reken een deal door vóór je biedt: alle kosten, houdkosten, winst, ROI en rendement op eigen geld. Printbaar voor je financier |
| **Panden** | Portfolio: aankoopkosten, ontwikkelkosten, houdkosten, financiering met einddatum-bewaking, documentenchecklist, verkoopdossier |
| **Ontwikkelprojecten** | Budget vs. realisatie, fases, opleverpunten |
| **Kosten** | Alle kostenposten: Opdracht → Factuur ontvangen → Betaald |
| **Verkoop** | Bezichtigingen, ontvangen biedingen, gerealiseerde winst/ROI/bezitsduur per verkocht pand |
| **Planning / Relaties** | Weekplanning en alle makelaars, notarissen, aannemers, financiers, kopers |
| **Instellingen** | Bedrijfsgegevens, standaardpercentages, backup & herstel |

## Je website online zetten (met actueel aanbod)

De website toont je woningaanbod uit **`aanbod.json`** — dat bestand maak je in
het portaal:

1. Zet per pand de websitegegevens klaar: *Pand bewerken → Website-presentatie*
   (m², kamers, omschrijving) en een vraagprijs
2. Ga naar **Verkoop → "Publiceer aanbod (JSON)"** — je downloadt `aanbod.json`
   met alles wat te koop / onder bod staat (+ recent verkocht als referentie)
3. Vervang `aanbod.json` in deze map én op je hosting

**Online zetten:** dubbelklik **`Maak website-pakket.command`** — er verschijnt
een map `website-online` met alles erin (website als `index.html`, vormgeving,
aanbod.json, logo's). Upload de **inhoud** van die map naar je hosting
(bijv. via FTP/cPanel van homeinn.nl, of sleep de map naar app.netlify.com/drop
voor een gratis testlink). Aanbod bijwerken = alleen het nieuwe `aanbod.json`
uploaden.

Let op: de formulieren op de online site bewaren aanvragen in de browser van de
bezoeker — voor aanvragen die naar jóu komen (e-mail of direct in het portaal)
is een klein serverkoppelstukje nodig. Zeg het als je zover bent.

## Belangrijk om te weten

- **Alle data staat lokaal in je browser** — maak regelmatig een backup
  (Instellingen → Download backup). Niets verlaat je computer.
- Gebruik de software steeds **in dezelfde browser** (anders zie je je data niet).
- De website-formulieren werken binnen deze software (zelfde computer/browser).
  Zodra je de site echt online zet, is daarvoor een klein koppelstukje nodig dat
  aanvragen doorstuurt — zeg het als het zover is, dan bouw ik dat erbij.
- Standaardpercentages (overdrachtsbelasting 8%, rente 6%, doel-ROI 15%) staan in
  Instellingen — controleer ze met je fiscalist.
- De oude `homeinn-wordpress-theme-*.zip` bestanden in de HOMEIINN-map zijn niet
  meer nodig voor deze software.

## Bestanden

```
homeinn-software/
├── Start HomeINN OS.command  ← dubbelklik om te starten
├── index.html                ← het portaal
├── app.js / styles.css       ← logica en vormgeving portaal
├── homeinn-public.html       ← de website (incl. werkende formulieren)
├── homeinn-public.js/.css    ← logica en vormgeving website
├── aanbod.json               ← je woningaanbod (bron voor de website)
├── Maak website-pakket.command ← bouwt de upload-klare map website-online/
├── LEESMIJ.md                ← dit bestand
└── assets/                   ← logo's
```
