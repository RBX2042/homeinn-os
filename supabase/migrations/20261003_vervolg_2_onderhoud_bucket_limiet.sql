-- Opslagbucket 'onderhoud' begrenzen (audit 3 oktober 2026, SEC-10).
-- NOG NIET TOEGEPAST op project evguvdpuidyvkiinzvys: de eigenaar/orchestrator past dit toe.
--
-- PROBLEEM
-- De bucket had geen grootte- en geen typelimiet (file_size_limit en allowed_mime_types = null),
-- en de policy "onderhoud: upload in eigen map" controleerde alleen dat de map gelijk is aan
-- auth.uid(), niet of iemand huurder is. Inloggen maakt een nieuw account aan (signup staat open),
-- dus iedereen met een mailbox kon onbeperkt bestanden van elk type uploaden en het opslagquotum
-- van het gratis plan (1 GB) vullen. Er is geen delete-policy, dus via de API ruimt niemand dat op.
--
-- OPLOSSING
--   * maximaal 10 MB per bestand (huurders.js weigert zelf al boven 8 MB) en alleen fototypes.
--     huurders.js uploadt met accept="image/*"; SVG staat er bewust NIET bij (kan script bevatten);
--   * uploaden alleen als de ingelogde gebruiker aan een woning gekoppeld is
--     (public.hios_my_property_id(), dezelfde controle die huurders.js vóór de upload doet).
-- Alleen huurders.js uploadt naar deze bucket; portaal en admin lezen alleen (signed URLs).
--
-- CONTROLE NA TOEPASSEN
--   select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'onderhoud';
--   select policyname, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects';
--   Daarna één onderhoudsmelding met foto vanuit een huurdersaccount: de foto moet aankomen.

update storage.buckets
   set file_size_limit    = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
                                  'image/heic', 'image/heif', 'image/avif']
 where id = 'onderhoud';

drop policy if exists "onderhoud: upload in eigen map" on storage.objects;
create policy "onderhoud: upload in eigen map" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'onderhoud'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.hios_my_property_id()) is not null
  );
