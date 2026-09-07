-- CH12 Chenille Grey.
--
-- A twelfth colour added to the Chenille collection after the original seed.
-- Codes are stored, never generated, so this simply continues the supplier's
-- sequence; the hex is the usual approximation sampled from the photograph and
-- is only ever the fallback tile before the swatch image loads.

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH12', 'Grey', 'CH12 Chenille Grey', '#949190', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788788503/CH12_amoeer.png', 12)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort,
  is_active = true;
