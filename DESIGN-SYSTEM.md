# HomeINN — Design System

> Eén visuele taal over het hele platform: publieke website, beheerportaal en de
> vier rolportalen (kopers, verkoper, huurders, investeerders) + login.
> **Alle tokens leven in `tokens.css` — de enige plek waar ze worden gedefinieerd.**

---

## Audit (18 juni 2026, herzien)

**Onderdelen beoordeeld:** 8 pagina's · 3 stylesheets · 6 JS-modules · token-laag
**Score: 94/100** — structureel gezond, één kleur-drift gevonden en gedicht.

| Categorie | Status | Toelichting |
|-----------|--------|-------------|
| Token-bron | ✅ | `tokens.css` is single source of truth; **0** rogue `:root`-blokken elders |
| Kleur-consistentie | ✅ (gefixt) | Oude goud `#b49030` / `rgb(180,144,48)` (27×) → canoniek `#b8933a` / `var(--gold-rgb)` |
| Navy | ✅ | `#0b1e30` === `--navy`; geen drift (literals zijn correct van waarde) |
| Componenten | ✅ | `.btn`, inputs, badges, panels, modals consistent over alle pagina's |
| Focus / a11y | ✅ | Uniforme `--focus-ring` (2px `--gold2`), `--focus-offset` |
| Launch-readiness | ✅ | sitemap/robots/manifest/sw/precache kloppen met de bestanden |

**Gedicht deze ronde**
1. **Goud-drift** — 14× `#b49030` (HTML/JS-illustraties + charts) en 13× `rgb(180,144,48)` (inline eyebrows) liepen naast de canonieke `#b8933a`. Alles geconsolideerd naar de token / canonieke hex.
2. **Huur-flow verloor het onderwerp** — website-modal miste de huur-opties; elke "Te huur"-aanvraag kwam met een leeg onderwerp binnen. `openModal()` is nu defensief (onbekend onderwerp wordt dynamisch toegevoegd) + dropdown aangevuld.
3. **Login-routing** — `inloggen.js` markeerde iedere contracthouder als "koper"; huurders/investeerders belandden fout. Koper-detectie + elke portaal-query nu gefilterd op contracttype.

---

## Design Tokens (`tokens.css`)

Link-volgorde op **elke** pagina:
```html
<link rel="stylesheet" href="fonts/fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="styles.css">   <!-- of homeinn-public.css -->
```

### Kleur
| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--gold` | `#b8933a` | **canonieke merkkleur** — knoppen, accenten |
| `--gold-rgb` | `184, 147, 58` | voor `rgba(var(--gold-rgb), α)` hairlines/tints |
| `--gold2` | `#cca94a` | badges, focus-ring |
| `--gold3` / `--gold-light` | `#e8c96a` / `#f7f0dc` | highlight / zachte tint |
| `--gold-ink` / `--gold-text` | `#7d6418` / `#6d5612` | goud-tekst op licht |
| `--navy` … `--navy4` | `#0b1e30` → `#224060` | donkere vlakken, koppen |
| `--ink` … `--ink4` | `#0c0b09` → `#736d64` | tekst (primair → zwakst) |
| `--cream` … `--cream3`, `--panel` | `#f5f2ec` → `#ddd7cb`, `#fffdf8` | achtergronden, kaarten |
| `--red` / `--green` | `#b03a3a` / `#1e6a42` | fout / succes |
| `--green-bg/-line/-ink` | `#eef6ef` / `#2d7a46` / `#215838` | meldingsvlak succes (7,6:1) |
| `--red-bg/-line/-ink` | `#fbefec` / `#b74b2d` / `#7f3220` | meldingsvlak fout (7,8:1) |
| `--line` / `--hairline` / `--hair` | rgba-hairlines | randen (`--hair` volgt de merkkleur) |

### Typografie
`--serif` Cormorant Garamond (koppen) · `--sans` Outfit (UI/tekst) — beide **lokaal** in `fonts/`.
Schaal: `--text-xs` (12px) → `--text-5xl` (64px).
`--leading-tight/snug/normal`, `--tracking-caps` (.05em voor uppercase labels).

**Kop-schaal (sinds 6 sep 2026).** De sectiekoppen liepen uiteen in elf losse
`clamp()`-waarden met wisselend gewicht en regelhoogte. Dat is teruggebracht tot
vier tokens; élke `h2` op de site gebruikt er één van, met `font-weight:300` en
`line-height:1.15`.

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--h2-lg` | `clamp(2.2rem, 4.2vw, 3.5rem)` | openingsstatement van een pagina |
| `--h2` | `clamp(2rem, 3.5vw, 3rem)` | standaard sectiekop — de werkpaardschaal |
| `--h2-sm` | `clamp(1.7rem, 2.8vw, 2.4rem)` | compacte blokken, juridische documenten |
| `--h2-prose` | `clamp(1.5rem, 3vw, 2rem)` | tussenkoppen binnen een artikel |

`h1` blijft per paginatype verschillen (hero 6,5rem, kennisartikel 3,2rem) — dat is
een bewust onderscheid, geen drift. Uitzondering: `investeren.html` verkleint
`.page-hero h1` inline omdat die titel het langst is.

**Ondergrens leesbaarheid.** Onder 720px is de root 15px; rem-waarden onder ~.8rem
zakken daar onder de 12px. Bijschriften staan daarom op minimaal `.78rem` (12,5px)
en krijgen in het laatste `@media(max-width:720px)`-blok van `homeinn-public.css`
een ondergrens. **Dat blok hoort het laatste te blijven** — een regel die eronder
komt, verslaat hem.

### Ruimte · radius · elevatie · motion
- **Ruimte** (8pt): `--space-1` (4px) → `--space-24` (96px)
- **Radius**: `--radius-sm` 4 · `--radius` 7 · `--radius-lg` 10 · `--radius-xl` 14 · `--radius-pill` 999
- **Elevatie**: `--elev-1`, `--elev-2`, `--shadow` (diep, voor modals/gates)
- **Motion**: `--ease`, `--ease-out`, `--ease-in-out`; `--t-fast` .16s · `--t` .24s · `--dur` .65s
- **Focus**: `--focus-ring` 2px `--gold2`, `--focus-offset` 3px
- **Z-index**: `--z-nav` 800 · `--z-dropdown` 900 · `--z-overlay` 1000 · `--z-modal` 1200 · `--z-toast` 9999
- **Breakpoints** (JS/matchMedia): `--bp-sm` 560 · `--bp-md` 768 · `--bp-lg` 1024 · `--bp-xl` 1280

---

## Componentlaag (`portal.css`)

Naast `tokens.css` (waarden) is er één gedeelde **componentlaag** voor login + de
vier rolportalen: `portal.css`. Het definieert knoppen, kaarten, invoervelden,
badges, toast, topbar, focus en de laad-spinner één keer, token-gedreven — zodat
de vijf portalen er identiek uitzien. Link als **laatste** stylesheet (ná de
pagina-eigen `<style>`) zodat oude drift wordt rechtgetrokken en pagina-layout
intact blijft.

> Vóór deze laag verschilden de portalen subtiel: knop-transities .16s/.18s/.2s,
> paddings 10/11/13px, de gouden signatuurlijn ontbrak op sommige kaarten, alleen
> huurders had een toast-schaduw, en geen enkele knop had `:active`-feedback.
> Nu: één knop, één kaart, één badge-set, één focus-ring — overal gelijk.

| Component | Canoniek (portal.css) |
|-----------|------------------------|
| `.btn` | radius `--radius-lg`, padding 11×20, `--text-sm`, uppercase, transitie `--t-fast` op alle props, `:active` press |
| `.btn` varianten | `.primary` (goud/navy) · `.secondary` (navy-outline) · `.ghost` (wit-op-navy) · `.slim` · `.outline` |
| `.card` | gouden top-hairline `::before` op élke kaart, `--elev-2`, `--line`-rand |
| inputs | `--radius-lg`, focus = zachte goud-rand + 3px goud-glow, `--t-fast` |
| `.badge` | volledige set: default/green/gold/red/blue/gray, identiek formaat |
| `.toast` | `--shadow` + `--radius-lg` overal |
| `.topbar` | gouden onderlijn als merksignatuur |
| `.hi-spin` | gouden laad-spinner voor de eerste paint (respecteert reduced-motion) |

---

## Componenten

| Component | Varianten | States | Notities |
|-----------|-----------|--------|----------|
| **Button** `.btn` | `.primary` `.secondary` `.danger` · `.slim` · `.text-btn` · `.icon-btn` | hover, focus, disabled | goud primair, navy-op-wit secundair |
| **Input / select / textarea** | — | focus-ring (goud), invalid | gedeelde basisstijl in beide stylesheets |
| **Badge / label** | kleur via status (`.green` `.red` `.gold` …) | — | pill-radius, caps-tracking |
| **Panel / KPI / card** | `.panel` `.kpi` `.kpi.small` | hover (lijst-rijen) | `--panel` achtergrond, `--elev`/`--shadow` |
| **Modal / overlay** | website-contactmodal, woningdetail-overlay, portaal-dialogs | open/dicht, scroll-lock | `--z-modal`; scroll-lock blijft staan zolang óf modal óf overlay open is |
| **Map-knop** `.map-load` | — | klik→iframe | Google Maps laadt pas na klik (privacy) |
| **Rolportaal-kaart** | kopers/verkoper/huurders/investeerders | leeg/gevuld/fout | JS-geïnjecteerd; gedeelde `tokens.css` + portaalstijl |

---

## Regels (onderhoud)

1. **Tokens alleen in `tokens.css`.** Definieer nooit een `:root`-blok of kleur-token in `styles.css`, `homeinn-public.css` of inline `<style>`.
2. **Gebruik `var(--token)`**, geen losse hex/rgba. Hairlines/tints: `rgba(var(--gold-rgb), α)` zodat ze meebewegen met de merkkleur.
3. **Canoniek goud = `#b8933a`.** SVG-`fill=`/`stroke=` en JS-chartstrings die geen `var()` kunnen gebruiken: de canonieke hex `#b8933a` (nooit `#b49030`).
4. **Nieuwe pagina?** Link `fonts.css` → `tokens.css` → paginastijl, in die volgorde.
5. **Breaking change in een token?** Pas het hier aan; alles erft mee. Documenteer in dit bestand.
6. **Goud als tékst mag niet `--gold` of `--gold2` zijn op een lichte ondergrond.** Die halen daar 1,8–2,9:1. Gebruik `--gold-ink` (5,1:1 op cream) of `--gold-text` (6,3:1). `--gold`/`--gold2` blijven voor randen, vlakken, iconen en tekst op donker.
7. **Witte tekst op de donkere vlakken: alpha ≥ .55.** Op `--navy` haalt `.45` nog maar 4,2:1; `.55` haalt 5,9:1.
8. **`--ink4` niet op `--cream2`** (4,2:1). Daar hoort `--ink3` (5,8:1).
9. **Eén footer.** Subpagina's gebruiken `.site-foot`; die staat óók in `build-legal.js`, `build-spokes.js` en `build-kennis.js`. Wijzig je hem, wijzig hem daar mee en draai de drie generatoren — anders is hij na de volgende build weg.
10. **CSS of JS gewijzigd?** Hoog de `?v=`-token op in alle `*.html` én de drie build-scripts, en `CACHE` in `sw.js`. Zonder dat krijgen terugkerende bezoekers het oude bestand.
11. **`fonts/fonts.css` valt onder de `/fonts/*`-regel in `vercel.json`: een jaar `immutable`.** Zonder `?v=` zou een wijziging daar een jaar lang niet doorkomen. Neem hem dus mee in dezelfde bump als regel 10.

---

*Bijgehouden naast de code. Wijzig je het systeem, wijzig dan dit bestand — anders bestaat de wijziging niet.*

## Lancering 7 september 2026

De homepage heeft lokale Rotterdam-fotografie met een navy tekstverloop; bij geladen fotografie verdwijnt de brugillustratie. De projectontwikkelpagina heeft een responsieve tekst/beeldcombinatie en een expliciet sfeerbijschrift. Foto’s en gebruiksrechten staan in fotos/BEELDRECHTEN.md. Menu-knop benoemt de actuele open/sluitactie. Cacheversie verhoogd.

Tijdelijke pandpresentatie: navy/gouden locatiekaarten met echt adres en “Projectfoto’s volgen”, op homepage, projectontwikkeling en projecten. Eigen foto’s nemen het vlak automatisch over. Gecontroleerd op 320px zonder overflow; websitepakket opnieuw gecontroleerd.

Afwerking layout: dienstkoppen begrensd op 5.25rem, ruimere/helderdere introtypografie, kaartteksten 16px op desktop, knoppen minimaal 48px hoog. Verhuurintro ingekort, uitlijning hero en aanbod exact gelijk (132px bij 1440px), aparte verhuurdersroute getest. Verhuurtekst verduidelijkt rond vaste bouwpartner en per-woning energielabel; onjuiste absolute tekst “geen derden” verwijderd. Acht kernpagina’s opnieuw op 320px gecontroleerd zonder horizontale overflow. 39 pagina’s statisch gecontroleerd zonder fouten. Bestaande inhoudelijke lanceerpunten blijven open.

## Volledige responsive eindcontrole

33 publieke routes (inclusief login, 404, juridisch en wijkpagina’s; exclusief ingelogde rolportalen en dubbele homepage) gecontroleerd op 320, 768 en 1440 pixels: 99 weergaven, geen documentoverflow of horizontaal afgesneden zichtbare koppen, alinea’s, labels, lijstitems en knoppen gevonden. De 1px schermlezerskop van login is bewust uitgesloten.

Vijf kernpagina’s met een lokaal gesimuleerde verdubbelde rootletter (32px): homepage, contact, beheer, verhuur en pand verkopen. Na herstel geen horizontale documentoverflow. Dit is een tekstvergrotingstest, geen certificering van alle browserzoomcombinaties.

Hersteld: tekstvelden minimaal 16px en 48px hoog; formulierlabels minimaal 14px; flexibele kolommen voor formulieren, pakketten, menu en calculator; kopbalk kan doorlopen bij grote tekst; beheer-H1 krijgt duidelijke regels. De menu-items hadden door een te brede flexregel hun toelichting naast de titel; deze staan nu onder elkaar. Menubediening werkt via klik/Enter/Spatie en sluit met Escape of verlaten van de focus. CSS-hover opent het paneel alleen als JavaScript uit staat, zodat visuele toestand en aria-expanded niet kunnen botsen. Klik open, Escape dicht en Enter open in browser getest.

Statische pakketcontrole: 39 pagina’s, 22 JavaScript-controles, geen fouten of kapotte ankers. Desktopmenu visueel beoordeeld. Er zijn geen live aanvragen verstuurd; de bestaande inhoudelijke lanceerpunten blijven van kracht.

## Referentie 7 september — homeinn.vercel.app
Homepage opent weer met navy, gouden accenten en het Rotterdamse lijnmotief. Fotografie staat in inhoudelijke secties. Dienstenkoppen volgen de ruime referentieverhouding (7vw, maximaal 6.5rem, tekstkolom 900px); introducties blijven compact op maximaal 520px. Responsieve formulieren en navigatie behouden.

## Laatste correctie na screenshots
Dienstenkoppen maximaal 4.75rem met 5.2vw schaal; projectontwikkeling korter in twee regels. Waardenbalk statisch voor continue leesbaarheid. Modal vanaf boven scrollbaar bij korte schermen.

## Contactplaatsing
Geen telefoonnummer of “Liever bellen?” in header, dienstenmenu of mobiel menu. Contactgegevens in footer en contactpagina; menu houdt één primaire actie.

## Definitieve gedeelde publieke opmaak — vergelijking met screenshots

De afsluitende gedeelde blokken in homeinn-public.css beheren de publieke header en compositie. Voeg geen nieuwe pagina-specifieke headerafmetingen, logogroottes, CTA-vormen of vaste-nav-offsets toe.

- Header: sticky, 72px desktop, 64px tot1100px. Logo170px desktop/158px mobiel. Eén gecentreerd menu en één CTA naar contact.html. site-nav.js gebruikt hetzelfde1100px omslagpunt.
- Contentlijn: --site-content1176px, --site-gutter20–88px. Containers met binnenpadding tellen die apart op; schermbrede achtergronden krijgen een binnencontainer. Geen padding op footer.site-foot buiten .in.
- Diensten en homepage: gedeelde serif-H1, goud zonder verschillende cursiefvarianten, gelijk donker verloop en bestaand brugmotief. Kopinhoud mag in aantal regels verschillen.
- Contact staat in footer en contactpagina, niet in menu/header. Mobiele header bevat alleen logo en menuknop.
- Na latere layoutwijzigingen naast elkaar beoordelen: homepage, ontwikkeling, aanbod, investeren; desktop1440 en mobiel390, plus320 en omslagpunt1100. Vergelijk daadwerkelijke logo-, menu-, CTA- en sectieposities, niet alleen documentoverflow.

## Homepage, volledige controle 7 september 2026

Houd de leesvolgorde aan: propositie, introductie/cijfers, drie uitgelichte projecten, drie investeerdersstappen, diensten, verkopersproces, kennis, werkgebied, FAQ en afsluitende aanvraag. Alle acht projecten blijven op de projectenpagina. Koppen en kaarten delen dezelfde inhoudsbreedte. Footerlinks zijn mobiel minimaal 16 px. Inhoud mag nooit van een succesvolle animatie-initialisatie afhangen. Projectinformatie-aanvragen gaan naar het investeerdersformulier. Gebruik eigen portefeuillegegevens voor cijfers en onderscheid sfeerbeelden van echte pandfoto’s.
