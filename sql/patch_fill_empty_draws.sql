-- ============================================================
-- Patch: gives ticket numbers (000000-000099, 3 of each) to every draw that has none yet,
-- for example draws that were added from the admin page before it did this by itself.
-- Safe to run more than once, keeps all data:
--   mysql -u root -p lotto < patch_fill_empty_draws.sql
-- ============================================================
USE lotto;

INSERT INTO LotteryNumber (DrawID, TicketNumber, TotalQuantity, AvailableQuantity)
WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 99
)
SELECT d.DrawID, LPAD(seq.n, 6, '0'), 3, 3
FROM seq CROSS JOIN LotteryDraw d
WHERE NOT EXISTS (SELECT 1 FROM LotteryNumber ln WHERE ln.DrawID = d.DrawID);
