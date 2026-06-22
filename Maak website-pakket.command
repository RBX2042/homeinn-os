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
cp homeinn-public.css homeinn-public.js website-online/
cp pand-verkopen.html website-online/                  # verkoop-flow (navigatie-loze meerstaps intake)
cp vastgoedbeheer.html website-online/                 # dienstenpagina vastgoedbeheer (pakketten + rekenmodule + offerte)
cp projectontwikkeling.html website-online/            # dienstenpagina projectontwikkeling (bouwpartner + aanpak)
cp verhuur.html website-online/                        # dienstenpagina verhuur (huuraanbod + verhuurservice)
cp kennis.html kennis-*.html website-online/ 2>/dev/null || true # kennis/blog: overzicht + artikelpagina's (build-kennis.js)
cp te-koop.html woning.html over-ons.html werkgebied.html website-online/ 2>/dev/null || true # aanbod (te koop) + objectdetail + bedrijf
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
echo "Klaar: upload de inhoud van 'website-online' naar je hosting."
open website-online
