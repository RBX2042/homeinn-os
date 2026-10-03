-- Publieke lead-intake dichtzetten (audit 3 oktober 2026: LEAD-02 / F02 / SEC-02, plus een
-- bulk-insert-gat dat bij het uitwerken bovenkwam).
-- NOG NIET TOEGEPAST op project evguvdpuidyvkiinzvys: de eigenaar/orchestrator past dit toe.
-- Bouwt voort op 20261003_lead_rate_private_schema.sql (die is al toegepast).
--
-- PROBLEEM
-- anon had INSERT op ALLE kolommen van hios_leads, dus ook op created_at, notified_at, status,
-- note, assignee_email en id. private.hios_lead_rate_ok telde rijen met
-- created_at > now() - 1 uur, zonder bovengrens. Daardoor:
--   * tellen 40 rijen met created_at = 2099 tot 2099 mee. Elke echte cloud-lead faalt dan op RLS,
--     maar de bezoeker ziet via FormSubmit toch 'gelukt', dus het verlies blijft stil;
--   * blokkeren 3 zulke rijen per e-mailadres of telefoonnummer die afzender voorgoed;
--   * tellen rijen met een created_at van meer dan een uur geleden niet mee: onbeperkt spam;
--   * kan een nep-lead met vooraf ingevulde status/notified_at/note er 'afgehandeld' uitzien;
--   * is de database (gratis plan 500 MB, daarboven alleen-lezen voor het HELE project, dus ook
--     portaal en geldgeversportaal) met lange teksten te vullen: er waren geen lengtegrenzen.
-- Daarnaast: een PostgREST-insert met een JSON-ARRAY voegt veel rijen in één statement in. De rem
-- is STABLE en ziet de rijen van datzelfde statement niet, dus elke rij 'past' en de grens van
-- 40 per uur (en 3 per afzender) geldt niet. lead-cloud.js stuurt altijd één object per verzoek.
--
-- OPLOSSING (gelaagd)
--   1. anon mag alleen nog de tien velden invullen die lead-cloud.js stuurt; al het andere krijgt
--      altijd de standaardwaarde. UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER voor anon gaan eraf
--      (RLS blokkeerde UPDATE/DELETE al; TRUNCATE valt buiten RLS). SELECT blijft bewust: de
--      keep-alive-workflow (.github/workflows) doet een anon GET ?select=id en RLS geeft [] terug.
--   2. BEFORE INSERT-trigger: voor anon worden de serverkolommen hard op hun standaard gezet
--      (vangnet voor als de kolomrechten ooit weer verbreed worden) en voor iedereen worden de
--      tekstvelden ingekort. Een echte lead loopt dus nooit stuk op de lengtegrens van stap 3.
--   3. Lengtegrenzen (CHECK) op de publiek invulbare velden.
--   4. Eén rij per anon-verzoek (statement-trigger): bulk-inserts worden geweigerd.
--   5. De rem telt alleen nog rijen met created_at tussen now() - 1 uur en now() + 1 minuut, en
--      vergelijkt e-mail (getrimd, kleine letters) en telefoon (alleen cijfers en +) genormaliseerd.
--
-- LET OP voor lead-cloud.js: stuur GEEN andere sleutels dan de tien uit stap 1, anders weigert de
-- database de hele insert (42501 permission denied) en komt de lead niet in de cloud.
-- local_id: de trigger in stap 2 maakt alles dat niet het eigen formaat is ('lead' + base36, zelfde
-- patroon als LOCAL_ID_RE in lead-cloud.js) NULL, zodat de CHECK hios_leads_local_id_fmt uit
-- 20261003_portaal_koppeling_en_afscherming.sql nooit een echte lead weigert (in welke volgorde de
-- twee migraties ook worden toegepast). Past u LOCAL_ID_RE aan, pas dan ook het patroon in die
-- trigger en in die constraint aan (drie plekken, steeds hetzelfde patroon).
--
-- CONTROLE NA TOEPASSEN
--   * één echte formulierinzending: verwacht 201 en een rij met standaard created_at en status 'nieuw';
--   * select count(*) from public.hios_leads where created_at > now() + interval '5 minutes';  -- verwacht 0
--   * select conname from pg_constraint where conrelid = 'public.hios_leads'::regclass and contype = 'c';
--     verwacht: hios_leads_lengte (plus hios_leads_local_id_fmt zodra
--     20261003_portaal_koppeling_en_afscherming.sql is toegepast);
--   * select tgname from pg_trigger where tgrelid = 'public.hios_leads'::regclass and not tgisinternal;
--     verwacht: hios_leads_een_per_verzoek, hios_leads_notify, hios_leads_voor_insert;
--   * select privilege_type, string_agg(column_name, ',') from information_schema.column_privileges
--       where table_schema = 'public' and table_name = 'hios_leads' and grantee = 'anon' group by 1;
--     verwacht: INSERT op de tien velden, SELECT op alle kolommen, niets anders.

-- 1. Kolomrechten -----------------------------------------------------------------------------
-- Eerst het tabelbrede recht intrekken (dat neemt ook eventuele kolomrechten mee), dan per kolom
-- teruggeven. Volgorde is belangrijk: een kolom-GRANT naast een tabelbrede GRANT beperkt niets.
revoke insert, update, delete, truncate, references, trigger on table public.hios_leads from anon;
grant insert (local_id, type, source, name, email, phone, subject, message, portfolio, handled)
  on table public.hios_leads to anon;

-- 2. Serverkolommen afdwingen en tekst inkorten ------------------------------------------------
create or replace function private.hios_leads_voor_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'anon' then
    new.id             := gen_random_uuid();
    new.created_at     := now();
    new.notified_at    := null;
    new.status         := 'nieuw';
    new.note           := null;
    new.assignee_email := null;
    new.handled        := false;
  end if;
  -- Zelfde grenzen als de CHECK hieronder: inkorten in plaats van weigeren, zodat een lange
  -- (echte) aanvraag gewoon binnenkomt. De volledige tekst staat ook in de FormSubmit-mail.
  -- local_id: alleen het eigen formaat van de website, anders NULL (de portaal-inbox valt dan
  -- terug op de uuid). Zelfde patroon als LOCAL_ID_RE in lead-cloud.js en de CHECK
  -- hios_leads_local_id_fmt (20261003_portaal_koppeling_en_afscherming.sql).
  if new.local_id is not null and new.local_id !~ '^lead[a-z0-9]{4,24}$' then
    new.local_id := null;
  end if;
  new.type      := coalesce(nullif(left(btrim(new.type), 80), ''), 'Contact');
  new.source    := left(new.source, 300);
  new.name      := left(btrim(new.name), 200);
  new.email     := left(btrim(new.email), 254);
  new.phone     := left(btrim(new.phone), 100);
  new.subject   := left(new.subject, 300);
  new.message   := left(new.message, 5000);
  new.portfolio := left(new.portfolio, 300);
  return new;
end; $$;
-- Een triggerfunctie heeft geen EXECUTE-recht van de aanroeper nodig; niemand hoeft haar los aan
-- te roepen.
revoke all on function private.hios_leads_voor_insert() from public, anon, authenticated;

drop trigger if exists hios_leads_voor_insert on public.hios_leads;
create trigger hios_leads_voor_insert before insert on public.hios_leads
  for each row execute function private.hios_leads_voor_insert();

-- 3. Lengtegrenzen -----------------------------------------------------------------------------
-- Bestaande te lange rijen eerst inkorten (op 3 oktober 2026 waren er 0 rijen), zodat de CHECK
-- altijd valideert en de migratie niet halverwege stukloopt.
update public.hios_leads set
  local_id  = left(local_id, 64),
  type      = left(type, 80),
  source    = left(source, 300),
  name      = left(name, 200),
  email     = left(email, 254),
  phone     = left(phone, 100),
  subject   = left(subject, 300),
  message   = left(message, 5000),
  portfolio = left(portfolio, 300)
where length(coalesce(local_id, '')) > 64 or length(type) > 80 or length(coalesce(source, '')) > 300
   or length(coalesce(name, '')) > 200 or length(coalesce(email, '')) > 254
   or length(coalesce(phone, '')) > 100 or length(coalesce(subject, '')) > 300
   or length(coalesce(message, '')) > 5000 or length(coalesce(portfolio, '')) > 300;

alter table public.hios_leads drop constraint if exists hios_leads_lengte;
alter table public.hios_leads add constraint hios_leads_lengte check (
      length(coalesce(local_id, ''))  <= 64
  and length(type)                    <= 80
  and length(coalesce(source, ''))    <= 300
  and length(coalesce(name, ''))      <= 200
  and length(coalesce(email, ''))     <= 254
  and length(coalesce(phone, ''))     <= 100
  and length(coalesce(subject, ''))   <= 300
  and length(coalesce(message, ''))   <= 5000
  and length(coalesce(portfolio, '')) <= 300
);

-- 4. Eén aanvraag per anon-verzoek ------------------------------------------------------------
create or replace function private.hios_leads_een_per_verzoek()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'anon' then
    if (select count(*) from nieuw) > 1 then
      raise exception 'Maximaal een aanvraag per verzoek';
    end if;
  end if;
  return null;
end; $$;
revoke all on function private.hios_leads_een_per_verzoek() from public, anon, authenticated;

drop trigger if exists hios_leads_een_per_verzoek on public.hios_leads;
create trigger hios_leads_een_per_verzoek after insert on public.hios_leads
  referencing new table as nieuw
  for each statement execute function private.hios_leads_een_per_verzoek();

-- 5. Rem met bovengrens en genormaliseerde vergelijking ------------------------------------------
-- Zelfde signatuur als in 20261003_lead_rate_private_schema.sql, dus de policy
-- "hios_leads: publiek meldt" hoeft niet opnieuw te worden aangemaakt.
create or replace function private.hios_lead_rate_ok(p_email text, p_phone text)
returns boolean language sql stable security definer set search_path = '' as $$
  with recent as (
    select lower(btrim(coalesce(l.email, ''))) as email,
           regexp_replace(coalesce(l.phone, ''), '[^0-9+]', '', 'g') as phone
      from public.hios_leads l
     where l.created_at >  now() - interval '1 hour'
       and l.created_at <= now() + interval '1 minute'
  )
  select (select count(*) from recent) < 40
     and (lower(btrim(coalesce(p_email, ''))) = ''
          or (select count(*) from recent
               where recent.email = lower(btrim(coalesce(p_email, '')))) < 3)
     and (regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') = ''
          or (select count(*) from recent
               where recent.phone = regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g')) < 3);
$$;
revoke all on function private.hios_lead_rate_ok(text, text) from public;
grant execute on function private.hios_lead_rate_ok(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
