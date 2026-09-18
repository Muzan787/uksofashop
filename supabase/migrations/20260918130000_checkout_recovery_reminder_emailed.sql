-- The reminder email is sent from the admin leads page itself, not from a
-- mail app, so the page has to know it went: the card shows when, and the
-- button reads "Email again" instead of inviting a second identical send.

ALTER TABLE public.checkout_recovery_leads
  ADD COLUMN IF NOT EXISTS reminder_emailed_at timestamptz;

COMMENT ON COLUMN public.checkout_recovery_leads.reminder_emailed_at IS
  'When the reminder email was last sent from the admin panel. Null until it has been.';
