# Sfeerfotografie — 7 september 2026

- hero-rotterdam.jpg: László Hegedűs, Rotterdam/Erasmusbrug. https://www.pexels.com/photo/photo-of-city-skyline-1236533/
- interieur-sfeer.jpg: Max Vakhtbovych, wooninterieur. https://www.pexels.com/photo/luxury-interior-design-of-living-room-7546651/

Licentie gecontroleerd: https://www.pexels.com/license/ . Gratis commercieel websitegebruik en bewerking toegestaan; naamsvermelding niet verplicht. Beelden lokaal opgeslagen. Interieur expliciet als sfeerbeeld aangeduid. Voor de acht eigen panden blijven eigen/opdrachtfotografenbeelden nodig.

## Status op 12 september 2026

`hero-rotterdam.jpg` wordt **niet gebruikt**: de hero van de homepage is bewust
teruggezet op het Rotterdamse lijnmotief ("Rustige opening … conform de gekozen
referentie", `homeinn-public.html:384`). Het bestand en de licentie blijven staan
zodat de keuze omkeerbaar is; de bijbehorende opmaak staat nog compleet in
`homeinn-public.css` (`.hero-photo`, inclusief de `:has(.hero-photo.on)`-regels
die het lijnmotief verbergen zodra de foto laadt).

Wil je de foto terug, dan volstaat één regel in de hero, direct ná `.hero-bg`:

```html
<div class="hero-photo" aria-hidden="true"><img src="fotos/hero-rotterdam.jpg" alt="" fetchpriority="high" decoding="async" onerror="this.closest('.hero-photo').remove()" onload="this.closest('.hero-photo').classList.add('on')"></div>
```

`interieur-sfeer.jpg` wordt wél gebruikt, op `projectontwikkeling.html`.

**19 september 2026:** `hero-rotterdam.jpg` is als lage sfeerlaag (opacity .26, onder de navy) toegevoegd aan de kop van de twaalf wijkpagina's en `werkgebied.html`. Het is een stadsbeeld van Rotterdam, geen pand- of wijkfoto, en wordt nergens als zodanig gepresenteerd.

## hero-hef.jpg en hero-erasmus-lucht.jpg (19 september 2026)
- `hero-hef.jpg` — De Hef, Rotterdam. Pexels-foto 21952232, fotograaf Jan van der Wolf, Pexels-licentie (vrij gebruik, geen naamsvermelding vereist). Uitsnede 2400×800, gebruikt als lage-dekking sfeerlaag (`.page-hero--foto-r`) op contact en vastgoedbeheer.
- `hero-erasmus-lucht.jpg` — Erasmusbrug vanuit de lucht. Pexels-foto 20655911, fotograaf Igor Passchier, Pexels-licentie. Uitsnede 2400×800, sfeerlaag (`.page-hero--foto-l`) op over ons, projecten, verhuur en de EN-varianten.
- Beide zijn stadsbeelden, géén panden van HomeINN; nergens als eigen pand gepresenteerd.
