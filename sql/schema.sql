-- lotto  

DROP DATABASE IF EXISTS lotto;
CREATE DATABASE lotto;
USE lotto;

-- TABLES

CREATE TABLE User (
  UserID    INT          NOT NULL AUTO_INCREMENT,
  FirstName VARCHAR(50)  NOT NULL,
  LastName  VARCHAR(50)  NOT NULL,
  Phone     VARCHAR(20)  NULL,
  Email     VARCHAR(100) NOT NULL,                 -- also used as the login username
  Password  VARCHAR(255) NOT NULL,                 -- bcrypt hash (60 chars), never plain text
  Role      ENUM('Customer','Admin') NOT NULL DEFAULT 'Customer',
  PRIMARY KEY (UserID),
  UNIQUE KEY uq_user_email (Email)
);

CREATE TABLE LotteryDraw (
  DrawID     INT         NOT NULL AUTO_INCREMENT,
  DrawDate   DATETIME    NOT NULL,
  DrawStatus ENUM('Pending','Closed','Completed') NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (DrawID),
  KEY idx_draw_date (DrawDate)
);

-- has unique so that the admin will not draw the same ticket twice in the draw
CREATE TABLE LotteryNumber (
  LotteryNumberID   INT     NOT NULL AUTO_INCREMENT,
  DrawID            INT     NOT NULL,
  TicketNumber      CHAR(6) NOT NULL,
  TotalQuantity     INT     NOT NULL DEFAULT 3,
  AvailableQuantity INT     NOT NULL DEFAULT 3,
  PRIMARY KEY (LotteryNumberID),
  UNIQUE KEY uq_draw_number (DrawID, TicketNumber), 
  CONSTRAINT fk_number_draw FOREIGN KEY (DrawID) REFERENCES LotteryDraw (DrawID) ON DELETE CASCADE,
  CONSTRAINT chk_available CHECK (AvailableQuantity >= 0 AND AvailableQuantity <= TotalQuantity)
);

CREATE TABLE Payment (
  PaymentID     INT           NOT NULL AUTO_INCREMENT,
  UserID        INT           NOT NULL,
  Amount        DECIMAL(10,2) NOT NULL,
  PaymentDate   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (PaymentID),
  KEY idx_payment_user (UserID),
  CONSTRAINT fk_payment_user FOREIGN KEY (UserID) REFERENCES User (UserID),
  CONSTRAINT chk_amount CHECK (Amount >= 0)
);

CREATE TABLE LotteryTicket (
  TicketID        INT      NOT NULL AUTO_INCREMENT,
  UserID          INT      NOT NULL,
  LotteryNumberID INT      NOT NULL,
  PaymentID       INT      NOT NULL,
  PurchaseDate    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Quantity        INT      NOT NULL DEFAULT 1,
  PRIMARY KEY (TicketID),
  KEY idx_ticket_user (UserID),
  KEY idx_ticket_number (LotteryNumberID),
  CONSTRAINT fk_ticket_user    FOREIGN KEY (UserID)          REFERENCES User (UserID),
  CONSTRAINT fk_ticket_number  FOREIGN KEY (LotteryNumberID) REFERENCES LotteryNumber (LotteryNumberID),
  CONSTRAINT fk_ticket_payment FOREIGN KEY (PaymentID)       REFERENCES Payment (PaymentID),
  CONSTRAINT chk_quantity CHECK (Quantity > 0)
);

CREATE TABLE Prize (
  PrizeID       INT           NOT NULL AUTO_INCREMENT,
  DrawID        INT           NOT NULL,
  PrizeType     VARCHAR(50)   NOT NULL,            -- 'First Prize', 'Second Prize', etc
  WinningNumber CHAR(6)       NOT NULL,
  PrizeAmount   DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (PrizeID),
  UNIQUE KEY uq_draw_prizetype (DrawID, PrizeType),  -- stops the admin page inserting the same prize twice
  KEY idx_prize_number (WinningNumber),
  CONSTRAINT fk_prize_draw FOREIGN KEY (DrawID) REFERENCES LotteryDraw (DrawID) ON DELETE CASCADE
);


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


-- TRIGGERS

DELIMITER //
-- Trigger 1: Validate available ticket quantity before inserting a ticket
DROP TRIGGER IF EXISTS trg_before_ticket_insert //
CREATE TRIGGER trg_before_ticket_insert
BEFORE INSERT ON LotteryTicket
FOR EACH ROW
BEGIN
    DECLARE current_available INT;

    -- Fetch current available quantity for the requested lottery number
    SELECT AvailableQuantity INTO current_available
    FROM LotteryNumber
    WHERE LotteryNumberID = NEW.LotteryNumberID;

    -- Throw error if requested quantity exceeds availability
    IF current_available IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid Lottery Number ID.';
    ELSEIF NEW.Quantity > current_available THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Not enough ticket stock remaining for this number.';
    END IF;
END //

-- Trigger 2: Automatically deduct available quantity after ticket purchase
DROP TRIGGER IF EXISTS trg_after_ticket_insert //
CREATE TRIGGER trg_after_ticket_insert
AFTER INSERT ON LotteryTicket
FOR EACH ROW
BEGIN
    UPDATE LotteryNumber
    SET AvailableQuantity = AvailableQuantity - NEW.Quantity
    WHERE LotteryNumberID = NEW.LotteryNumberID;
END //


-- STORED PROCEDURES

-- Close a draw (admin). Completed draws count as already closed.
CREATE PROCEDURE sp_close_draw(IN p_DrawID INT)
BEGIN
  DECLARE v_CurrentStatus VARCHAR(20);

  SELECT DrawStatus INTO v_CurrentStatus
  FROM LotteryDraw
  WHERE DrawID = p_DrawID;

  IF v_CurrentStatus IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Draw ID not found.';
  ELSEIF v_CurrentStatus IN ('Closed', 'Completed') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Draw is already closed.';
  ELSE
    UPDATE LotteryDraw SET DrawStatus = 'Closed' WHERE DrawID = p_DrawID;
  END IF;
END //

-- Atomic checkout for one cart item: payment + ticket in one transaction.
CREATE PROCEDURE sp_process_checkout(
  IN  p_UserID       INT,
  IN  p_DrawID       INT,
  IN  p_TicketNumber VARCHAR(6),
  IN  p_Quantity     INT,
  IN  p_Amount       DECIMAL(10,2),
  OUT p_PaymentID    INT,
  OUT p_TicketID     INT
)
BEGIN
  DECLARE v_LotteryNumberID  INT DEFAULT NULL;
  DECLARE v_AvailableQuantity INT DEFAULT NULL;
  DECLARE v_DrawStatus       VARCHAR(20) DEFAULT NULL;

  -- 1. Draw must exist and still be open for sales
  SELECT DrawStatus INTO v_DrawStatus FROM LotteryDraw WHERE DrawID = p_DrawID;
  IF v_DrawStatus IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Draw not found.';
  ELSEIF v_DrawStatus <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This draw is closed for sales.';
  END IF;
 
  -- 2. Lock the number row (held until the caller commits) so concurrent buyers queue up
  SELECT LotteryNumberID, AvailableQuantity
  INTO v_LotteryNumberID, v_AvailableQuantity
  FROM LotteryNumber
  WHERE DrawID = p_DrawID AND TicketNumber = p_TicketNumber
  FOR UPDATE;
 
  IF v_LotteryNumberID IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ticket number not found for this draw.';
  ELSEIF v_AvailableQuantity < p_Quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Requested quantity unavailable.';
  END IF;
 
  -- 3. Payment
  INSERT INTO Payment (UserID, Amount, PaymentDate)
  VALUES (p_UserID, p_Amount, NOW());
  SET p_PaymentID = LAST_INSERT_ID();
 
  -- 4. Ticket (fires both triggers)
  INSERT INTO LotteryTicket (UserID, LotteryNumberID, PaymentID, PurchaseDate, Quantity)
  VALUES (p_UserID, v_LotteryNumberID, p_PaymentID, NOW(), p_Quantity);
  SET p_TicketID = LAST_INSERT_ID();
END //
 

-- All winning tickets for a user
CREATE PROCEDURE sp_get_user_winnings(IN p_UserID INT)
BEGIN
  SELECT
    lt.TicketID,
    ln.TicketNumber,
    d.DrawDate,
    p.PrizeType,
    p.PrizeAmount,
    lt.Quantity,
    (p.PrizeAmount * lt.Quantity) AS TotalWinningAmount
  FROM LotteryTicket lt
  JOIN LotteryNumber ln ON lt.LotteryNumberID = ln.LotteryNumberID
  JOIN LotteryDraw   d  ON ln.DrawID = d.DrawID
  JOIN Prize         p  ON p.DrawID = d.DrawID AND p.WinningNumber = ln.TicketNumber
  WHERE lt.UserID = p_UserID
  ORDER BY d.DrawDate DESC;
END //

DELIMITER ;
