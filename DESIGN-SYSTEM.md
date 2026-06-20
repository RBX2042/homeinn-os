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
| `--line` / `--hairline` / `--hair` | rgba-hairlines | randen (`--hair` volgt de merkkleur) |

### Typografie
`--serif` Cormorant Garamond (koppen) · `--sans` Outfit (UI/tekst) — beide **lokaal** in `fonts/`.
Schaal: `--text-xs` (12px) → `--text-5xl` (64px). Vloeiende koppen op de website via `clamp()`.
`--leading-tight/snug/normal`, `--tracking-caps` (.05em voor uppercase labels).

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

---

*Bijgehouden naast de code. Wijzig je het systeem, wijzig dan dit bestand — anders bestaat de wijziging niet.*
