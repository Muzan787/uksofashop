-- The customer's user agent and IP, captured at checkout.
--
-- Meta lists client_user_agent as a REQUIRED parameter for Conversions API
-- events with action_source "website". Ours had neither it nor the IP, because
-- the Purchase conversion is reported when an order is confirmed - an admin
-- action, minutes later - and by then the only request headers available
-- belong to the admin. Sending those would attribute the customer's purchase
-- to the shop owner's device, which is worse than sending nothing.
--
-- So they are captured with the same request that places the order, stored
-- alongside _fbp/_fbc, and read back at confirmation time.
--
-- Written only when the visitor accepted cookies, matching the condition
-- already guarding the other advertising identifiers - so this is not a new
-- category of data collection, it is the same consented set completed.

alter table public.orders
  add column if not exists customer_user_agent text,
  add column if not exists customer_ip text;

comment on column public.orders.customer_user_agent is
  'Customer browser UA at checkout. Required by Meta CAPI for website events.';
comment on column public.orders.customer_ip is
  'Customer IP at checkout. Improves Meta CAPI match quality. Consented only.';
