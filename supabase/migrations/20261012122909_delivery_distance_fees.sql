-- Delivery charged by distance from Blackburn, for the far ends of the mainland.
--
-- Muaz's scale (2026-10-12). Free within 250 miles of the Blackburn showroom -
-- which is itself about 15 miles from the geographic centre of Great Britain
-- at Dunsop Bridge, so "the middle of the UK" and "Blackburn" are the same
-- place for this purpose - with these exceptions:
--
--   £40   Devon (including Plymouth and Torbay) and the Aberdeen area
--   £80   Cornwall, the Scottish Highlands and North East Scotland beyond
--         250 miles (Inverness, Moray, Fraserburgh, Mallaig ...)
--   £100  The far north of Scotland: Caithness and Sutherland, and anywhere on
--         the mainland 300 miles or more from Blackburn (Thurso, Wick, Ullapool)
--
-- Islands, Northern Ireland and the rest of CUSTOM_QUOTE are untouched: they
-- never reach place_order, which only takes a postcode the server has already
-- classified as mainland.
--
-- One row per postcode district that pays; any district not listed is free.
-- Distances are straight-line miles from Blackburn (BB1) to the district's
-- centre, from postcodes.io. Where Devon and Cornwall share a district it
-- follows its main town: PL15 Launceston and EX23 Bude are Cornwall, EX22
-- Holsworthy and PL16 Lifton are Devon. A row can be changed by hand.
--
-- place_order adds the fee to delivery_total from the authoritative postcode
-- the server appends to the address - never from the browser - and records
-- it separately as fee_distance. The signature is unchanged.

create table if not exists public.delivery_distance_fees (
  outcode text primary key check (outcode = upper(outcode)),
  fee numeric(6,2) not null check (fee > 0 and fee <= 100),
  region text not null,
  miles integer,
  updated_at timestamptz not null default now()
);

alter table public.delivery_distance_fees enable row level security;
-- No policies: read only by the service role (the checkout's server action)
-- and by place_order, which runs as its owner.

insert into public.delivery_distance_fees (outcode, fee, region, miles) values
  ('TR1', 80, 'Cornwall', 264),
  ('TR2', 80, 'Cornwall', 263),
  ('TR3', 80, 'Cornwall', 268),
  ('TR4', 80, 'Cornwall', 264),
  ('TR5', 80, 'Cornwall', 264),
  ('TR6', 80, 'Cornwall', 261),
  ('TR7', 80, 'Cornwall', 255),
  ('TR8', 80, 'Cornwall', 255),
  ('TR9', 80, 'Cornwall', 253),
  ('TR10', 80, 'Cornwall', 272),
  ('TR11', 80, 'Cornwall', 272),
  ('TR12', 80, 'Cornwall', 281),
  ('TR13', 80, 'Cornwall', 278),
  ('TR14', 80, 'Cornwall', 272),
  ('TR15', 80, 'Cornwall', 270),
  ('TR16', 80, 'Cornwall', 269),
  ('TR17', 80, 'Cornwall', 281),
  ('TR18', 80, 'Cornwall', 283),
  ('TR19', 80, 'Cornwall', 285),
  ('TR20', 80, 'Cornwall', 281),
  ('TR26', 80, 'Cornwall', 276),
  ('TR27', 80, 'Cornwall', 276),
  ('PL1', 40, 'Devon', 244),
  ('PL2', 40, 'Devon', 243),
  ('PL3', 40, 'Devon', 242),
  ('PL4', 40, 'Devon', 243),
  ('PL5', 40, 'Devon', 241),
  ('PL6', 40, 'Devon', 240),
  ('PL7', 40, 'Devon', 241),
  ('PL8', 40, 'Devon', 245),
  ('PL9', 40, 'Devon', 244),
  ('PL10', 80, 'Cornwall', 246),
  ('PL11', 80, 'Cornwall', 245),
  ('PL12', 80, 'Cornwall', 242),
  ('PL13', 80, 'Cornwall', 249),
  ('PL14', 80, 'Cornwall', 242),
  ('PL15', 80, 'Cornwall', 230),
  ('PL16', 40, 'Devon', 227),
  ('PL17', 80, 'Cornwall', 236),
  ('PL18', 80, 'Cornwall', 235),
  ('PL19', 40, 'Devon', 232),
  ('PL20', 40, 'Devon', 235),
  ('PL21', 40, 'Devon', 240),
  ('PL22', 80, 'Cornwall', 249),
  ('PL23', 80, 'Cornwall', 253),
  ('PL24', 80, 'Cornwall', 253),
  ('PL25', 80, 'Cornwall', 255),
  ('PL26', 80, 'Cornwall', 255),
  ('PL27', 80, 'Cornwall', 245),
  ('PL28', 80, 'Cornwall', 246),
  ('PL29', 80, 'Cornwall', 240),
  ('PL30', 80, 'Cornwall', 244),
  ('PL31', 80, 'Cornwall', 246),
  ('PL32', 80, 'Cornwall', 234),
  ('PL33', 80, 'Cornwall', 236),
  ('PL34', 80, 'Cornwall', 234),
  ('PL35', 80, 'Cornwall', 231),
  ('EX1', 40, 'Devon', 213),
  ('EX2', 40, 'Devon', 214),
  ('EX3', 40, 'Devon', 216),
  ('EX4', 40, 'Devon', 213),
  ('EX5', 40, 'Devon', 211),
  ('EX6', 40, 'Devon', 217),
  ('EX7', 40, 'Devon', 223),
  ('EX8', 40, 'Devon', 219),
  ('EX9', 40, 'Devon', 218),
  ('EX10', 40, 'Devon', 214),
  ('EX11', 40, 'Devon', 210),
  ('EX12', 40, 'Devon', 212),
  ('EX13', 40, 'Devon', 206),
  ('EX14', 40, 'Devon', 205),
  ('EX15', 40, 'Devon', 202),
  ('EX16', 40, 'Devon', 200),
  ('EX17', 40, 'Devon', 209),
  ('EX18', 40, 'Devon', 205),
  ('EX19', 40, 'Devon', 209),
  ('EX20', 40, 'Devon', 217),
  ('EX21', 40, 'Devon', 216),
  ('EX22', 40, 'Devon', 217),
  ('EX23', 80, 'Cornwall', 220),
  ('EX24', 40, 'Devon', 209),
  ('EX31', 40, 'Devon', 196),
  ('EX32', 40, 'Devon', 196),
  ('EX33', 40, 'Devon', 195),
  ('EX34', 40, 'Devon', 189),
  ('EX35', 40, 'Devon', 183),
  ('EX36', 40, 'Devon', 197),
  ('EX37', 40, 'Devon', 201),
  ('EX38', 40, 'Devon', 206),
  ('EX39', 40, 'Devon', 203),
  ('TQ1', 40, 'Devon', 231),
  ('TQ2', 40, 'Devon', 231),
  ('TQ3', 40, 'Devon', 233),
  ('TQ4', 40, 'Devon', 234),
  ('TQ5', 40, 'Devon', 236),
  ('TQ6', 40, 'Devon', 240),
  ('TQ7', 40, 'Devon', 246),
  ('TQ8', 40, 'Devon', 249),
  ('TQ9', 40, 'Devon', 236),
  ('TQ10', 40, 'Devon', 237),
  ('TQ11', 40, 'Devon', 232),
  ('TQ12', 40, 'Devon', 227),
  ('TQ13', 40, 'Devon', 224),
  ('TQ14', 40, 'Devon', 225),
  ('AB10', 40, 'Aberdeen area', 234),
  ('AB11', 40, 'Aberdeen area', 235),
  ('AB12', 40, 'Aberdeen area', 232),
  ('AB13', 40, 'Aberdeen area', 232),
  ('AB14', 40, 'Aberdeen area', 232),
  ('AB15', 40, 'Aberdeen area', 235),
  ('AB16', 40, 'Aberdeen area', 236),
  ('AB21', 40, 'Aberdeen area', 239),
  ('AB22', 40, 'Aberdeen area', 238),
  ('AB23', 40, 'Aberdeen area', 240),
  ('AB24', 40, 'Aberdeen area', 236),
  ('AB25', 40, 'Aberdeen area', 236),
  ('AB30', 40, 'Aberdeen area', 214),
  ('AB31', 40, 'Aberdeen area', 230),
  ('AB32', 40, 'Aberdeen area', 235),
  ('AB33', 40, 'Aberdeen area', 240),
  ('AB34', 40, 'Aberdeen area', 232),
  ('AB35', 40, 'Aberdeen area', 229),
  ('AB36', 40, 'Aberdeen area', 239),
  ('AB37', 80, 'North East Scotland', 250),
  ('AB38', 80, 'North East Scotland', 260),
  ('AB39', 40, 'Aberdeen area', 224),
  ('AB41', 80, 'North East Scotland', 251),
  ('AB42', 80, 'North East Scotland', 260),
  ('AB43', 80, 'North East Scotland', 271),
  ('AB44', 80, 'North East Scotland', 271),
  ('AB45', 80, 'North East Scotland', 270),
  ('AB51', 40, 'Aberdeen area', 245),
  ('AB52', 40, 'Aberdeen area', 249),
  ('AB53', 80, 'North East Scotland', 261),
  ('AB54', 80, 'North East Scotland', 256),
  ('AB55', 80, 'North East Scotland', 262),
  ('AB56', 80, 'North East Scotland', 272),
  ('IV1', 80, 'Scottish Highlands', 267),
  ('IV2', 80, 'Scottish Highlands', 265),
  ('IV3', 80, 'Scottish Highlands', 267),
  ('IV4', 80, 'Scottish Highlands', 268),
  ('IV5', 80, 'Scottish Highlands', 268),
  ('IV6', 80, 'Scottish Highlands', 272),
  ('IV7', 80, 'Scottish Highlands', 275),
  ('IV8', 80, 'Scottish Highlands', 272),
  ('IV9', 80, 'Scottish Highlands', 272),
  ('IV10', 80, 'Scottish Highlands', 273),
  ('IV11', 80, 'Scottish Highlands', 278),
  ('IV12', 80, 'Scottish Highlands', 270),
  ('IV13', 80, 'Scottish Highlands', 255),
  ('IV14', 80, 'Scottish Highlands', 277),
  ('IV15', 80, 'Scottish Highlands', 277),
  ('IV16', 80, 'Scottish Highlands', 280),
  ('IV17', 80, 'Scottish Highlands', 282),
  ('IV18', 80, 'Scottish Highlands', 281),
  ('IV19', 80, 'Scottish Highlands', 287),
  ('IV20', 80, 'Scottish Highlands', 285),
  ('IV21', 100, 'Far north of Scotland', 302),
  ('IV22', 100, 'Far north of Scotland', 300),
  ('IV23', 80, 'Scottish Highlands', 295),
  ('IV24', 80, 'Scottish Highlands', 295),
  ('IV25', 80, 'Scottish Highlands', 292),
  ('IV26', 100, 'Far north of Scotland', 307),
  ('IV27', 100, 'Far north of Scotland', 325),
  ('IV28', 100, 'Far north of Scotland', 301),
  ('IV30', 80, 'Scottish Highlands', 272),
  ('IV31', 80, 'Scottish Highlands', 276),
  ('IV32', 80, 'Scottish Highlands', 269),
  ('IV36', 80, 'Scottish Highlands', 270),
  ('IV40', 80, 'Scottish Highlands', 273),
  ('IV41', 80, 'Scottish Highlands', 275),
  ('IV42', 80, 'Scottish Highlands', 274),
  ('IV43', 80, 'Scottish Highlands', 269),
  ('IV44', 80, 'Scottish Highlands', 268),
  ('IV45', 80, 'Scottish Highlands', 266),
  ('IV46', 80, 'Scottish Highlands', 270),
  ('IV47', 80, 'Scottish Highlands', 288),
  ('IV48', 80, 'Scottish Highlands', 283),
  ('IV49', 80, 'Scottish Highlands', 276),
  ('IV51', 80, 'Scottish Highlands', 296),
  ('IV52', 80, 'Scottish Highlands', 277),
  ('IV53', 80, 'Scottish Highlands', 276),
  ('IV54', 80, 'Scottish Highlands', 282),
  ('IV55', 100, 'Far north of Scotland', 303),
  ('IV56', 80, 'Scottish Highlands', 294),
  ('IV63', 80, 'Scottish Highlands', 259),
  ('PH23', 80, 'Scottish Highlands', 250),
  ('PH26', 80, 'Scottish Highlands', 251),
  ('PH32', 80, 'Scottish Highlands', 250),
  ('PH39', 80, 'Scottish Highlands', 255),
  ('PH40', 80, 'Scottish Highlands', 258),
  ('PH41', 80, 'Scottish Highlands', 260),
  ('PH42', 80, 'Scottish Highlands', 261),
  ('PH43', 80, 'Scottish Highlands', 270),
  ('PH44', 80, 'Scottish Highlands', 278),
  ('KW1', 100, 'Far north of Scotland', 326),
  ('KW2', 100, 'Far north of Scotland', 319),
  ('KW3', 100, 'Far north of Scotland', 316),
  ('KW5', 100, 'Far north of Scotland', 316),
  ('KW6', 100, 'Far north of Scotland', 313),
  ('KW7', 100, 'Far north of Scotland', 309),
  ('KW8', 100, 'Far north of Scotland', 305),
  ('KW9', 100, 'Far north of Scotland', 300),
  ('KW10', 100, 'Far north of Scotland', 298),
  ('KW11', 100, 'Far north of Scotland', 321),
  ('KW12', 100, 'Far north of Scotland', 331),
  ('KW13', 100, 'Far north of Scotland', 331),
  ('KW14', 100, 'Far north of Scotland', 337),
  ('PA77', 80, 'Scottish Highlands', 257),
  ('PA78', 80, 'Scottish Highlands', 255)
on conflict (outcode) do update
  set fee = excluded.fee, region = excluded.region, miles = excluded.miles, updated_at = now();

alter table public.orders
  add column if not exists fee_distance numeric(8,2) not null default 0;

create or replace function public.delivery_distance_fee(p_postcode text)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((
    select f.fee
    from public.delivery_distance_fees f
    where f.outcode = upper(regexp_replace(btrim(coalesce(p_postcode, '')), '\s*[0-9][A-Za-z]{2}$', ''))
  ), 0)
$function$;

revoke execute on function public.delivery_distance_fee(text) from public, anon, authenticated;
grant execute on function public.delivery_distance_fee(text) to service_role;
