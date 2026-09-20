-- Zie ADMIN-EN-EMAIL.md. Toegepast op project evguvdpuidyvkiinzvys op 20 september 2026.
create extension if not exists pg_net with schema extensions;

create table if not exists public.hios_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'overig',
  to_email text not null,
  subject text not null default '',
  status text not null default 'verzonden',   -- verzonden | mislukt | overgeslagen
  provider_id text,
  error text,
  meta jsonb not null default '{}'::jsonb
);
alter table public.hios_emails enable row level security;
drop policy if exists hios_emails_staff_read on public.hios_emails;
create policy hios_emails_staff_read on public.hios_emails for select using (public.hios_is_staff());
create index if not exists hios_emails_created_idx on public.hios_emails (created_at desc);

alter table public.hios_leads add column if not exists notified_at timestamptz;
alter table public.hios_leads add column if not exists status text not null default 'nieuw';
alter table public.hios_leads add column if not exists note text;
alter table public.hios_leads add column if not exists assignee_email text;
create index if not exists hios_leads_created_idx on public.hios_leads (created_at desc);

create or replace function public.hios_lead_notify()
returns trigger language plpgsql security definer set search_path to 'public, extensions' as $$
begin
  perform net.http_post(
    url := 'https://evguvdpuidyvkiinzvys.supabase.co/functions/v1/lead-notify',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('lead_id', new.id),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  return new;   -- een falende mailtrigger mag de lead-insert nooit blokkeren
end; $$;
revoke execute on function public.hios_lead_notify() from anon, authenticated;

drop trigger if exists hios_leads_notify on public.hios_leads;
create trigger hios_leads_notify after insert on public.hios_leads
  for each row execute function public.hios_lead_notify();

-- ---------------------------------------------------------------------------
-- Beveiligingsronde 20 september 2026 (na oplevering van het adminpaneel)
-- ---------------------------------------------------------------------------
-- (1) KRITIEK: "profiel: eigen update" had geen WITH CHECK. Een UPDATE-policy
--     zonder WITH CHECK toetst alleen WELKE rij je raakt, niet WAT je erin zet:
--     elke ingelogde gebruiker kon zijn eigen role op 'eigenaar' zetten en zo
--     staff worden. Een WITH CHECK kan de oude waarde niet zien, vandaar de guard.
create or replace function public.hios_profiles_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if (select auth.uid()) is null or public.hios_is_staff() then return new; end if;
  new.id := old.id; new.email := old.email; new.role := old.role; new.active := old.active;
  return new;
end; $$;
revoke execute on function public.hios_profiles_guard() from anon, authenticated;
drop trigger if exists hios_profiles_guard on public.hios_profiles;
create trigger hios_profiles_guard before update on public.hios_profiles
  for each row execute function public.hios_profiles_guard();

drop policy if exists "profiel: eigen update" on public.hios_profiles;
create policy "profiel: eigen update" on public.hios_profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- (2) hios_leads is publiek beschrijfbaar (dat moet), maar sinds de mailtrigger
--     betekent elke insert uitgaande mail. Rem: maximaal 40 inzendingen per uur.
create or replace function public.hios_lead_rate_ok()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (select count(*) from hios_leads where created_at > now() - interval '1 hour') < 40;
$$;
grant execute on function public.hios_lead_rate_ok() to anon, authenticated;
drop policy if exists "hios_leads: publiek meldt" on public.hios_leads;
create policy "hios_leads: publiek meldt" on public.hios_leads
  for insert to anon with check (handled = false and public.hios_lead_rate_ok());

-- (3) e-maillog expliciet alleen voor ingelogde staf (was rol 'public').
drop policy if exists hios_emails_staff_read on public.hios_emails;
create policy hios_emails_staff_read on public.hios_emails
  for select to authenticated using (public.hios_is_staff());
