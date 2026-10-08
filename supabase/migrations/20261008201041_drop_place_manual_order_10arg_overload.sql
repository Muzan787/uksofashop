-- Adding p_lead_reference created an OVERLOAD, it did not replace anything:
-- `create or replace function` matches on the argument list, and an extra
-- parameter is a different argument list. Both versions were live for a
-- moment.
--
-- That is not merely untidy. PostgREST resolves an RPC by the parameter names
-- in the posted body, and a call that omits p_lead_reference - which is every
-- call the admin form made before this deploy - matches both candidates
-- equally. Postgres answers that with "could not choose the best candidate
-- function", so manual order taking would have failed outright on the next
-- order rather than quietly using the old path.
drop function if exists public.place_manual_order(
  text, text, text, text, text, jsonb, numeric, text, text, date
);
