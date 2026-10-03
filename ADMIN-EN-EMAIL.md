# Adminpaneel & e-mail (Resend)

_20 september 2026_

## 1. Wat is het adminpaneel?

`admin.html` is het **cloudscherm**: het toont uitsluitend wat er centraal in Supabase
staat. HomeINN OS (`portaal.html`) blijft local-first werken op localStorage; het
adminpaneel is de plek waar je ziet wat er écht is binnengekomen — ook als de aanvraag
op een ander apparaat of via de telefoon is gedaan.

Bereikbaar via `https://homeinn.nl/admin.html` en via de sidebar van HomeINN OS
(Overig → *Adminpaneel (cloud)*).

**Toegang:** inloggen met een magic link. Alleen profielen met rol `eigenaar` of `team`
komen binnen. De echte beveiliging zijn de RLS-policies (`hios_is_staff()`); de
inlogpoort is de nette voordeur.

**Onderdelen**

| Scherm | Wat je ziet / kunt |
| --- | --- |
| Dashboard | Zes kengetallen + de laatste aanvragen en verzonden e-mail |
| Aanvragen | Alle website-leads, filterbaar, met status, notitie, CSV-export en verwijderen |
| E-maillog | Elke via Resend verstuurde mail, met status en foutmelding |
| Mail versturen | Losse mail (`notify`) en nieuwsbrief per ontvanger (`broadcast`) |
| Panden / Projecten / Onderhoud | Cloudgegevens; onderhoudsstatus en foto's direct aanpasbaar/te bekijken |
| Investeerders | Inleg, rendement, WWFT-status en portaalkoppeling |
| Financieel | Facturen, kosten, financieringen + drie kengetallen |
| Contracten | Verstuurde stukken en ondertekenstatus |
| Gebruikers | Rollen aanpassen (bepaalt welk rolportaal iemand ziet) |
| Systeem | Cloudstatus, Resend-status, lead-meldingen, laatste OS-back-up, rijentelling |

## 2. E-mail via Resend

Drie edge functions in `supabase/functions/`:

- **`lead-notify`** (nieuw) — wordt door de database zelf aangeroepen zodra er een rij
  in `hios_leads` komt. Stuurt een **intern alarm** naar `OPERATOR_EMAIL` (met
  reply-to op de aanvrager) én een **ontvangstbevestiging** aan de aanvrager, in het
  Nederlands of Engels afhankelijk van de bronpagina.
- **`notify`** — losse notificatie (v2: logt nu in `hios_emails`).
- **`broadcast`** — nieuwsbrief, per ontvanger apart verstuurd (v2: logt elke ontvanger).

De keten: `insert op hios_leads` → trigger `hios_leads_notify` → `pg_net` →
`lead-notify` → Resend → log in `hios_emails`.

`lead-notify` draait zonder JWT omdat de database hem aanroept. Misbruik is uitgesloten
door **idempotentie**: er gaat alleen mail uit voor een bestaande lead die nog geen
`notified_at` heeft en jonger is dan een dag. Een tweede aanroep doet niets.

### Zetten vóór er mail uitgaat

In Supabase → Project Settings → Edge Functions → Secrets:

| Secret | Waarde |
| --- | --- |
| `RESEND_API_KEY` | API-sleutel uit resend.com |
| `FROM_EMAIL` | bijv. `HomeINN <noreply@homeinn.nl>` — het domein moet in Resend geverifieerd zijn |
| `OPERATOR_EMAIL` | `info@homeinn.nl` |
| `ADMIN_URL` | `https://homeinn.nl/admin.html` |

Zolang `RESEND_API_KEY` ontbreekt gaat er **geen** mail uit, maar wordt elke poging wél
gelogd met status `overgeslagen` — zichtbaar in het adminpaneel onder Systeem.

Let op: `homeinn.nl` heeft DMARC `p=reject`. Voeg het SPF-record en de DKIM-records van
Resend toe aan de DNS bij Hostnet, anders wordt de mail geweigerd.

### Testen
Adminpaneel → Systeem → *Stuur testmail naar mezelf*. Daarna E-maillog bekijken.

## 3. Verhouding tot FormSubmit
De publieke formulieren mailen nog via FormSubmit naar `info@homeinn.nl`. Zodra Resend
draait, ontvang je die melding dubbel. FormSubmit kan dan uit de formulieren; doe dat pas
nadat je in het E-maillog hebt gezien dat `lead-alert` er betrouwbaar doorkomt.

## 4. Beveiliging

Wat er tijdens de oplevering is gerepareerd en hoe het nu dichtzit:

- **Het scherm ging niet dicht.** `.sidebar` en `.gate` krijgen in `styles.css` een
  eigen `display`-waarde, en zo'n author-regel wint van het `hidden`-attribuut: het
  paneel bleef zichtbaar zonder inlog. Opgelost met `[hidden] { display:none !important }`
  in `admin.html`; die regel moet blijven staan. De gegevens zelf waren altijd al
  afgeschermd door RLS — een niet-ingelogde bezoeker kreeg overal lege lijsten terug.
- **Rechtenescalatie (kritiek, bestond al vóór het adminpaneel).** De policy
  `profiel: eigen update` had geen `WITH CHECK`, waardoor elke ingelogde gebruiker
  `update hios_profiles set role='eigenaar'` op zijn eigen rij kon doen en daarmee
  staff werd. Nu bewaakt de trigger `hios_profiles_guard` dat niet-staf alleen de
  eigen naam wijzigt; `id`, `email`, `role` en `active` worden teruggezet. Getest:
  de rolwijziging wordt genegeerd, de naamswijziging gaat door.
- **Mailrelay-misbruik.** `hios_leads` staat open voor anonieme inserts (de website
  vult hem), en sinds de trigger betekent elke rij uitgaande mail. Twee remmen:
  maximaal 40 inzendingen per uur (`hios_lead_rate_ok`, in de insert-policy) en
  maximaal vijf mails per etmaal naar hetzelfde adres (in `lead-notify`). Alleen
  adressen die de strikte controle doorstaan krijgen een bevestiging.
- **Uitloggen** wist nu de hele DOM en herlaadt de pagina; een verlopen sessie sluit
  de poort meteen.
- Gecontroleerd en in orde: alle `hios_*`-tabellen leveren anoniem lege lijsten,
  de storage-bucket `onderhoud` is privé met een map-per-gebruiker-policy, en alle
  waarden uit de database worden ge-escaped voordat ze in het paneel of in een
  mail terechtkomen.

### Nog open: het Resend-domein
De API-sleutel werkt, maar Resend weigert met *"The homeinn.nl domain is not
verified"*. Voeg `homeinn.nl` toe op https://resend.com/domains, zet de getoonde
DKIM- en SPF-records in de DNS bij Hostnet en verifieer. Tot die tijd komt er geen
mail aan; elke poging staat wel in het e-maillog met de foutmelding erbij.


---

## Edge functions plaatsen en de aanvraagroute veiligstellen (3 oktober 2026)

Er zijn vier functies. **Alle vier plaatsen vanuit de repo-root** (daar staat `supabase/config.toml`, die
`lead-submit` en `lead-notify` zonder JWT laat draaien):

```bash
supabase login                                   # opent de browser; keur goed
supabase functions deploy lead-submit --no-verify-jwt --use-api --project-ref evguvdpuidyvkiinzvys
supabase functions deploy lead-notify --no-verify-jwt --use-api --project-ref evguvdpuidyvkiinzvys
supabase functions deploy notify    --use-api --project-ref evguvdpuidyvkiinzvys
supabase functions deploy broadcast --use-api --project-ref evguvdpuidyvkiinzvys
```

`--no-verify-jwt` is verplicht voor `lead-submit` en `lead-notify`: bezoekers en de database-trigger sturen
geen JWT. Zonder die vlag antwoordt de gateway met 401 en valt het formulier stilletjes terug op de oude route.
`notify` en `broadcast` blijven mét JWT (alleen ingelogd team).

### Direct na het plaatsen: de acceptatietest (alles moet kloppen)

1. **Leeft hij, en is verify_jwt uit?** Verwacht **HTTP 400**, niet 401 of 404:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Origin: https://homeinn.nl' -d '{}' \
     https://evguvdpuidyvkiinzvys.supabase.co/functions/v1/lead-submit
   ```
2. **Werkt de database-aanroep?** Verwacht `{"ok":true}`:
   ```bash
   curl -s -X POST -H 'Origin: https://homeinn.nl' -d '{"type":"__gezondheid"}' \
     https://evguvdpuidyvkiinzvys.supabase.co/functions/v1/lead-submit
   ```
3. **Staat verify_jwt goed?** In Supabase (Dashboard > Edge Functions) of via de MCP-koppeling:
   `lead-submit` en `lead-notify` → verify_jwt **uit**; `notify` en `broadcast` → **aan**.
4. **Een echte aanvraag via de website** op https://homeinn.nl (contactformulier, met je eigen
   e-mailadres). Controleer **alle** punten:
   - de browser-netwerktab toont `POST /functions/v1/lead-submit` → 201 en **géén** `POST /rest/v1/hios_leads`;
   - `select count(*) from private.lead_submit_log where created_at > now() - interval '30 minutes';` → minstens 1
     (alleen de function schrijft daar; een rij in `hios_leads` bewijst niets, want de terugval kan hem ook
     hebben ingevoegd);
   - in `hios_emails` staat een `lead-alert` met status `verzonden`, en je krijgt de mail
     *"Nieuwe aanvraag: Contact"* (de Resend-mail) náást de FormSubmit-mail;
   - Dashboard > Edge Functions > lead-submit > Logs: geen 5xx en geen regel *"geen cf-connecting-ip"*.
   Maximaal 3 testen per uur vanaf één netwerk (limiet 5 per uur per IP-bereik); een 429 valt bewust niet terug.
5. Verwijder de testaanvraag in het adminpaneel.

### Pas daarna: fase B (de directe route dichtzetten)

Zonder fase B houdt iedereen met de (openbare) sleutel in `lead-cloud.js` een directe route naar de tabel,
met alleen de oude rem van 40 per uur. Fase B sluit die. **Wacht minstens 48 uur na het live zetten van de
nieuwe `lead-cloud.js`** (browsers houden het oude script een dag vast) en voer dan uit:

```sql
-- verwacht 0 (aanvragen die NIET via de function zijn binnengekomen):
select count(*) from public.hios_leads l where l.created_at > now() - interval '2 days'
  and not exists (select 1 from private.lead_submit_log g where g.created_at = l.created_at);
```
daarna `supabase/migrations/20261003_vervolg_5_anon_insert_dicht.sql` (weigert zelf als de function de
laatste 2 dagen niets heeft opgeslagen). **Terugdraaien:** `supabase/rollback/20261003_vervolg_5_TERUGDRAAIEN.sql`.

### Doorlopend

- De GitHub-taak *Supabase controleren* draait elke dag en mailt je als `lead-submit` niet gezond is. Daarna
  komen aanvragen alleen nog per **FormSubmit**-mail binnen. Elke echte aanvraag geeft normaal **twee** mails op
  info@homeinn.nl: *"Website-aanvraag: …"* (FormSubmit) en *"Nieuwe aanvraag: …"* (Resend). Komt alleen de eerste,
  dan is de cloudroute stuk.
- Nieuwe domeinnaam of alias voor de website? Voeg die toe aan `TOEGESTANE_ORIGINS` in
  `supabase/functions/lead-submit/valideer.ts` en plaats de function opnieuw.
- Boven 40 aanvragen per uur of 150 per dag worden aanvragen opgeslagen met status `spamverdacht`: geen mail,
  niet in de gewone lijsten, de teller staat op het dashboard, na 30 dagen gewist. Boven 200 per uur of 600
  per dag weigert de function nog (429).
- Het alarmplafond van `lead-notify` is 25 alarmen en 10 bevestigingen per 24 uur (het gratis Resend-plan
  geeft ~100 mails per dag voor alle mail). Daarboven krijg je hoogstens één overzichtsmail per uur.
