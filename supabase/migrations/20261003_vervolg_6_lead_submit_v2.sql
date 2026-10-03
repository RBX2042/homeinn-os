-- lead-submit, versie 2 (naar aanleiding van drie onafhankelijke controles, 3 oktober 2026).
-- Toegepast op 3 oktober 2026. Vervangt de functie uit 20261003_vervolg_4_lead_submit.sql.
--
-- WAT ER VERANDERT TEN OPZICHTE VAN v1
--  1. De limiet voor de HELE site weigert geen echte bezoekers meer (dat was een goedkope uitknop voor
--     een aanvaller). Boven 40 per uur of 150 per dag wordt een aanvraag wél opgeslagen, maar met status
--     'spamverdacht'; die stuurt geen mail (trigger hieronder) en staat niet in de gewone lijsten. Pas
--     boven 200 per uur of 600 per dag weigert de functie nog (alleen om de database klein te houden).
--  2. Geen limiet per e-mailadres of telefoonnummer meer: dat liet iedereen het adres van een ander een
--     uur lang blokkeren. Alleen een IDENTIEKE aanvraag (zelfde naam, e-mail, telefoon en bericht) binnen
--     een uur telt als 'dubbel' (en geeft geen tweede rij).
--  3. Zonder betrouwbaar IP-adres ('geen-ip') geldt de limiet per IP niet; wel de limiet voor de site.
--  4. Een tweede advisory lock op de hele site, zodat gelijktijdige verzoeken van verschillende IP's de
--     tellers niet tegelijk lezen en dan allemaal doorlaten.
--  5. 'dubbel' telt mee in het IP-log (geen gratis herhaalde database-aanroepen).
--  6. Spamverdachte aanvragen worden na 30 dagen gewist.
-- De edge function hasht het IP-bereik (IPv6 /64) vóór het hier aankomt.

create index if not exists hios_leads_status_tijd_idx on public.hios_leads (status, created_at);

create or replace function public.hios_lead_submit(p_ip_hash text, p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_email  text := left(btrim(coalesce(p->>'email', '')), 254);
  v_phone  text := left(btrim(coalesce(p->>'phone', '')), 100);
  v_status text := 'nieuw';
  n_ip_uur int; n_ip_dag int; n_alg_uur int; n_alg_dag int;
begin
  if coalesce(p_ip_hash, '') = '' or jsonb_typeof(p) is distinct from 'object' then
    return 'ongeldig';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('hios_lead_submit:site', 0));

  delete from private.lead_submit_log where created_at < now() - interval '2 days';
  delete from public.hios_leads where status = 'spamverdacht' and created_at < now() - interval '30 days';

  select count(*) filter (where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'),
         count(*) filter (where ip_hash = p_ip_hash),
         count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into n_ip_uur, n_ip_dag, n_alg_uur, n_alg_dag
    from private.lead_submit_log
   where created_at > now() - interval '1 day';

  if p_ip_hash <> 'geen-ip' and (n_ip_uur >= 5 or n_ip_dag >= 15) then return 'limiet_ip'; end if;
  if n_alg_uur >= 200 or n_alg_dag >= 600 then return 'limiet_algemeen'; end if;
  if n_alg_uur >= 40 or n_alg_dag >= 150 then v_status := 'spamverdacht'; end if;

  -- Alleen een identieke aanvraag binnen het uur is een duplicaat.
  if exists (select 1 from public.hios_leads
              where created_at > now() - interval '1 hour'
                and lower(btrim(coalesce(email, ''))) = lower(v_email)
                and regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = regexp_replace(v_phone, '[^0-9+]', '', 'g')
                and coalesce(message, '') = left(coalesce(p->>'message', ''), 5000)
                and coalesce(name, '') = left(btrim(coalesce(p->>'name', '')), 200)) then
    insert into private.lead_submit_log (ip_hash) values (p_ip_hash);
    return 'dubbel';
  end if;

  begin
    insert into public.hios_leads (local_id, type, source, name, email, phone, subject, message, portfolio, handled, status)
    values (nullif(p->>'local_id', ''), coalesce(nullif(p->>'type', ''), 'Contact'), p->>'source',
            p->>'name', v_email, v_phone, p->>'subject', p->>'message', p->>'portfolio', false, v_status);
  exception when unique_violation then
    insert into private.lead_submit_log (ip_hash) values (p_ip_hash);
    return 'dubbel';
  end;

  insert into private.lead_submit_log (ip_hash) values (p_ip_hash);
  return 'ok';
end; $$;

revoke all on function public.hios_lead_submit(text, jsonb) from public, anon, authenticated;
grant execute on function public.hios_lead_submit(text, jsonb) to service_role;

-- Een spamverdachte aanvraag mag geen mail veroorzaken (alarm én bevestiging).
drop trigger if exists hios_leads_notify on public.hios_leads;
create trigger hios_leads_notify after insert on public.hios_leads
  for each row when (new.status = 'nieuw') execute function public.hios_lead_notify();

notify pgrst, 'reload schema';
