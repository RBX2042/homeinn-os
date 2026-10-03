-- FASE B van de structurele spamoplossing (zie 20261003_vervolg_4_lead_submit.sql en _vervolg_6_).
-- NIET TOEGEPAST. Pas toe via de SQL-editor of de MCP, NIET via een algemene 'pas alles toe'-run.
--
-- Na deze migratie kan niemand met de publishable sleutel nog rechtstreeks in hios_leads schrijven:
-- alleen de edge function 'lead-submit' (service role) voegt in, met een limiet per IP-bereik.
-- SELECT blijft voor anon bestaan voor de keep-alive-workflow; zonder SELECT-policy geeft RLS een
-- lege lijst terug.
--
-- VOORWAARDEN (alle vier, in deze volgorde; de eerste wordt hieronder afgedwongen)
--  1. De function is geplaatst met verify_jwt = false en geeft HTTP 400 (niet 401/404) op een lege
--     aanroep:  curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://homeinn.nl' \
--       -d '{}' https://evguvdpuidyvkiinzvys.supabase.co/functions/v1/lead-submit
--  2. Een echte inzending via https://homeinn.nl is via de function binnengekomen. Een rij in
--     hios_leads bewijst dat NIET (de terugval in lead-cloud.js kan hem ook hebben ingevoegd); alleen
--     de function schrijft in private.lead_submit_log:
--       select count(*) from private.lead_submit_log where created_at > now() - interval '2 days';  -- >= 1
--     en de browser-netwerktab toont POST /functions/v1/lead-submit 201 en GEEN POST /rest/v1/hios_leads.
--  3. Minstens 48 uur na het live zetten van de nieuwe lead-cloud.js (?v=20261003c): oude, gecachete
--     scripts gebruiken nog de directe route. Controle (verwacht 0):
--       select count(*) from public.hios_leads l where l.created_at > now() - interval '2 days'
--          and not exists (select 1 from private.lead_submit_log g where g.created_at = l.created_at);
--  4. De edge function-logs (Dashboard > Edge Functions > lead-submit > Logs) tonen geen 5xx en geen
--     regel 'geen cf-connecting-ip'.
--
-- TERUGDRAAIEN: supabase/rollback/20261003_vervolg_5_TERUGDRAAIEN.sql. lead-cloud.js valt bij een
-- onbereikbare function vanzelf terug op de directe insert zodra die weer openstaat.

do $$
begin
  if not exists (select 1 from private.lead_submit_log where created_at > now() - interval '2 days') then
    raise exception 'FASE B GEWEIGERD: er is de laatste 2 dagen geen aanvraag via de edge function binnengekomen (private.lead_submit_log is leeg). Plaats en test eerst lead-submit.';
  end if;
end $$;

revoke insert on table public.hios_leads from anon;
drop policy if exists "hios_leads: publiek meldt" on public.hios_leads;

notify pgrst, 'reload schema';
