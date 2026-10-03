-- Twee kleine gaten uit de audit van 3 oktober 2026 (F23 / SEC-12), toegepast op 3 oktober 2026.
--
-- 1. Een huurder kon een onderhoudsbericht als 'operator' plaatsen en zo als HomeINN overkomen.
--    author_type 'operator' mag voortaan alleen staff schrijven. author_email wordt NIET gecontroleerd:
--    huurders.js stuurt dat veld niet mee.
-- 2. Elk teamlid (rol 'team') kon via hios_profiles de rol of het actief-vlag van iedereen wijzigen,
--    ook van de eigenaar. Nu mag alleen een ACTIEVE EIGENAAR rol en actief-vlag van een ander profiel
--    wijzigen; de eigen rol en het eigen actief-vlag kan niemand via de API wijzigen (dat gaat met de
--    service role of de SQL-editor). Overige profielwijzigingen door staff blijven zoals ze waren.

drop policy if exists "msgs: schrijven" on public.hios_maintenance_messages;
create policy "msgs: schrijven" on public.hios_maintenance_messages
  for insert to authenticated
  with check (
    (select public.hios_can_access_maintenance(maintenance_id))
    and (author_type is distinct from 'operator' or (select public.hios_is_staff()))
  );

create or replace function public.hios_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_eigenaar boolean;
begin
  -- service_role / SQL-editor (auth.uid() is null): alles mag.
  if (select auth.uid()) is null then
    return new;
  end if;
  if public.hios_is_staff() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      select exists(select 1 from hios_profiles p
                     where p.id = (select auth.uid()) and p.role = 'eigenaar' and p.active)
        into is_eigenaar;
      if not is_eigenaar or old.id = (select auth.uid()) then
        new.role   := old.role;
        new.active := old.active;
      end if;
    end if;
    return new;
  end if;
  new.id     := old.id;
  new.email  := old.email;
  new.role   := old.role;
  new.active := old.active;
  return new;
end; $$;
revoke all on function public.hios_profiles_guard() from public, anon, authenticated;
