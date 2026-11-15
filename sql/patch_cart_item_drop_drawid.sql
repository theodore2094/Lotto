-- ============================================================
-- Patch: removes CartItem.DrawID (the draw is already known through LotteryNumberID).
-- Run ONCE on a database where you already created CartItem with the DrawID column:
--   mysql -u root -p lotto < patch_cart_item_drop_drawid.sql
-- ============================================================
USE lotto;

ALTER TABLE CartItem DROP COLUMN DrawID;
