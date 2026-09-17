-- Checkout recovery conversion hardening.
--
-- Website orders are inserted first, then first-party attribution (including
-- session_id) is attached in a follow-up UPDATE. The original recovery trigger
-- ran only AFTER INSERT, so an opted-in recovery row could remain active after
-- a successful website order.
--
-- Converted rows keep the channel-consent flags as audit history, while the
-- duplicate recovery contact and basket PII is cleared. Therefore contact
-- presence constraints only apply while the row is active.

ALTER TABLE public.checkout_recovery_leads
  DROP CONSTRAINT IF EXISTS checkout_recovery_email_if_opted,
  DROP CONSTRAINT IF EXISTS checkout_recovery_phone_if_opted;

ALTER TABLE public.checkout_recovery_leads
  ADD CONSTRAINT checkout_recovery_email_if_opted CHECK (
    status <> 'active' OR NOT email_opt_in OR (email IS NOT NULL AND length(trim(email)) > 3)
  ),
  ADD CONSTRAINT checkout_recovery_phone_if_opted CHECK (
    status <> 'active' OR NOT whatsapp_opt_in OR (phone IS NOT NULL AND length(trim(phone)) >= 10)
  );

DROP TRIGGER IF EXISTS trg_mark_checkout_recovery_converted ON public.orders;
CREATE TRIGGER trg_mark_checkout_recovery_converted
AFTER INSERT OR UPDATE OF session_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_checkout_recovery_converted();

-- Repair any already-matched rows created before the trigger covered the
-- post-insert attribution update.
UPDATE public.checkout_recovery_leads r
SET status = 'converted',
    converted_order_id = o.id,
    email = NULL,
    phone = NULL,
    basket = '[]'::jsonb,
    updated_at = now()
FROM public.orders o
WHERE r.status = 'active'
  AND r.session_id = o.session_id
  AND o.session_id IS NOT NULL;
