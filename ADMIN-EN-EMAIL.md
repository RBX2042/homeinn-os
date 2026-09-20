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
