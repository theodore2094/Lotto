-- ============================================================
-- Patch: adds the CartItem table (server-side shopping cart).
-- Run on your existing database; safe to run more than once, keeps all data:
--   mysql -u root -p lotto < patch_cart_item.sql
-- ============================================================
USE lotto;

-- Shopping cart: one row per ticket number a user has picked but not bought yet.
-- Adding the same number again raises Quantity; "remove" deletes the row; checkout turns the rows into
-- Payment + LotteryTicket records and then clears them.
CREATE TABLE IF NOT EXISTS CartItem (
  CartItemID      INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  UserID          INT NOT NULL,
  LotteryNumberID INT NOT NULL,
  Quantity        INT NOT NULL DEFAULT 1,
  CONSTRAINT uq_cartitem_user_number UNIQUE (UserID, LotteryNumberID),
  CONSTRAINT fk_cartitem_user FOREIGN KEY (UserID) REFERENCES `User` (UserID)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_cartitem_number FOREIGN KEY (LotteryNumberID) REFERENCES LotteryNumber (LotteryNumberID)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_cartitem_quantity CHECK (Quantity BETWEEN 1 AND 5)
) ENGINE=InnoDB;
