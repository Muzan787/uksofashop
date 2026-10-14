-- Keep OrderFlow's answer to every order we send it (admin upgrade R1).
--
-- orderflow.push_order() posts each order with pg_net and threw the request
-- id away. pg_net keeps the reply for about six hours and then deletes it, so
-- a refusal ({"error":"ingest failed"}, HTTP 500 - seven of them in the six
-- hours before this was written) was visible to nobody, ever.
--
-- Now:
--   * push_order() records each send in orderflow.sends: the pg_net request
--     id, the order, when, and how it was started (an order change, the
--     15-minute re-send, or by hand once the order page has a button).
--   * orderflow.collect_answers(), every five minutes, copies OrderFlow's
--     reply onto the send: status code, ok, outcome, message, order_number.
--
-- WHAT DOES NOT CHANGE (R4): the payload (orderflow.order_payload, untouched),
-- the URL and key (still read from Vault inside push_order), the triggers,
-- and when orders are sent. push_order makes exactly the same net.http_post
-- call as before; the only addition is the insert after it, inside its own
-- exception block, so a recording failure can never undo or stop a send. The
-- re-send job is unchanged apart from labelling its sends.

create table if not exists orderflow.sends (
  id bigint generated always as identity primary key,
  request_id bigint unique,
  order_id uuid references public.orders(id) on delete cascade,
  sent_at timestamptz not null default now(),
  -- 'change' (an order or its lines changed), 'resend' (the 15-minute job),
  -- 'by_hand' (a person pressed send), 'before_recording' (backfilled from
  -- replies pg_net still held when this table was created; order unknown).
  source text not null default 'change',
  by_hand boolean not null default false,
  answered_at timestamptz,
  status_code integer,
  ok boolean,
  outcome text,
  message text,
  order_number integer,
  error text
);

comment on table orderflow.sends is
  'Every order sent to OrderFlow and OrderFlow''s reply. push_order() inserts; collect_answers() fills the reply from pg_net.';

create index if not exists sends_order_idx on orderflow.sends (order_id, sent_at desc);
create index if not exists sends_unanswered_idx on orderflow.sends (sent_at) where answered_at is null;
create index if not exists sends_sent_at_idx on orderflow.sends (sent_at desc);

alter table orderflow.sends enable row level security;
revoke all on orderflow.sends from public, anon, authenticated;

-- JSON from a reply body that may not be JSON at all (an HTML error page).
create or replace function orderflow.try_jsonb(p text)
 returns jsonb
 language plpgsql
 immutable
 set search_path to ''
as $function$
begin
  return p::jsonb;
exception when others then
  return null;
end;
$function$;

-- ── push_order: the same send, now recorded ────────────────────────────────
create or replace function orderflow.push_order(p_order_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  fn_url text;
  fn_key text;
  v_request bigint;
  v_source text;
begin
  select decrypted_secret into fn_url
    from vault.decrypted_secrets where name = 'orderflow_ingest_url';
  select decrypted_secret into fn_key
    from vault.decrypted_secrets where name = 'orderflow_ingest_key';

  -- Not configured yet: do nothing at all, quietly.
  if fn_url is null or fn_key is null then
    return;
  end if;

  -- pg_net registers against the `extensions` schema but puts its functions in
  -- `net`, so that — not `extensions.net` — is the qualified name.
  v_request := net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-orderflow-key', fn_key),
    body := orderflow.order_payload(p_order_id),
    timeout_milliseconds := 10000
  );

  -- Record the send. Its own block: if this insert ever fails, the send above
  -- still stands - recording is never allowed to cost an order its push.
  begin
    v_source := coalesce(nullif(current_setting('orderflow.send_source', true), ''), 'change');
    insert into orderflow.sends (request_id, order_id, source, by_hand)
    values (v_request, p_order_id, v_source, v_source = 'by_hand');
  exception when others then
    raise warning 'orderflow send for order % was not recorded: %', p_order_id, sqlerrm;
  end;
end;
$function$;

-- ── resend_recent: unchanged, except its sends are labelled 'resend' ───────
create or replace function orderflow.resend_recent(p_window interval DEFAULT '3 days'::interval)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer := 0;
  r record;
begin
  -- Transaction-local: only this job's sends carry the label.
  perform set_config('orderflow.send_source', 'resend', true);

  for r in
    select o.id
      from public.orders o
     where greatest(o.created_at, o.confirmed_at, o.processing_at,
                    o.shipped_at, o.delivered_at, o.cancelled_at)
           > now() - p_window
     order by o.created_at desc
     limit 200
  loop
    begin
      perform orderflow.push_order(r.id);
      n := n + 1;
    exception when others then
      raise warning 'orderflow resend failed for order %: %', r.id, sqlerrm;
    end;
  end loop;
  return n;
end;
$function$;

-- ── collect_answers: copy OrderFlow's replies before pg_net forgets them ───
create or replace function orderflow.collect_answers()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer;
begin
  with replies as (
    select r.id,
           r.created,
           r.status_code,
           r.timed_out,
           r.error_msg,
           orderflow.try_jsonb(r.content) as body
      from net._http_response r
      join orderflow.sends s on s.request_id = r.id
     where s.answered_at is null
  ), answered as (
    update orderflow.sends s
       set answered_at  = coalesce(rp.created, now()),
           status_code  = rp.status_code,
           ok           = coalesce(rp.status_code between 200 and 299, false)
                          and coalesce(rp.body->>'ok', 'true') <> 'false',
           outcome      = rp.body->>'outcome',
           message      = coalesce(rp.body->>'message', rp.body->>'error'),
           order_number = case when (rp.body->>'order_number') ~ '^[0-9]{1,9}$'
                               then (rp.body->>'order_number')::integer end,
           error        = case when rp.timed_out then 'No reply within 10 seconds'
                               else rp.error_msg end
      from replies rp
     where s.request_id = rp.id
    returning 1
  )
  select count(*) into n from answered;

  -- pg_net drops replies after about six hours. A send still unanswered by
  -- then never got one we can read - say so rather than wait forever.
  update orderflow.sends
     set answered_at = now(), ok = false, error = 'No reply recorded'
   where answered_at is null
     and sent_at < now() - interval '6 hours';

  -- Thirty days of history, but never an order's latest send.
  delete from orderflow.sends s
   where s.sent_at < now() - interval '30 days'
     and exists (
       select 1 from orderflow.sends t
        where t.order_id = s.order_id and t.sent_at > s.sent_at
     );

  return n;
end;
$function$;

revoke all on function orderflow.try_jsonb(text) from public, anon, authenticated;
revoke all on function orderflow.collect_answers() from public, anon, authenticated;

-- ── Replies pg_net still holds from before recording began ─────────────────
-- Every pg_net request this database makes is an OrderFlow push (push_order
-- is the only caller of net.http_post), but which order each one was is not
-- kept anywhere, so these come in with the order unknown. They make the
-- refusals of the last few hours visible on the Status page straight away.
insert into orderflow.sends (request_id, order_id, sent_at, source)
select r.id, null, r.created, 'before_recording'
  from net._http_response r
 where not exists (select 1 from orderflow.sends s where s.request_id = r.id)
on conflict (request_id) do nothing;

select orderflow.collect_answers();

-- Every five minutes, well inside pg_net's six hours.
select cron.schedule('orderflow-collect-answers', '*/5 * * * *', 'select orderflow.collect_answers();');
