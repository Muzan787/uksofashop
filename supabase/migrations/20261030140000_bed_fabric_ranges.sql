-- Beds are made in three fabric ranges, not all six (Muaz, 2026-10-30):
-- Chenille, Plush Soft Velvet and Crushed Velvet. The product page shows
-- only those and the checkout refuses the others (FABRIC_COLLECTIONS in
-- src/utils/productOptions.ts); this puts the words in the catalogue right,
-- which 20261030120000 wrote as "any of our 70 fabrics".
update public.products
set description = replace(description,
      'made to order in any of our 70 fabrics.',
      'made to order in any colour of our chenille, plush velvet or crushed velvet.'),
    specifications = specifications || jsonb_build_object('Fabrics', 'Chenille, Plush Velvet or Crushed Velvet')
where product_type = 'bed';

update public.categories
set intro = replace(intro,
      'and have it made in any of our 70 fabrics.',
      'and have it made in chenille, plush velvet or crushed velvet.')
where slug = 'beds';
