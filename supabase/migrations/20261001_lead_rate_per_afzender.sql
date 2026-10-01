-- Rem per afzender op publieke lead-inzendingen (audit leads-10, 1 oktober 2026).
-- NOG NIET TOEGEPAST op project evguvdpuidyvkiinzvys: de eigenaar past dit toe.
--
-- Achtergrond: 20260920_admin_email.sql begrenst hios_leads op maximaal 40 anonieme
-- inzendingen per uur voor de HELE site. Die grens blijft bewust 40: elke lead
-- betekent tot twee mails via Resend (gratis plan, ca. 100 per dag), dus hoger zet
-- alleen het misbruikplafond hoger. Nieuw is een goedkope extra rem per afzender:
-- hetzelfde e-mailadres (hoofdletterongevoelig) of hetzelfde telefoonnummer mag
-- maximaal 3 keer per uur inzenden. Dat stopt geen aanvaller die adressen
-- willekeurig maakt; de echte oplossing is de publieke insert achter een edge
-- function met een limiet per IP te zetten en daarna de anon-insertpolicy te laten
-- vallen.
--
-- De oude variant zonder argumenten (public.hios_lead_rate_ok()) blijft bestaan en
-- is onschadelijk; de policy hieronder gebruikt alleen de nieuwe variant.

create or replace function public.hios_lead_rate_ok(p_email text, p_phone text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (select count(*) from hios_leads where created_at > now() - interval '1 hour') < 40
     and (coalesce(p_email, '') = ''
          or (select count(*) from hios_leads
               where lower(email) = lower(p_email)
                 and created_at > now() - interval '1 hour') < 3)
     and (coalesce(p_phone, '') = ''
          or (select count(*) from hios_leads
               where phone = p_phone
                 and created_at > now() - interval '1 hour') < 3);
$$;
grant execute on function public.hios_lead_rate_ok(text, text) to anon, authenticated;

drop policy if exists "hios_leads: publiek meldt" on public.hios_leads;
create policy "hios_leads: publiek meldt" on public.hios_leads
  for insert to anon with check (handled = false and public.hios_lead_rate_ok(email, phone));
