#!/bin/zsh
# Bouwt de map 'website-online' — klaar om te uploaden naar je hosting (homeinn.nl)
cd "$(dirname "$0")"
rm -rf website-online
mkdir website-online
cp homeinn-public.html website-online/index.html
cp homeinn-public.css homeinn-public.js website-online/
cp aanbod.json website-online/ 2>/dev/null || echo '{"bijgewerkt":"","aanbod":[],"verkocht":[]}' > website-online/aanbod.json
cp -R assets website-online/assets
cp -R fotos website-online/fotos 2>/dev/null || true
echo "Klaar: upload de inhoud van 'website-online' naar je hosting."
open website-online
