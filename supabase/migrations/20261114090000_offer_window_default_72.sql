-- The visitor offer window became 72 hours on 13 Nov 2026: the live
-- shop_settings row was set to 72 and the code fallback in
-- src/utils/shopSettings.ts followed (cfa9f02). The column default still said
-- 48, so a freshly built database disagreed with both. Every window already
-- issued keeps its own expires_at; no window is extended or restarted here.
alter table public.shop_settings alter column offer_window_hours set default 72;
-- Record the row value the shop already runs on, so a database rebuilt from
-- migrations matches production. A no-op on the live row (already 72);
-- issued windows keep their own expires_at.
update public.shop_settings set offer_window_hours = 72 where offer_window_hours <> 72;
