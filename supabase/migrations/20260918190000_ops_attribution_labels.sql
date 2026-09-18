begin;

alter table public.orders
  add column if not exists manual_acquisition_source text,
  add column if not exists manual_acquisition_note text,
  add column if not exists manual_acquisition_at timestamptz;

alter table public.orders
  drop constraint if exists orders_manual_acquisition_source_check;

alter table public.orders
  add constraint orders_manual_acquisition_source_check
  check (manual_acquisition_source is null or manual_acquisition_source in ('meta','google','direct','referral','other'));

comment on column public.orders.manual_acquisition_source is
  'Staff-confirmed acquisition source when first-party click evidence is absent. This never overwrites UTM/fbclid evidence.';
comment on column public.orders.manual_acquisition_note is
  'Short audit note explaining why a manual acquisition source was asserted.';
comment on column public.orders.manual_acquisition_at is
  'When the manual acquisition assertion was recorded.';

alter table public.checkout_recovery_leads
  add column if not exists data_class text not null default 'production_real';

alter table public.checkout_recovery_leads
  drop constraint if exists checkout_recovery_leads_data_class_check;

alter table public.checkout_recovery_leads
  add constraint checkout_recovery_leads_data_class_check
  check (data_class in ('production_real','qa_test'));

comment on column public.checkout_recovery_leads.data_class is
  'Separates real recovery leads from QA/test submissions so reminders and admin queues can ignore tests.';

create index if not exists checkout_recovery_converted_order_idx
  on public.checkout_recovery_leads(converted_order_id)
  where converted_order_id is not null;

commit;
