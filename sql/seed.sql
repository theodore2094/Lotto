-- lotto seed.sql  
-- Logins (all passwords: password123)
--   admin            -> Admin    
--   john@example.com -> Customer
--   jane@example.com -> Customer

USE lotto;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE CartItem;
TRUNCATE TABLE Prize;
TRUNCATE TABLE LotteryTicket;
TRUNCATE TABLE Payment;
TRUNCATE TABLE LotteryNumber;
TRUNCATE TABLE LotteryDraw;
TRUNCATE TABLE User;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users
INSERT INTO User (UserID, FirstName, LastName, Phone, Email, Password, Role) VALUES
(1, 'Admin', 'User', '+66800000000', 'admin',            '$2b$10$C7oXy9trtG4b/efi07gg7.kgP7Uv2pYLmS9Pb1SzgGyXbMIt1uHWi', 'Admin'),
(2, 'John',  'Doe',  '+66812345678', 'john@example.com', '$2b$10$C7oXy9trtG4b/efi07gg7.kgP7Uv2pYLmS9Pb1SzgGyXbMIt1uHWi', 'Customer'),
(3, 'Jane',  'Smith','+66898765432', 'jane@example.com', '$2b$10$C7oXy9trtG4b/efi07gg7.kgP7Uv2pYLmS9Pb1SzgGyXbMIt1uHWi', 'Customer');

-- 2. Draws: draw 1 is finished (all 13 prizes), draw 2 is open for sales
INSERT INTO LotteryDraw (DrawID, DrawDate, DrawStatus) VALUES
(1, '2026-09-01 16:00:00', 'Completed'),
(2, '2026-10-01 16:00:00', 'Pending'),
(3, '2026-11-01 16:00:00', 'Pending');

-- 3. Ticket stock: numbers 000000-000099, 3 of each, for every draw
INSERT INTO LotteryNumber (DrawID, TicketNumber, TotalQuantity, AvailableQuantity)
WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 99
)
SELECT d.DrawID, LPAD(seq.n, 6, '0'), 3, 3
FROM seq CROSS JOIN LotteryDraw d;

-- 4. Prizes for draw 1: 1st, 2nd, 3rd + ten 4th prizes (13 total, as the admin page expects)
INSERT INTO Prize (DrawID, PrizeType, WinningNumber, PrizeAmount) VALUES
(1, 'First Prize',     '000042', 6000000.00),
(1, 'Second Prize',    '000015',  200000.00),
(1, 'Third Prize',     '000088',   80000.00),
(1, 'Fourth Prize 1',  '000005',    2000.00),
(1, 'Fourth Prize 2',  '000012',    2000.00),
(1, 'Fourth Prize 3',  '000027',    2000.00),
(1, 'Fourth Prize 4',  '000033',    2000.00),
(1, 'Fourth Prize 5',  '000051',    2000.00),
(1, 'Fourth Prize 6',  '000064',    2000.00),
(1, 'Fourth Prize 7',  '000070',    2000.00),
(1, 'Fourth Prize 8',  '000079',    2000.00),
(1, 'Fourth Prize 9',  '000093',    2000.00),
(1, 'Fourth Prize 10', '000099',    2000.00);

-- for drawID 2
INSERT INTO Prize (DrawID, PrizeType, WinningNumber, PrizeAmount) VALUES
(2, 'First Prize',     '482910', 6000000.00),
(2, 'Second Prize',    '739184',  200000.00),
(2, 'Third Prize',     '193746',   80000.00),
(2, 'Fourth Prize 1',  '204851',    2000.00),
(2, 'Fourth Prize 2',  '319620',    2000.00),
(2, 'Fourth Prize 3',  '582739',    2000.00),
(2, 'Fourth Prize 4',  '641093',    2000.00),
(2, 'Fourth Prize 5',  '793425',    2000.00),
(2, 'Fourth Prize 6',  '815047',    2000.00),
(2, 'Fourth Prize 7',  '902618',    2000.00),
(2, 'Fourth Prize 8',  '148902',    2000.00),
(2, 'Fourth Prize 9',  '367581',    2000.00),
(2, 'Fourth Prize 10', '524196',    2000.00);

-- 5. Sample purchases (price is 100 per ticket, as in the API).
--    Inserting tickets fires the stock triggers, so AvailableQuantity drops automatically.
INSERT INTO Payment (PaymentID, UserID, Amount, PaymentDate) VALUES
(1, 2, 200.00, '2026-09-15 10:30:00'),
(2, 3, 100.00, '2026-08-20 09:00:00'),
(3, 3, 200.00, '2026-08-20 09:00:00');

-- Look the number IDs up first: the stock trigger updates LotteryNumber, so MySQL
-- does not allow reading that table in the same INSERT ... SELECT.
SET @john_num  = (SELECT LotteryNumberID FROM LotteryNumber WHERE DrawID = 2 AND TicketNumber = '000000');
SET @jane_num1 = (SELECT LotteryNumberID FROM LotteryNumber WHERE DrawID = 1 AND TicketNumber = '000042');
SET @jane_num2 = (SELECT LotteryNumberID FROM LotteryNumber WHERE DrawID = 1 AND TicketNumber = '000005');

INSERT INTO LotteryTicket (TicketID, UserID, LotteryNumberID, PaymentID, PurchaseDate, Quantity) VALUES
-- John: 2x 000000 in the open draw (no winnings yet)
(1, 2, @john_num,  1, '2026-09-15 10:30:00', 2),
-- Jane: winners in draw 1, so the profile winnings page has data (First Prize x1, Fourth Prize x2)
(2, 3, @jane_num1, 2, '2026-08-20 09:00:00', 1),
(3, 3, @jane_num2, 3, '2026-08-20 09:00:00', 2);
