-- A "done" state for checkout-recovery leads, set from the admin leads page.
--
-- Until now a lead stayed in the waiting list until it expired 90 days after
-- opt-in, unless the shopper ordered through the website. Most conclusions
-- happen off the site - a WhatsApp order, or a "no thanks" - and the list had
-- no way to record either.
--
-- Done is the owner's bookkeeping, not a change in the shopper's status, so
-- contact and basket data are NOT cleared here (a mis-tap on a phone must be
-- reversible) and the 90-day expiry still deletes the row as before. Converted
-- and unsubscribed rows keep clearing immediately, as they always have.

ALTER TABLE public.checkout_recovery_leads
  DROP CONSTRAINT IF EXISTS checkout_recovery_leads_status_check;

ALTER TABLE public.checkout_recovery_leads
  ADD CONSTRAINT checkout_recovery_leads_status_check
  CHECK (status IN ('active', 'converted', 'unsubscribed', 'done'));

ALTER TABLE public.checkout_recovery_leads
  ADD COLUMN IF NOT EXISTS done_at timestamptz;

COMMENT ON COLUMN public.checkout_recovery_leads.done_at IS
  'When the owner marked the lead done from the admin panel. Cleared if it is reopened.';

-- A lead marked done can still turn into a website order - the reminder may
-- have worked after the tick. The order is then the lawful record, exactly as
-- for an active lead, so the conversion trigger covers both states.
CREATE OR REPLACE FUNCTION public.mark_checkout_recovery_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.session_id IS NOT NULL THEN
    UPDATE public.checkout_recovery_leads
    SET status = 'converted',
        converted_order_id = new.id,
        email = NULL,
        phone = NULL,
        basket = '[]'::jsonb,
        updated_at = now()
    WHERE session_id = new.session_id
      AND status IN ('active', 'done');
  END IF;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_checkout_recovery_converted() FROM public, anon, authenticated;
