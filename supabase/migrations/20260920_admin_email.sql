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
