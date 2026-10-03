-- De spamrem op hios_leads (20261001_lead_rate_per_afzender.sql) stond in het publieke schema en
-- was daardoor als RPC aanroepbaar (/rest/v1/rpc/hios_lead_rate_ok). Dat lekt of een bepaald
-- e-mailadres of telefoonnummer het afgelopen uur een aanvraag deed (Supabase-advisor 0028).
-- Oplossing volgens Supabase: de functie naar een niet-blootgesteld schema verplaatsen. De
-- RLS-policy roept haar daar aan; anon houdt USAGE + EXECUTE, maar PostgREST biedt het schema
-- niet aan, dus van buitenaf is zij niet meer aan te roepen. Toegepast op 3 oktober 2026.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.hios_lead_rate_ok(p_email text, p_phone text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (select count(*) from public.hios_leads where created_at > now() - interval '1 hour') < 40
     and (coalesce(p_email, '') = ''
          or (select count(*) from public.hios_leads
               where lower(email) = lower(p_email)
                 and created_at > now() - interval '1 hour') < 3)
     and (coalesce(p_phone, '') = ''
          or (select count(*) from public.hios_leads
               where phone = p_phone
                 and created_at > now() - interval '1 hour') < 3);
$$;
revoke all on function private.hios_lead_rate_ok(text, text) from public;
grant execute on function private.hios_lead_rate_ok(text, text) to anon, authenticated;

drop policy if exists "hios_leads: publiek meldt" on public.hios_leads;
create policy "hios_leads: publiek meldt" on public.hios_leads
  for insert to anon with check (handled = false and private.hios_lead_rate_ok(email, phone));

drop function if exists public.hios_lead_rate_ok(text, text);
drop function if exists public.hios_lead_rate_ok();
