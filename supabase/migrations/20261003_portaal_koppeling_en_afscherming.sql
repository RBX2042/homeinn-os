-- Portaal: koppeling van accounts, afscherming van projectdata en vastleggen van ondertekening
-- (audit 3 oktober 2026: F01/LEAD-01, F04, F09, F12, F13).
-- NOG NIET TOEGEPAST op project evguvdpuidyvkiinzvys: de eigenaar/orchestrator past dit toe.
-- Hoort bij de gelijktijdige wijzigingen in cloud.js en app.js (zelfde dag). Volgorde t.o.v.
-- 20261003_vervolg_1_hios_leads_insert_hardening.sql maakt niet uit; dit bestand is herhaalbaar.
--
-- CONTROLE NA TOEPASSEN
--   * select conname from pg_constraint where conname = 'hios_leads_local_id_fmt';            -- 1 rij
--   * select tgname from pg_trigger where tgname like 'hios_%_koppel_profiel';                  -- 3 rijen
--   * select qual from pg_policies where policyname = 'projecten: investeerder leest';         -- hios_invests_in(id)
--   * select pg_get_functiondef('public.hios_sign_contract(uuid,text)'::regprocedure);         -- bevat 'Investeringsovereenkomst'
--   * select tgname from pg_trigger where tgname = 'hios_state_archiveer';                      -- 1 rij

-- 1. hios_leads.local_id: alleen ons eigen formaat (F01 / LEAD-01) -----------------------------
-- De portaal-inbox gebruikte local_id als rij-id in HTML-attributen; anon kan die kolom vullen.
-- app.js escapet nu, en lead-cloud.js stuurt alleen dit formaat (anders null). Dit is de derde laag.
-- Alle formulieren maken 'lead' + Date.now().toString(36) + 1-4 base36-tekens: 9 tot 13 tekens.
-- Op 3 oktober 2026 had hios_leads 0 rijen, dus de constraint valideert meteen.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'hios_leads_local_id_fmt' and conrelid = 'public.hios_leads'::regclass) then
    alter table public.hios_leads add constraint hios_leads_local_id_fmt
      check (local_id is null or local_id ~ '^lead[a-z0-9]{4,24}$');
  end if;
end $$;

-- 2. Accounts koppelen bij elke schrijfactie, niet alleen bij aanmelden (F04) ------------------
-- hios_handle_new_user koppelde geldgever, contract en huurder alleen op het moment dat iemand
-- zich aanmeldt. Wie inlogde vóór de eerstvolgende synchronisatie, of een tweede lening of
-- contract kreeg, zag die nooit; en na een correctie van het e-mailadres bleef het OUDE account
-- gekoppeld (en zag dat de lening of het contract nog). Deze triggers bepalen de koppeling
-- opnieuw bij elke insert en bij elke update waarin het e-mailadres in de SET-lijst staat (een
-- PostgREST-upsert zet alle meegestuurde kolommen, dus elke synchronisatie). Geen account met dat
-- adres = geen koppeling (null). hios_handle_new_user blijft voor wie zich later aanmeldt.
create or replace function public.hios_investors_koppel_profiel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.profile_id := (select p.id from hios_profiles p
                      where nullif(btrim(new.email), '') is not null
                        and lower(p.email) = lower(btrim(new.email))
                      limit 1);
  return new;
end; $$;

create or replace function public.hios_contracts_koppel_profiel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.party_profile_id := (select p.id from hios_profiles p
                            where nullif(btrim(new.party_email), '') is not null
                              and lower(p.email) = lower(btrim(new.party_email))
                            limit 1);
  return new;
end; $$;

create or replace function public.hios_properties_koppel_profiel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.tenant_profile_id := (select p.id from hios_profiles p
                             where nullif(btrim(new.tenant_email), '') is not null
                               and lower(p.email) = lower(btrim(new.tenant_email))
                             limit 1);
  return new;
end; $$;

revoke all on function public.hios_investors_koppel_profiel() from public, anon, authenticated;
revoke all on function public.hios_contracts_koppel_profiel() from public, anon, authenticated;
revoke all on function public.hios_properties_koppel_profiel() from public, anon, authenticated;

drop trigger if exists hios_investors_koppel_profiel on public.hios_investors;
create trigger hios_investors_koppel_profiel before insert or update of email on public.hios_investors
  for each row execute function public.hios_investors_koppel_profiel();

drop trigger if exists hios_contracts_koppel_profiel on public.hios_contracts;
create trigger hios_contracts_koppel_profiel before insert or update of party_email on public.hios_contracts
  for each row execute function public.hios_contracts_koppel_profiel();

drop trigger if exists hios_properties_koppel_profiel on public.hios_properties;
create trigger hios_properties_koppel_profiel before insert or update of tenant_email on public.hios_properties
  for each row execute function public.hios_properties_koppel_profiel();

-- Eenmalig: bestaande rijen opnieuw koppelen (de triggers vuren omdat de kolom in de SET staat).
update public.hios_investors  set email        = email;
update public.hios_contracts  set party_email  = party_email;
update public.hios_properties set tenant_email = tenant_email;

-- 3. Een geldgever kan zijn leningsovereenkomst niet zelf op 'Getekend' zetten (F12) -----------
-- Een getypte naam is geen handtekening voor een lening (handmatig of gekwalificeerd elektronisch;
-- HomeINN legt 'Getekend' zelf vast). Koop- en huurovereenkomsten blijven digitaal te tekenen.
create or replace function public.hios_sign_contract(p_id uuid, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update hios_contracts
     set status = 'Getekend', signed_at = now(), signed_name = coalesce(nullif(trim(p_name), ''), 'Akkoord')
   where id = p_id
     and party_profile_id = auth.uid()
     and status = 'Verstuurd'
     and type is distinct from 'Investeringsovereenkomst';
  get diagnostics n = row_count;
  return n > 0;
end; $$;
-- create or replace behoudt de bestaande rechten (authenticated mag uitvoeren, anon niet).

-- 4. Projecten alleen voor de eigen geldgevers (F13) ------------------------------------------
-- 'published' (de website-vlag) gaf elk zelf aangemaakt account leesrecht op het project. De
-- website leest hios_projects niet; het geldgeversportaal leest projecten alleen via de eigen lening.
drop policy if exists "projecten: investeerder leest" on public.hios_projects;
create policy "projecten: investeerder leest" on public.hios_projects
  for select to authenticated using (hios_invests_in(id));

-- 5. Vorige cloud-backups bewaren (F09) -------------------------------------------------------
-- hios_state heeft één gedeelde rij ('main'); een backup vanaf een verse browser (demo-gegevens)
-- of een ander apparaat overschreef die zonder geschiedenis. Vóór elke overschrijving of
-- verwijdering gaat de oude versie naar hios_state_history; de laatste 10 blijven bewaard.
-- Alleen eigenaar/team kan ze lezen; terugzetten gaat handmatig (SQL) door de eigenaar.
create table if not exists public.hios_state_history (
  hist_id     bigint generated always as identity primary key,
  state_id    text not null,
  data        jsonb not null,
  updated_at  timestamptz,
  updated_by  uuid,
  archived_at timestamptz not null default now(),
  archived_by uuid
);
alter table public.hios_state_history enable row level security;
revoke all on table public.hios_state_history from anon;
drop policy if exists "state-historie: staff leest" on public.hios_state_history;
create policy "state-historie: staff leest" on public.hios_state_history
  for select to authenticated using (hios_is_staff());

create or replace function public.hios_state_archiveer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into hios_state_history (state_id, data, updated_at, updated_by, archived_by)
  values (old.id, old.data, old.updated_at, old.updated_by, auth.uid());
  delete from hios_state_history h
   where h.state_id = old.id
     and h.hist_id not in (select x.hist_id from hios_state_history x
                            where x.state_id = old.id order by x.hist_id desc limit 10);
  return coalesce(new, old);
end; $$;
revoke all on function public.hios_state_archiveer() from public, anon, authenticated;

drop trigger if exists hios_state_archiveer on public.hios_state;
create trigger hios_state_archiveer before update or delete on public.hios_state
  for each row execute function public.hios_state_archiveer();

notify pgrst, 'reload schema';
