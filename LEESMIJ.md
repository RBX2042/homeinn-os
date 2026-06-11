# HomeINN OS — Vastgoedsoftware

Eén software voor **aankoop van panden, projectontwikkeling en verkoop** — inclusief
je eigen website. Geen WordPress, geen abonnementen, geen externe afhankelijkheden.

## Starten

**Dubbelklik op `Start HomeINN OS.command`** — de software start en opent het portaal.

(Eerste keer: rechtermuisknop → Open, omdat macOS onbekende bestanden blokkeert.)

## De software bestaat uit twee delen

1. **Het portaal** (`portaal.html`) — jouw werkomgeving
2. **De website** (`homeinn-public.html`) — wat bezoekers zien; online landt de
   hoofd-URL automatisch op de website (het portaal blijft jouw werkplek)

**Aanvragen van de live website komen per e-mail binnen op info@homeinn.nl**
(via de gratis bezorgdienst FormSubmit — eenmalig activeren door op de
bevestigingslink te klikken in de eerste mail van FormSubmit in die inbox).
Test je de formulieren lokaal via "Website preview", dan verschijnen ze ook in
het portaal onder **Aanvragen**, waar je ze met één klik omzet naar een
aankoopkans of relatie.

## Modules

| Module | Wat je ermee doet |
|---|---|
| **Dashboard** | Portfolio-waarde, pijplijnwinst, te koop, gerealiseerde winst, kapitaal per pand, automatische actielijst (incl. backup-herinnering), eigen taken |
| **Aanvragen** | Lokaal geteste website-formulieren → omzetten naar aankoopkans of relatie (live aanvragen: per e-mail) |
| **Aankoopkansen** | Pijplijn: Lead → Bezichtiging → Bod → Onder voorbehoud → Notaris, met biedingen en calculatie per kans |
| **Dealcalculator** | Reken een deal door vóór je biedt: alle kosten, houdkosten, winst, ROI en rendement op eigen geld. Printbaar voor je financier |
| **Panden** | Portfolio: aankoopkosten, ontwikkelkosten, houdkosten, financiering met einddatum-bewaking, documentenchecklist, foto's, verkoopdossier, Google Maps |
| **Ontwikkelprojecten** | Budget vs. realisatie, fases, opleverpunten — plus per project: publicatie op de website (volgen), updates-tijdlijn en investeerders-administratie (doelbedrag, inleg, voortgang) |
| **Kosten** | Alle kostenposten: Opdracht → Factuur ontvangen → Betaald |
| **Verkoop** | Bezichtigingen, ontvangen biedingen, gerealiseerde winst/ROI/bezitsduur per verkocht pand |
| **Planning / Relaties** | Weekplanning en alle makelaars, notarissen, aannemers, financiers, kopers |
| **Instellingen** | Bedrijfsgegevens, standaardpercentages, backup & herstel |

## Je website online zetten (met actueel aanbod)

De website toont je woningaanbod uit **`aanbod.json`** — dat bestand maak je in
het portaal:

1. Zet per pand de websitegegevens klaar: *Pand bewerken → Website-presentatie*
   (m², kamers, omschrijving) en een vraagprijs
2. Wil je dat mensen een **project kunnen volgen of erin investeren**? Zet in
   *Project bewerken → Website & investeren* de schakelaars aan en vul doelbedrag,
   minimale inleg, rendement en looptijd in. Voortgangsberichten plaats je in het
   projectdetail onder "Website-updates"; inleg registreer je onder "Investeerders"
3. Klik op **"Publiceer website (JSON)"** (knop in Verkoop én Ontwikkelprojecten)
   — je downloadt `aanbod.json` met je aanbod, projecten en track record
4. Vervang `aanbod.json` in deze map én op je hosting

**Foto's:** beheer je per pand in het panddetail ("Foto's voor de website").
Twee manieren: (1) zet fotobestanden in de map **fotos/** en voeg ze toe als
"fotos/bestandsnaam.jpg"; of (2) upload direct vanaf je computer (JPG/PNG,
wordt automatisch verkleind, max. 8 per pand). De eerste foto is de hoofdfoto;
bezoekers zien de volledige galerij in het woningdetail.

Elke woning en elk project heeft **Google Maps** (kaart + routelink) op basis
van het adres — de kaart laadt pas nadat de bezoeker erop klikt (privacy).
Lettertypen worden van je eigen server geladen, niet via Google.

**Online zetten:** dubbelklik **`Maak website-pakket.command`** — er verschijnt
een map `website-online` met alles erin (website als `index.html`, vormgeving,
aanbod.json, foto's, lettertypen, logo's). Upload de **inhoud** van die map naar
je hosting (FTP/cPanel van homeinn.nl, of sleep de map naar app.netlify.com/drop
voor een gratis testlink). Aanbod bijwerken = `aanbod.json` (en evt. nieuwe
foto's) opnieuw uploaden.

## Belangrijk om te weten

- **Alle data staat lokaal in je browser** — maak regelmatig een backup
  (Instellingen → Download backup). De actielijst herinnert je eraan na 14 dagen.
- Gebruik de software steeds **in dezelfde browser via de starter** (anders zie
  je je data niet).
- Standaardpercentages (overdrachtsbelasting 8%, rente 6%, doel-ROI 15%) staan in
  Instellingen — controleer ze met je fiscalist.
- De bedrijfsgegevens-regel in de websitefooter (KvK, btw, adres) staat klaar in
  `homeinn-public.js` (BEDRIJF) — geef je gegevens door, dan wordt hij gevuld.
- De oude `homeinn-wordpress-theme-*.zip` bestanden in de HOMEIINN-map zijn niet
  meer nodig voor deze software.

## Bestanden

```
homeinn-software/
├── Start HomeINN OS.command  ← dubbelklik om te starten
├── portaal.html              ← het portaal (jouw werkomgeving)
├── index.html                ← doorverwijzing naar de website (voor online)
├── app.js / styles.css       ← logica en vormgeving portaal
├── homeinn-public.html       ← de website (incl. werkende formulieren)
├── homeinn-public.js/.css    ← logica en vormgeving website
├── aanbod.json               ← je woningaanbod (bron voor de website)
├── fotos/                    ← woningfoto's
├── fonts/                    ← lettertypen (lokaal, geen Google)
├── Maak website-pakket.command ← bouwt de upload-klare map website-online/
├── LEESMIJ.md                ← dit bestand
└── assets/                   ← logo's
```
