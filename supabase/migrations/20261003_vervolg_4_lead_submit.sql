-- Structurele spamoplossing voor de publieke lead-intake (audit 3 oktober 2026, LEAD-07 / SEC-02).
-- Fase A van twee: dit bestand is veilig om toe te passen vóórdat de edge function live staat;
-- er verandert niets voor bezoekers. Fase B (20261003_vervolg_5_anon_insert_dicht.sql) sluit pas
-- de directe anon-insert af, ná een live test van de function.
--
-- PROBLEEM
-- De publishable (anon) sleutel staat in lead-cloud.js en is bedoeld voor de browser. Wie hem pakt
-- kan 40 aanvragen per uur ongeremd invoegen (vanaf elk IP-adres) en zo de cloud-intake voor echte
-- aanvragen dichtzetten; tegen die rem is niets te doen zolang de database zelf geen IP-adres kent.
--
-- OPLOSSING
-- De website stuurt een aanvraag naar de edge function 'lead-submit'. Die hasht het IP-adres
-- (HMAC met een geheime sleutel; het adres zelf wordt nooit opgeslagen) en roept
-- public.hios_lead_submit() aan, die in ÉÉN transactie telt, beslist en invoegt:
--   - per IP-hash: 5 per uur en 15 per dag;
--   - hele site: 40 per uur en 150 per dag;
--   - per e-mailadres en per telefoonnummer: 3 per uur (zelfde regel als de oude anon-rem);
--   - zelfde local_id twee keer (dubbelklik): geen tweede rij, wel 'dubbel' (de function meldt succes).
-- De IP-log (private.lead_submit_log) bewaart alleen de hash en wordt na 2 dagen gewist.
-- Alleen de service role mag de functie uitvoeren: anon en ingelogde gebruikers niet.

create schema if not exists private;

create table if not exists private.lead_submit_log (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_submit_log_ip_idx   on private.lead_submit_log (ip_hash, created_at desc);
create index if not exists lead_submit_log_tijd_idx on private.lead_submit_log (created_at desc);
alter table private.lead_submit_log enable row level security;   -- geen policies: niemand via de API
revoke all on table private.lead_submit_log from public, anon, authenticated;

create or replace function public.hios_lead_submit(p_ip_hash text, p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_email  text := left(btrim(coalesce(p->>'email', '')), 254);
  v_phone  text := left(btrim(coalesce(p->>'phone', '')), 100);
  v_digits text := regexp_replace(left(btrim(coalesce(p->>'phone', '')), 100), '[^0-9+]', '', 'g');
  n_ip_uur int; n_ip_dag int; n_alg_uur int; n_alg_dag int; n_email int; n_tel int;
begin
  if coalesce(p_ip_hash, '') = '' or jsonb_typeof(p) is distinct from 'object' then
    return 'ongeldig';
  end if;

  -- Gelijktijdige verzoeken van hetzelfde IP achter elkaar zetten, zodat de limiet niet te omzeilen is
  -- door er tien tegelijk af te vuren.
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));

  delete from private.lead_submit_log where created_at < now() - interval '2 days';

  select count(*) filter (where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'),
         count(*) filter (where ip_hash = p_ip_hash),
         count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into n_ip_uur, n_ip_dag, n_alg_uur, n_alg_dag
    from private.lead_submit_log
   where created_at > now() - interval '1 day';

  if n_ip_uur >= 5 or n_ip_dag >= 15 then return 'limiet_ip'; end if;
  if n_alg_uur >= 40 or n_alg_dag >= 150 then return 'limiet_algemeen'; end if;

  if v_email <> '' then
    select count(*) into n_email from public.hios_leads
     where created_at > now() - interval '1 hour'
       and lower(btrim(coalesce(email, ''))) = lower(v_email);
    if n_email >= 3 then return 'limiet_afzender'; end if;
  end if;
  if v_digits <> '' then
    select count(*) into n_tel from public.hios_leads
     where created_at > now() - interval '1 hour'
       and regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = v_digits;
    if n_tel >= 3 then return 'limiet_afzender'; end if;
  end if;

  begin
    -- Alleen de tien formuliervelden; id, created_at, status, notified_at, note en assignee_email
    -- krijgen hun standaardwaarde. De BEFORE INSERT-trigger kort teksten verder in en maakt een
    -- afwijkende local_id leeg.
    insert into public.hios_leads (local_id, type, source, name, email, phone, subject, message, portfolio, handled)
    values (nullif(p->>'local_id', ''), coalesce(nullif(p->>'type', ''), 'Contact'), p->>'source',
            p->>'name', v_email, v_phone, p->>'subject', p->>'message', p->>'portfolio', false);
  exception when unique_violation then
    return 'dubbel';
  end;

  insert into private.lead_submit_log (ip_hash) values (p_ip_hash);
  return 'ok';
end; $$;

revoke all on function public.hios_lead_submit(text, jsonb) from public, anon, authenticated;
grant execute on function public.hios_lead_submit(text, jsonb) to service_role;

notify pgrst, 'reload schema';
