begin;

alter table public.orders
  add column if not exists processing_at timestamptz,
  add column if not exists shipped_at timestamptz;

comment on column public.orders.processing_at is
  'First time the order entered processing. Preserved across later status changes.';
comment on column public.orders.shipped_at is
  'First time the order entered shipped. Preserved across later status changes.';

commit;
