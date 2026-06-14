#!/bin/zsh
# Bouwt de map 'website-online' — klaar om te uploaden naar je hosting (homeinn.nl)
cd "$(dirname "$0")"
rm -rf website-online
mkdir website-online
cp homeinn-public.html website-online/index.html       # root = landingspagina
cp homeinn-public.html website-online/                 # ook als zichzelf (interne links)
cp homeinn-public.css homeinn-public.js website-online/
cp inloggen.html inloggen.js website-online/ 2>/dev/null || true
cp investeerders.html investeerders.js website-online/ 2>/dev/null || true
cp huurders.html huurders.js website-online/ 2>/dev/null || true
cp kopers.html kopers.js website-online/ 2>/dev/null || true
cp verkoper.html verkoper.js website-online/ 2>/dev/null || true
# Beheerportaal (back-end) meeleveren zodat de login-router werkt
cp portaal.html app.js styles.css cloud.js website-online/ 2>/dev/null || true
cp aanbod.json website-online/ 2>/dev/null || echo '{"bijgewerkt":"","aanbod":[],"verkocht":[]}' > website-online/aanbod.json
cp sw.js website-online/ 2>/dev/null || true
# Cloudflare Pages security-headers + SEO-bestanden meeleveren
cp _headers robots.txt sitemap.xml website-online/ 2>/dev/null || true
# Manifest meekopiëren maar start_url + naam op de publieke site (index.html) zetten i.p.v. het portaal
sed 's#"start_url": "portaal.html"#"start_url": "index.html"#; s#"short_name": "HomeINN OS"#"short_name": "HomeINN"#; s#"name": "HomeINN OS — Vastgoedportaal"#"name": "HomeINN"#; s#"description": "Portaal voor aankoop, ontwikkeling, verhuur en verkoop van vastgoed."#"description": "HomeINN — aankoop, ontwikkeling, verkoop en beheer van vastgoed in Rotterdam."#' manifest.webmanifest > website-online/manifest.webmanifest
cp -R assets website-online/assets
cp -R fotos website-online/fotos 2>/dev/null || true
cp -R fonts website-online/fonts 2>/dev/null || true
echo "Klaar: upload de inhoud van 'website-online' naar je hosting."
open website-online
