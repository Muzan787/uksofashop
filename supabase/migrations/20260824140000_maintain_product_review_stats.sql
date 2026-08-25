-- Keep products.review_count and products.average_rating in step with the
-- approved reviews that actually exist.
--
-- Both columns exist on public.products and are read all over the storefront
-- (product cards, category grid, search results, collection pages) to decide
-- whether to show a star rating. Nothing has ever written to them: there is no
-- trigger on public.reviews, and every product sits at review_count = 0 even
-- where an approved review is linked to it.
--
-- The practical effect was that a rating could never appear anywhere on the
-- site, however many genuine reviews came in. Now that the fabricated ratings
-- have been removed, these columns are the only source of that display, so
-- they have to be real.
--
-- Only APPROVED reviews count. Reviews with a null product_id are site-wide
-- rather than about a product, and are correctly ignored here.

create or replace function public.refresh_product_review_stats(p_product_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.products p
  set review_count   = coalesce(s.cnt, 0),
      average_rating = coalesce(s.avg_rating, 0)
  from (
    select count(*)                          as cnt,
           round(avg(rating)::numeric, 2)    as avg_rating
    from public.reviews
    where product_id = p_product_id
      and is_approved
  ) s
  where p.id = p_product_id;
$function$;

create or replace function public.reviews_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_review_stats(old.product_id);
    return old;
  end if;

  -- A review moved between products: refresh both sides.
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.refresh_product_review_stats(old.product_id);
  end if;

  perform public.refresh_product_review_stats(new.product_id);
  return new;
end;
$function$;

drop trigger if exists trg_reviews_stats on public.reviews;
create trigger trg_reviews_stats
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_stats_trigger();

-- Backfill from the reviews already in the table.
update public.products p
set review_count   = s.cnt,
    average_rating = s.avg_rating
from (
  select p2.id,
         count(r.*) filter (where r.is_approved)                                   as cnt,
         coalesce(round(avg(r.rating) filter (where r.is_approved)::numeric, 2), 0) as avg_rating
  from public.products p2
  left join public.reviews r on r.product_id = p2.id
  group by p2.id
) s
where p.id = s.id;

-- These are maintained by the trigger above; nothing outside it should write them.
revoke execute on function public.refresh_product_review_stats(uuid) from public, anon, authenticated;
revoke execute on function public.reviews_stats_trigger() from public, anon, authenticated;
