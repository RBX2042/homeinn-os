#!/bin/zsh
# Bouwt de map 'website-online' — klaar om te uploaden naar je hosting (homeinn.nl)
cd "$(dirname "$0")" || exit 1
# Bewaar de Vercel-koppeling (.vercel) zodat 'vercel deploy' naar het juiste project blijft gaan.
# Eigen tijdelijke map per build (mktemp): een vaste /tmp-map kon na een afgebroken build blijven
# staan, waarna de koppeling genest (.vercel/.vercel) terugkwam en 'vercel deploy' een nieuw project koos.
VERCEL_LINK=""
if [ -d website-online/.vercel ]; then
  VERCEL_LINK=$(mktemp -d "${TMPDIR:-/tmp}/homeinn-vercel-link.XXXXXX") && cp -R website-online/.vercel "$VERCEL_LINK/" || { echo "  ✗ kon de Vercel-koppeling niet bewaren — bundel NIET gebouwd"; exit 1; }
fi
echo "Generators draaien (legal, spokes, kennis)…"
node build-legal.js >/dev/null && node build-spokes.js >/dev/null && node build-kennis.js >/dev/null && echo "  ✓ 19 gegenereerde pagina's up-to-date" || { echo "  ✗ generator faalde — bundel NIET gebouwd"; exit 1; }
rm -rf website-online
mkdir website-online
# Herstel de Vercel-koppeling na de schone herbouw
if [ -n "$VERCEL_LINK" ] && [ -d "$VERCEL_LINK/.vercel" ]; then
  cp -R "$VERCEL_LINK/.vercel" website-online/.vercel && rm -rf "$VERCEL_LINK"
fi
cp homeinn-public.html website-online/index.html       # root = landingspagina
cp homeinn-public.html website-online/                 # ook als zichzelf (interne links)
cp tokens.css website-online/                          # design-tokens (single source of truth) — vereist door alle pagina's
cp portal.css website-online/                          # gedeelde componentlaag — vereist door login + rolportalen
cp lightbox.js website-online/                         # fullscreen fotogalerij — vereist door woning.html + homepage
cp homeinn-public.css homeinn-public.js website-online/
cp lead-cloud.js website-online/                       # website-leads → Supabase (window.pushLeadToCloud); zonder dit bestand komen leads NIET in het portaal
cp site-nav.js website-online/                         # gedeeld hoofdmenu (mobiel menu + Diensten-paneel); zonder dit bestand werkt de navigatie op ALLE pagina's niet
cp manifest-portaal.webmanifest website-online/          # eigen manifest voor het portaal (start_url portaal.html)
cp 404.html favicon.ico website-online/ 2>/dev/null || true   # eigen 404-pagina (Vercel/GitHub Pages pakken 404.html automatisch op) + favicon.ico voor browsers die /favicon.ico blind opvragen
cp pand-verkopen.html website-online/                  # verkoop-flow (navigatie-loze meerstaps intake)
cp vastgoedbeheer.html website-online/                 # dienstenpagina vastgoedbeheer (pakketten + rekenmodule + offerte)
cp projectontwikkeling.html website-online/            # dienstenpagina projectontwikkeling (bouwpartner + aanpak)
cp verhuur.html website-online/                        # dienstenpagina verhuur (huuraanbod + verhuurservice)
cp kennis.html kennis-*.html website-online/ 2>/dev/null || true # kennis/blog: overzicht + artikelpagina's (build-kennis.js)
cp te-koop.html woning.html over-ons.html werkgebied.html website-online/ 2>/dev/null || true # aanbod (te koop) + objectdetail + bedrijf
cp projecten.html investeren.html contact.html website-online/ 2>/dev/null || true # projecten + investeren + contact
cp *-en.html website-online/ 2>/dev/null || true # Engelse investeerderspagina's (index-en, invest-en, projects-en, about-en, contact-en)
cp privacy.html voorwaarden.html cookies.html website-online/ 2>/dev/null || true # juridisch (build-legal.js)
cp verkopen-*.html website-online/ 2>/dev/null || true # wijk-/gemeente-spokes (SEO-motor, gegenereerd via build-spokes.js)
cp inloggen.html inloggen.js website-online/ 2>/dev/null || true
cp investeerders.html investeerders.js website-online/ 2>/dev/null || true
cp huurders.html huurders.js website-online/ 2>/dev/null || true
cp kopers.html kopers.js website-online/ 2>/dev/null || true
cp verkoper.html verkoper.js website-online/ 2>/dev/null || true
# Beheerportaal (back-end) meeleveren zodat de login-router werkt
cp portaal.html app.js styles.css cloud.js website-online/ 2>/dev/null || true
cp admin.html admin.js website-online/ 2>/dev/null || true   # adminpaneel (cloudoverzicht: leads, e-maillog, rollen, systeemstatus)
cp portefeuille.json investeer-tools.js website-online/ 2>/dev/null || true # investeerderstools (investeren.html + invest-en.html)
cp aanbod.json website-online/ 2>/dev/null || echo '{"bijgewerkt":"","aanbod":[],"tehuur":[],"projecten":[],"verkocht":[]}' > website-online/aanbod.json
# Funda/Pararius woningfeeds (regenereren via portaal → Verkoop → "Funda/Pararius-feed")
cp funda-feed.xml website-online/ 2>/dev/null || printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' '<RealEstateFeed bron="HomeINN" versie="3.0" gegenereerd="" aantal="0"><Objecten></Objecten></RealEstateFeed>' > website-online/funda-feed.xml
cp pararius-feed.xml website-online/ 2>/dev/null || printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' '<pararius source="HomeINN" generated="" count="0"><properties></properties></pararius>' > website-online/pararius-feed.xml
cp sw.js website-online/ 2>/dev/null || true
# Kopieer foto's vóór de controle; anders worden ook bestaande beelden gestript.
cp -R fotos website-online/fotos 2>/dev/null || true
rm -f website-online/fotos/*.md(N)                     # interne werknotities (shotlist, beeldrechten) horen niet op de live site
# Fotoplekken waarvan het bestand (nog) niet bestaat uit de BUNDEL strippen. De bron blijft
# fotoklaar (zet het bestand in fotos/ en het verschijnt), maar de live site vraagt niets op
# wat er niet is — geen 404's in logs, geen verspilde requests, geen fetchpriority op niets.
python3 - <<'FOTO_PY'
import io, os, re, glob, json
from urllib.parse import urlsplit
n = 0
for f in glob.glob('website-online/*.html'):
    s = io.open(f, encoding='utf-8').read(); o = s
    def keep(m):
        src = re.search(r'src="([^"]+)"', m.group(0))
        return m.group(0) if (src and os.path.exists(os.path.join('website-online', src.group(1).split('?')[0]))) else ''
    # Alleen STATISCHE markup strippen. Binnen <script> staan dezelfde tags als
    # JS-tekst (bijv. de renderer van projecten.html); die mag je niet aanraken,
    # anders sloop je de code die de foto's juist plaatst.
    def buiten_scripts(tekst, patroon):
        stukken = re.split(r'(<script\b[^>]*>.*?</script>)', tekst, flags=re.S)
        for i in range(0, len(stukken), 2):
            stukken[i] = re.sub(patroon, keep, stukken[i])
        return ''.join(stukken)
    s = buiten_scripts(s, r'\s*<div class="hero-photo"[^>]*>\s*<img[^>]*>\s*</div>')
    s = buiten_scripts(s, r'\s*<img class="blog-photo"[^>]*>')
    # Portefeuillefoto's (.pf-foto): zonder bestand geen 404 in het log; zodra de
    # foto in fotos/ staat, blijft de laag staan en dekt hij de kaartknop af.
    s = buiten_scripts(s, r'\s*<img class="pf-foto"[^>]*>')
    if s != o:
        io.open(f, 'w', encoding='utf-8').write(s); n += 1
print("  ✓ ontbrekende fotoplekken gestript uit %d pagina('s)" % n)
# Ook dynamisch gerenderde kaarten mogen geen ontbrekende foto's opvragen.
pad = 'website-online/aanbod.json'
with open(pad, encoding='utf-8') as f: data = json.load(f)
def schoon(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'fotos' and isinstance(item, list):
                value[key] = [u for u in item if isinstance(u, str) and (urlsplit(u).scheme in ('http','https','data') or os.path.isfile(os.path.join('website-online', urlsplit(u).path)))]
            else: schoon(item)
    elif isinstance(value, list):
        for item in value: schoon(item)
schoon(data)
with open(pad, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, indent=2)
FOTO_PY

# Sitemap-datums (lastmod) volgen de INHOUD van elke pagina, niet de bestandsdatum (mtime).
# Een cache-buster-ronde (?v=) raakt ~80 bestanden tegelijk; met mtime kreeg dan elke URL dezelfde
# lastmod en gaat Google lastmod negeren. Per pagina bewaren we [hash, datum] in sitemap-hashes.json
# (repo-root, gaat NIET mee in de bundel). Alleen als de hash verandert wordt lastmod vandaag.
# De hash negeert ?v=-tokens en de dateModified die build-kennis.js per build stempelt.
python3 - <<'SITEMAP_PY'
import io, re, os, json, hashlib, datetime, subprocess
HASHES = 'sitemap-hashes.json'
try:
    opgeslagen = json.load(io.open(HASHES, encoding='utf-8'))
except Exception:
    opgeslagen = {}
vandaag = datetime.date.today().isoformat()
def tekst_hash(t):
    t = re.sub(r'\?v=[0-9a-z]+', '', t)
    t = re.sub(r'"dateModified":\s*"[0-9-]*"', '', t)
    return hashlib.sha1(t.encode('utf-8')).hexdigest()
def eerste_datum(p, h, huidig):
    # Nog geen hash bewaard: zoek in git de oudste commit van een ononderbroken reeks met dezelfde
    # inhoud (dus een commit die alleen ?v= wijzigde telt niet). Wijkt de huidige inhoud (zonder ?v=)
    # al af van de laatste commit, dan breekt de reeks meteen af = vandaag. Een niet-gecommitte
    # ?v=-bump alleen telt dus ook niet. Zonder git: de lastmod die al in de sitemap stond.
    try:
        rc = subprocess.call(['git', 'diff', '--quiet', 'HEAD', '--', p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if rc not in (0, 1): return huidig or vandaag
        log = subprocess.check_output(['git', 'log', '--format=%H %cs', '--', p], stderr=subprocess.DEVNULL).decode().split('\n')
        datum = None
        for regel in log:
            if not regel.strip(): continue
            sha, d = regel.split()
            try:
                oud = subprocess.check_output(['git', 'show', sha + ':' + p], stderr=subprocess.DEVNULL).decode('utf-8', 'replace')
            except Exception:
                break
            if tekst_hash(oud) != h: break
            datum = d
        return datum or vandaag
    except Exception:
        return huidig or vandaag
s = io.open('sitemap.xml', encoding='utf-8').read()
def blok(m):
    b = m.group(0)
    loc = re.search(r'<loc>(.*?)</loc>', b).group(1)
    p = re.sub(r'https?://(www\.)?home-?inn\.nl/?', '', loc) or 'homeinn-public.html'
    if not p.endswith('.html'): p += '.html'
    if not os.path.exists(p): return b
    h = tekst_hash(io.open(p, encoding='utf-8').read())
    oud = opgeslagen.get(p)
    if oud and oud[0] == h:
        d = oud[1]
    elif oud:
        d = vandaag
    else:
        huidig = re.search(r'<lastmod>(.*?)</lastmod>', b)
        d = eerste_datum(p, h, huidig.group(1) if huidig else None)
    opgeslagen[p] = [h, d]
    return re.sub(r'<lastmod>.*?</lastmod>', '<lastmod>%s</lastmod>' % d, b)
io.open('sitemap.xml', 'w', encoding='utf-8').write(re.sub(r'<url>.*?</url>', blok, s, flags=re.S))
io.open(HASHES, 'w', encoding='utf-8').write(json.dumps(opgeslagen, indent=1, sort_keys=True) + '\n')
print("  ✓ sitemap lastmod bijgewerkt (op inhoud)")
SITEMAP_PY

# SEO-bestanden meeleveren. _headers (Cloudflare Pages) gaat bewust NIET mee: homeinn.nl draait op
# Vercel, dat alleen vercel.json leest; een tweede, publiek leesbare kopie van de CSP raakt uit de pas.
cp robots.txt sitemap.xml llms.txt website-online/ 2>/dev/null || true
cp 7a22e12e33fce7b85e44fb8a26f7af89.txt website-online/ 2>/dev/null || true   # IndexNow-sleutelbestand: Bing/Yandex controleren hierop voordat zij een indexeringsverzoek accepteren
cp googleb83ad0198747fcb8.html website-online/ 2>/dev/null || true   # Google Search Console-eigendomsbewijs — verwijderen betekent dat de property vervalt
# Vercel: security-headers (CSP, HSTS), cache-regels en redirects
cp vercel.json website-online/ 2>/dev/null || true
# Publiek manifest (start_url ./, naam en omschrijving van de publieke site). Het portaal heeft zijn
# eigen manifest-portaal.webmanifest; dit bestand wordt ongewijzigd meegekopieerd.
cp manifest.webmanifest website-online/
cp -R assets website-online/assets
# Verwijder zware, ongebruikte logo-varianten uit de deploybundel (bronbestanden in assets/ blijven staan)
rm -f website-online/assets/logo-light-fullres.png website-online/assets/logo-light-original.png website-online/assets/logo-dark-original.png website-online/assets/homeinn-logo-new.png website-online/assets/logo-light-700.png website-online/assets/logo-light-700.webp
cp -R fonts website-online/fonts 2>/dev/null || true

# ── Minify CSS + publieke JS in de bundel (de bronbestanden blijven leesbaar) ──
# Verkleint de render-blocking stylesheet → betere Lighthouse/LCP. Gebruikt esbuild
# via npx en slaat NETJES over als esbuild/internet ontbreekt (bundel werkt dan
# gewoon ongeminificeerd). app.js / cloud.js (portaal) worden bewust niet geraakt.
# esbuild is GEPIND: een nieuwe versie wordt pas gebruikt als iemand hier bewust het nummer ophoogt
# (anders draait elke build de nieuwste npm-release over de code die live gaat).
ESBUILD_VERSIE=0.28.2
if command -v npx >/dev/null 2>&1; then
  echo "Minify CSS/JS in bundel (esbuild $ESBUILD_VERSIE)…"
  for f in tokens.css homeinn-public.css styles.css portal.css homeinn-public.js lightbox.js lead-cloud.js site-nav.js investeer-tools.js; do
    [ -f "website-online/$f" ] || continue
    if npx --yes "esbuild@$ESBUILD_VERSIE" "website-online/$f" --minify --outfile="website-online/$f.min" >/dev/null 2>&1; then
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

# ── Bundelcontrole ──
# Eerder ontbraken lead-cloud.js en site-nav.js stil in de bundel (leads kwamen niet in het portaal,
# het menu werkte niet) terwijl het script gewoon 'Klaar' meldde. Daarom: elk verplicht bestand en
# elke lokale src/href/srcset in de bundel-HTML (plus elke <loc> in de sitemap) moet bestaan, anders
# stopt de build met een foutcode. Verschillende ?v=-tokens voor hetzelfde bestand en ontbrekende
# foto's geven alleen een waarschuwing.
# Daarnaast bewaakt de controle de hosting-afspraken uit vercel.json (geldige JSON, blob: in img-src zodat
# foto-upload in het portaal werkt, geen 'unsafe-inline' in portaal/admin, geen includeSubDomains in HSTS),
# dat er geen interne bestanden (notities, generators, serverconfig) in de bundel staan, en dat de
# Supabase-bibliotheek op een vaste versie mét integrity (SRI) wordt geladen.
echo "Bundel controleren…"
python3 - <<'CHECK_PY' || { echo "  ✗ BUNDEL AFGEKEURD — website-online NIET deployen; los de ✗-punten hierboven eerst op en bouw opnieuw."; exit 1; }
import io, os, re, glob, sys, json, subprocess
from urllib.parse import urlsplit, unquote
B = 'website-online'
VERPLICHT = ['index.html', 'homeinn-public.html', 'homeinn-public.css', 'homeinn-public.js', 'tokens.css', 'site-nav.js',
             'lead-cloud.js', 'sw.js', 'vercel.json', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', '404.html',
             'aanbod.json', 'fonts/fonts.css', 'contact.html', 'investeren.html', 'pand-verkopen.html', 'privacy.html',
             'voorwaarden.html', 'cookies.html', 'inloggen.html', 'inloggen.js', 'investeerders.html', 'investeerders.js',
             'portaal.html', 'app.js', 'cloud.js', 'styles.css', 'admin.html', 'admin.js']
fout = [f for f in VERPLICHT if not os.path.isfile(os.path.join(B, f))]
mist, foto_mist, tokens = {}, {}, {}
SITE = re.compile(r'^https://homeinn\.nl/')
def doel(u):
    # Lokaal pad binnen de bundel (plus querystring), of None als het geen lokaal bestand is.
    if SITE.match(u):
        u = SITE.sub('', u)
    elif re.match(r'^([a-z][a-z0-9+.-]*:|//|#)', u, re.I):
        return None
    if not u or any(c in u for c in "'+${}<> "):
        return None  # stukje JavaScript (sjabloon of stringconcatenatie), geen echte URL
    p = urlsplit(u)
    pad = unquote(p.path).lstrip('/')
    if pad.startswith('./'): pad = pad[2:]
    if pad in ('', '.'): pad = 'index.html'
    if pad.endswith('/'): pad += 'index.html'
    return pad, p.query
for f in sorted(glob.glob(os.path.join(B, '*.html'))):
    s = io.open(f, encoding='utf-8').read()
    for attr, val in re.findall(r'\b(src|href|srcset)\s*=\s*"([^"]*)"', s):
        for u in ([d.strip().split(' ')[0] for d in val.split(',')] if attr == 'srcset' else [val.strip()]):
            r = doel(u)
            if not r: continue
            pad, query = r
            if not os.path.exists(os.path.join(B, pad)):
                (foto_mist if pad.startswith('fotos/') else mist).setdefault(pad, set()).add(os.path.basename(f))
            v = re.search(r'(?:^|&)v=([^&]+)', query)
            if v: tokens.setdefault(pad, {}).setdefault(v.group(1), set()).add(os.path.basename(f))
sm = os.path.join(B, 'sitemap.xml')
if os.path.isfile(sm):
    for loc in re.findall(r'<loc>(.*?)</loc>', io.open(sm, encoding='utf-8').read()):
        r = doel(loc.strip())
        if r and not os.path.exists(os.path.join(B, r[0])):
            mist.setdefault(r[0], set()).add('sitemap.xml')
# -- Interne bestanden mogen nooit in de bundel (de bundel is wat publiek live gaat) --
INTERN = re.compile(r'(^|/)(_headers|_config\.yml|sitemap-hashes\.json|spokes-content\.json|kennis-content\.json|\.env[^/]*)$|\.(md|command|ts|sql|py|sh|yml|yaml)$|(^|/)build-[^/]*\.js$', re.I)
intern = []
for root, dirs, files in os.walk(B):
    dirs[:] = [d for d in dirs if d != '.vercel']
    for n in files:
        rel = os.path.relpath(os.path.join(root, n), B)
        if INTERN.search(rel): intern.append(rel)
# -- vercel.json: geldig en met de afgesproken headers --
vfout, vwaarsch = [], []
def csp_delen(c):
    d = {}
    for deel in c.split(';'):
        t = deel.strip().split()
        if t: d[t[0]] = t[1:]
    return d
try:
    vj = json.load(io.open(os.path.join(B, 'vercel.json'), encoding='utf-8'))
except Exception as e:
    vj = None
    vfout.append("vercel.json is geen geldige JSON (%s)" % e)
if vj is not None:
    for regel in vj.get('headers', []):
        bron = regel.get('source', '')
        for h in regel.get('headers', []):
            sleutel, waarde = h.get('key', '').lower(), h.get('value', '')
            if sleutel == 'content-security-policy':
                d = csp_delen(waarde)
                if 'blob:' not in d.get('img-src', []):
                    vfout.append("CSP voor %s mist blob: in img-src (foto-upload in het portaal faalt dan)" % bron)
                if 'portaal' in bron or 'admin' in bron:
                    if "'unsafe-inline'" in d.get('script-src', []):
                        vfout.append("CSP voor %s staat 'unsafe-inline' in script-src toe (portaal/admin horen strikt te zijn)" % bron)
            if sleutel == 'strict-transport-security' and re.search(r'includesubdomains|preload', waarde, re.I):
                vwaarsch.append("HSTS bevat includeSubDomains/preload: webmail.homeinn.nl (Hostnet, ander certificaat) is dan onbereikbaar")
    # Vercel past ALLE passende header-regels toe in de volgorde van het bestand; bij dezelfde header wint de LAATSTE.
    # De strikte portaal/admin-CSP werkt dus alleen als zijn regel NA de algemene /(.*)-regel staat: toets daarom de
    # effectieve CSP per pad, niet alleen de afzonderlijke regels.
    def effectief_csp(pad):
        gekozen = None
        for regel in vj.get('headers', []):
            try:
                if not re.fullmatch(regel.get('source', ''), pad): continue
            except re.error:
                continue
            for h in regel.get('headers', []):
                if h.get('key', '').lower() == 'content-security-policy':
                    gekozen = h.get('value', '')
        return gekozen
    for pad in ('/portaal.html', '/admin.html'):
        c = effectief_csp(pad)
        if c is None:
            vfout.append("geen CSP-regel voor %s in vercel.json" % pad)
        elif "'unsafe-inline'" in csp_delen(c).get('script-src', []):
            vfout.append("effectieve CSP voor %s staat 'unsafe-inline' in script-src toe: staat de strikte regel vóór de algemene /(.*)-regel? (bij dezelfde header wint de laatste regel)" % pad)
    c = effectief_csp('/index.html')
    if c is None:
        vfout.append("geen CSP-regel voor de publieke pagina's in vercel.json")
    elif 'blob:' not in csp_delen(c).get('img-src', []):
        vfout.append("effectieve CSP voor de publieke pagina's mist blob: in img-src")
# -- Supabase-bibliotheek: vaste versie + integrity + crossorigin (SRI werkt niet op de zwevende @2-tag) --
sdk_los = {}
for f in sorted(glob.glob(os.path.join(B, '*.html'))):
    for tag in re.findall(r'<script\b[^>]*\bsrc\s*=\s*"https?://[^"]*supabase-js[^"]*"[^>]*>', io.open(f, encoding='utf-8').read()):
        src = re.search(r'src\s*=\s*"([^"]+)"', tag).group(1)
        if not re.search(r'supabase-js@\d+\.\d+\.\d+/', src) or not re.search(r'integrity\s*=\s*"sha384-', tag) or 'crossorigin' not in tag:
            sdk_los.setdefault(src, set()).add(os.path.basename(f))
# De generators (build-legal/-spokes/-kennis) hebben de ?v-tokens ingebakken en schrijven bij elke build 19 pagina's
# opnieuw. Bumpt iemand de tokens alleen in de *.html-bronnen, dan draaien die 19 pagina's met een oude token (en
# houden browsers en de service worker de oude stylesheet vast). Dat is een fout, geen waarschuwing.
GEGENEREERD = re.compile(r'^(privacy|voorwaarden|cookies|kennis(-.*)?|verkopen-.*)\.html$')
gefout = []
for pad, per in sorted(tokens.items()):
    if len(per) > 1:
        tekst = ', '.join('%s (%s)' % (t, ', '.join(sorted(p)[:3]) + (' …' if len(p) > 3 else '')) for t, p in sorted(per.items()))
        if any(GEGENEREERD.match(n) for ps in per.values() for n in ps):
            gefout.append("%s heeft verschillende ?v=-tokens: %s. Gegenereerde pagina's volgen build-legal.js/build-spokes.js/build-kennis.js: bump daar dezelfde token en draai de generators." % (pad, tekst))
        else:
            print("  ⚠ %s heeft verschillende ?v=-tokens: %s" % (pad, tekst))
# ?v-bump-controle (alleen met git): een bestand dat sinds de laatste commit is gewijzigd moet een NIEUWE ?v-token
# krijgen, anders blijven bezoekers en de service worker (cache eerst op ?v-URL's) de oude versie serveren.
def git(*a):
    try:
        return subprocess.check_output(('git',) + a, stderr=subprocess.DEVNULL).decode('utf-8', 'replace')
    except Exception:
        return None
bump, gewijzigd = [], []
if git('rev-parse', '--verify', 'HEAD') is not None:
    for pad, per in sorted(tokens.items()):
        if not os.path.isfile(pad): continue
        if subprocess.call(['git', 'diff', '--quiet', 'HEAD', '--', pad], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) != 1: continue
        gewijzigd.append(pad)
        oud = set()
        for pagina in {n for ps in per.values() for n in ps}:
            h = git('show', 'HEAD:' + pagina)
            if h: oud |= set(re.findall(re.escape(pad) + r'\?v=([0-9a-z]+)', h))
        if oud and set(per) <= oud:
            bump.append("%s is gewijzigd sinds de laatste commit, maar zijn ?v-token (%s) is niet gebumpt: bezoekers en de service worker houden de oude versie vast" % (pad, ', '.join(sorted(per))))
    m_nu = re.search(r"const CACHE = '([^']+)'", io.open('sw.js', encoding='utf-8').read())
    m_oud = re.search(r"const CACHE = '([^']+)'", git('show', 'HEAD:sw.js') or '')
    if (gewijzigd or subprocess.call(['git', 'diff', '--quiet', 'HEAD', '--', 'sw.js'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 1) \
            and m_nu and m_oud and m_nu.group(1) == m_oud.group(1):
        print("  ⚠ sw.js: CACHE (%s) is niet opgehoogd terwijl er wijzigingen zijn; oude caches blijven dan staan" % m_nu.group(1))
for pad, bron in sorted(foto_mist.items()):
    print("  ⚠ foto ontbreekt: %s (gevraagd door %s)" % (pad, ', '.join(sorted(bron)[:4])))
for src, per in sorted(sdk_los.items()):
    print("  ⚠ Supabase-bibliotheek zonder vaste versie + integrity: %s (in %s)" % (src, ', '.join(sorted(per)[:5]) + (' …' if len(per) > 5 else '')))
for w in sorted(set(vwaarsch)):
    print("  ⚠ %s" % w)
for f in fout:
    print("  ✗ verplicht bestand ontbreekt in de bundel: %s" % f)
for pad, bron in sorted(mist.items()):
    print("  ✗ %s ontbreekt, maar wordt gevraagd door %s" % (pad, ', '.join(sorted(bron)[:4]) + (' …' if len(bron) > 4 else '')))
for rel in sorted(intern):
    print("  ✗ intern bestand staat in de bundel (hoort niet publiek): %s" % rel)
for m in vfout + gefout + bump:
    print("  ✗ %s" % m)
if fout or mist or intern or vfout or gefout or bump:
    sys.exit(1)
print("  ✓ alle verplichte bestanden en lokale verwijzingen staan in de bundel")
CHECK_PY

echo "Klaar: upload de inhoud van 'website-online' naar je hosting."
[ "${HOMEINN_NO_OPEN:-0}" = "1" ] || open website-online
