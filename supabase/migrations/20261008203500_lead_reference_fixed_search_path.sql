-- lead_reference() shipped without a pinned search_path, which the security
-- advisor flags correctly: a function that resolves its own calls against
-- whatever search_path the caller happens to have can be made to call
-- something else. It is only reached as a column default, so this is
-- hygiene rather than a hole, but it is a one-line fix and the sibling
-- lead_attribution_session already does it.
alter function public.lead_reference(timestamptz) set search_path to 'public', 'pg_catalog';
