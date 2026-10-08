-- attribution_sessions.session_id is NOT unique: 11,930 rows across 6,941
-- sessions, 3,107 of them duplicated, and one session has 54 rows. The first
-- cut of the lead branch in place_manual_order did `limit 1` with no order by,
-- so it took whichever row the planner happened to hand back - and some of
-- those rows are entirely empty, carrying no ga_client_id, no _fbp and no
-- click id at all. The reference would have linked, the order would have
-- looked attributed, and nothing would actually have been attached.
--
-- This picks the richest row for the session instead: the one carrying the
-- most identifiers, newest first as the tie-break. Same rule for the
-- visitor-level fallback.

create or replace function public.lead_attribution_session(
  p_session_id uuid,
  p_visitor_id uuid
)
returns public.attribution_sessions
language sql
stable
security definer
set search_path to 'public'
as $$
  select s.*
  from public.attribution_sessions s
  where (p_session_id is not null and s.session_id = p_session_id)
     or (p_visitor_id is not null and s.visitor_id = p_visitor_id)
  order by
    -- Prefer the session the lead was actually captured in.
    (p_session_id is not null and s.session_id = p_session_id) desc,
    -- Then the row that actually knows something.
    ( (s.gclid        is not null)::int
    + (s.gbraid       is not null)::int
    + (s.wbraid       is not null)::int
    + (s.fbclid       is not null)::int
    + (s.ga_client_id is not null)::int
    + (s.meta_fbp     is not null)::int
    + (s.meta_fbc     is not null)::int
    + (s.last_touch_source  is not null)::int
    + (s.first_touch_source is not null)::int ) desc,
    s.created_at desc
  limit 1;
$$;

revoke execute on function public.lead_attribution_session(uuid, uuid) from anon, authenticated, public;

-- Swap the two naive lookups for one call to it, by rewriting the stored
-- definition rather than restating 250 lines of unchanged function. The
-- guard matters: a silent no-match here would leave the broken version live.
do $patch$
declare
  v_def text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'place_manual_order' and p.pronargs = 11;

  if v_def is null then
    raise exception 'place_manual_order/11 not found';
  end if;

  v_old := E'    select * into v_attr\n'
        || E'    from public.attribution_sessions\n'
        || E'    where session_id = v_lead.session_id\n'
        || E'    limit 1;\n'
        || E'\n'
        || E'    if not found and v_lead.visitor_id is not null then\n'
        || E'      select * into v_attr\n'
        || E'      from public.attribution_sessions\n'
        || E'      where visitor_id = v_lead.visitor_id\n'
        || E'      order by created_at desc\n'
        || E'      limit 1;\n'
        || E'    end if;\n'
        || E'\n'
        || E'    if found then';

  v_new := E'    v_attr := public.lead_attribution_session(v_lead.session_id, v_lead.visitor_id);\n'
        || E'\n'
        || E'    if v_attr.id is not null then';

  if position(v_old in v_def) = 0 then
    raise exception 'lead attribution block not found in place_manual_order - refusing to patch blindly';
  end if;

  execute replace(v_def, v_old, v_new);
end
$patch$;
