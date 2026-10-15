-- Admin upgrade Phase 8, follow-up to 20261015000600_leads_tabs.sql.
--
-- release_lead_reminder() answered true even when no claim matched: in
-- PL/pgSQL, FOUND is reset by the PERFORM that follows the UPDATE. The
-- release itself was always right (only the matching stamp is cleared); now
-- its answer is too, counted straight after the UPDATE. Grants are unchanged.
create or replace function private.release_lead_reminder(p_id uuid, p_claimed_at timestamptz)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_released integer;
begin
  perform private.require_admin();
  perform set_config('leads.release_reminder', 'on', true);
  update public.checkout_recovery_leads
     set reminder_emailed_at = null
   where id = p_id and reminder_emailed_at = p_claimed_at;
  get diagnostics v_released = row_count;
  perform set_config('leads.release_reminder', '', true);
  return v_released > 0;
end;
$function$;
