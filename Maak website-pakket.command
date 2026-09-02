#!/bin/zsh
# Bouwt de map 'website-online' — klaar om te uploaden naar je hosting (homeinn.nl)
cd "$(dirname "$0")"
# Bewaar de Vercel-koppeling (.vercel) zodat 'vercel deploy' naar het juiste project blijft gaan
[ -d website-online/.vercel ] && cp -R website-online/.vercel /tmp/homeinn-vercel-link
rm -rf website-online
mkdir website-online
# Herstel de Vercel-koppeling na de schone herbouw
[ -d /tmp/homeinn-vercel-link ] && cp -R /tmp/homeinn-vercel-link website-online/.vercel && rm -rf /tmp/homeinn-vercel-link
cp homeinn-public.html website-online/index.html       # root = landingspagina
cp homeinn-public.html website-online/                 # ook als zichzelf (interne links)
cp tokens.css website-online/                          # design-tokens (single source of truth) — vereist door alle pagina's
cp portal.css website-online/                          # gedeelde componentlaag — vereist door login + rolportalen
cp lightbox.js website-online/                         # fullscreen fotogalerij — vereist door woning.html + homepage
cp homeinn-public.css homeinn-public.js website-online/
cp lead-cloud.js website-online/                       # website-leads → Supabase (window.pushLeadToCloud); zonder dit bestand komen leads NIET in het portaal
cp site-nav.js website-online/                         # gedeeld hoofdmenu (mobiel menu + Diensten-paneel); zonder dit bestand werkt de navigatie op ALLE pagina's niet
cp pand-verkopen.html website-online/                  # verkoop-flow (navigatie-loze meerstaps intake)
cp vastgoedbeheer.html website-online/                 # dienstenpagina vastgoedbeheer (pakketten + rekenmodule + offerte)
cp projectontwikkeling.html website-online/            # dienstenpagina projectontwikkeling (bouwpartner + aanpak)
cp verhuur.html website-online/                        # dienstenpagina verhuur (huuraanbod + verhuurservice)
cp kennis.html kennis-*.html website-online/ 2>/dev/null || true # kennis/blog: overzicht + artikelpagina's (build-kennis.js)
cp te-koop.html woning.html over-ons.html werkgebied.html website-online/ 2>/dev/null || true # aanbod (te koop) + objectdetail + bedrijf
cp projecten.html investeren.html contact.html website-online/ 2>/dev/null || true # projecten + investeren + contact
cp privacy.html voorwaarden.html cookies.html website-online/ 2>/dev/null || true # juridisch (build-legal.js)
cp verkopen-*.html website-online/ 2>/dev/null || true # wijk-/gemeente-spokes (SEO-motor, gegenereerd via build-spokes.js)
cp inloggen.html inloggen.js website-online/ 2>/dev/null || true
cp investeerders.html investeerders.js website-online/ 2>/dev/null || true
cp huurders.html huurders.js website-online/ 2>/dev/null || true
cp kopers.html kopers.js website-online/ 2>/dev/null || true
cp verkoper.html verkoper.js website-online/ 2>/dev/null || true
# Beheerportaal (back-end) meeleveren zodat de login-router werkt
cp portaal.html app.js styles.css cloud.js website-online/ 2>/dev/null || true
cp aanbod.json website-online/ 2>/dev/null || echo '{"bijgewerkt":"","aanbod":[],"tehuur":[],"projecten":[],"verkocht":[]}' > website-online/aanbod.json
# Funda/Pararius woningfeeds (regenereren via portaal → Verkoop → "Funda/Pararius-feed")
cp funda-feed.xml website-online/ 2>/dev/null || printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' '<RealEstateFeed bron="HomeINN" versie="3.0" gegenereerd="" aantal="0"><Objecten></Objecten></RealEstateFeed>' > website-online/funda-feed.xml
cp pararius-feed.xml website-online/ 2>/dev/null || printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' '<pararius source="HomeINN" generated="" count="0"><properties></properties></pararius>' > website-online/pararius-feed.xml
cp sw.js website-online/ 2>/dev/null || true
# Sitemap-datums (lastmod) gelijkzetten aan de werkelijke wijzigingsdatum van elke pagina.
# Zonder deze stap blijft lastmod op een oude datum staan en slaan zoekmachines het herindexeren over.
python3 - <<'SITEMAP_PY'
import io, re, os, datetime
s = io.open('sitemap.xml', encoding='utf-8').read()
def blok(m):
    b = m.group(0)
    loc = re.search(r'<loc>(.*?)</loc>', b).group(1)
    p = re.sub(r'https?://home-inn\.nl/?', '', loc) or 'homeinn-public.html'
    if not p.endswith('.html'): p += '.html'
    if not os.path.exists(p): return b
    d = datetime.date.fromtimestamp(os.path.getmtime(p)).isoformat()
    return re.sub(r'<lastmod>.*?</lastmod>', '<lastmod>%s</lastmod>' % d, b)
io.open('sitemap.xml', 'w', encoding='utf-8').write(re.sub(r'<url>.*?</url>', blok, s, flags=re.S))
print("  ✓ sitemap lastmod bijgewerkt")
SITEMAP_PY

# Cloudflare Pages security-headers + SEO-bestanden meeleveren
cp _headers robots.txt sitemap.xml website-online/ 2>/dev/null || true
# Vercel security-headers (Vercel leest _headers niet) meeleveren
cp vercel.json website-online/ 2>/dev/null || true
# Manifest meekopiëren maar start_url + naam op de publieke site (index.html) zetten i.p.v. het portaal
sed 's#"start_url": "portaal.html"#"start_url": "index.html"#; s#"short_name": "HomeINN OS"#"short_name": "HomeINN"#; s#"name": "HomeINN OS — Vastgoedportaal"#"name": "HomeINN"#; s#"description": "Portaal voor aankoop, ontwikkeling, verhuur en verkoop van vastgoed."#"description": "HomeINN — aankoop, ontwikkeling, verkoop, verhuur en beheer van vastgoed in Rotterdam."#' manifest.webmanifest > website-online/manifest.webmanifest
cp -R assets website-online/assets
# Verwijder zware, ongebruikte logo-varianten uit de deploybundel (bronbestanden in assets/ blijven staan)
rm -f website-online/assets/logo-light-fullres.png website-online/assets/logo-light-original.png website-online/assets/logo-dark-original.png website-online/assets/homeinn-logo-new.png
cp -R fotos website-online/fotos 2>/dev/null || true
cp -R fonts website-online/fonts 2>/dev/null || true

# ── Minify CSS + publieke JS in de bundel (de bronbestanden blijven leesbaar) ──
# Verkleint de render-blocking stylesheet → betere Lighthouse/LCP. Gebruikt esbuild
# via npx en slaat NETJES over als esbuild/internet ontbreekt (bundel werkt dan
# gewoon ongeminificeerd). app.js / cloud.js (portaal) worden bewust niet geraakt.
if command -v npx >/dev/null 2>&1; then
  echo "Minify CSS/JS in bundel…"
  for f in tokens.css homeinn-public.css styles.css portal.css homeinn-public.js lightbox.js lead-cloud.js site-nav.js; do
    [ -f "website-online/$f" ] || continue
    if npx --yes esbuild "website-online/$f" --minify --outfile="website-online/$f.min" >/dev/null 2>&1; then
      mv "website-online/$f.min" "website-online/$f"
      echo "  ✓ $f geminificeerd"
    else
      rm -f "website-online/$f.min"
      echo "  ⤬ $f overgeslagen (esbuild niet beschikbaar)"
    fi
  done
else
  echo "npx/esbuild niet gevonden — minify overgeslagen (bundel werkt ongeminificeerd)."
fi

echo "Klaar: upload de inhoud van 'website-online' naar je hosting."
open website-online
