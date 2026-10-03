-- Seven sofas added after the main collections went in had no collection set,
-- so they were live on the shop and absent from /collection entirely — four
-- Rio Chesterfields and three Lilys, all made to order.
--
-- Same rule the original backfill used, re-stated rather than re-decided:
-- origin = 'imported' is the recliners, everything else is built to order.
-- It only touches rows where main_collection_id is null, so a deliberate
-- assignment made in the admin panel is never overwritten.
--
-- This is a mop-up, not a mechanism. The product form carries the collection
-- dropdown now; anything added through it going forward arrives with one set.
update public.products p
set main_collection_id = m.id
from public.main_collections m
where p.main_collection_id is null
  and m.slug = case when p.origin = 'imported' then 'imported-sofas' else 'made-to-order-sofas' end;
