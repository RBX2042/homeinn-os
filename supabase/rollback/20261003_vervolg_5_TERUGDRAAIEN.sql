-- Draait fase B terug (20261003_vervolg_5_anon_insert_dicht.sql): de directe anon-insert gaat weer open,
-- met de rem uit 20261003_vervolg_1 (tien kolommen, 40 per uur, serverkolommen afgedwongen).
-- Gebruik dit als lead-submit onverwacht uitvalt en je niet wilt wachten op een herstel.
grant insert (local_id, type, source, name, email, phone, subject, message, portfolio, handled)
  on table public.hios_leads to anon;
drop policy if exists "hios_leads: publiek meldt" on public.hios_leads;
create policy "hios_leads: publiek meldt" on public.hios_leads
  for insert to anon with check (handled = false and private.hios_lead_rate_ok(email, phone));
notify pgrst, 'reload schema';
