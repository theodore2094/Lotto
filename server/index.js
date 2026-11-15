import express from "express"
import mysql from "mysql2/promise"
import dotenv from "dotenv"
import bcrypt from "bcrypt"

dotenv.config()

const app = express()
const port = Number(process.env.API_PORT || process.env.PORT || 3001)

app.use(express.json())

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lotto",
  waitForConnections: true,
  connectionLimit: 10,
})


const toInt = (value) => {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN
  return Number.isInteger(n) ? n : null
}

const PRICING = {
  pricePerTicket: 100,
  discountMinQuantity: 3, // total tickets in the cart needed for the discount
  discountRate: 0.1,
}

// discount kept getting 30.000000
const round2 = (n) => Math.round(n * 100) / 100


function priceCart(items) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = totalQuantity * PRICING.pricePerTicket
  const discount = totalQuantity >= PRICING.discountMinQuantity ? round2(subtotal * PRICING.discountRate) : 0
  const total = round2(subtotal - discount)

  const factor = subtotal === 0 ? 1 : total / subtotal
  const priced = items.map((item) => ({
    ...item,
    amount: round2(item.quantity * PRICING.pricePerTicket * factor),
  }))
  const allocated = round2(priced.reduce((sum, item) => sum + item.amount, 0))
  priced[priced.length - 1].amount = round2(priced[priced.length - 1].amount + (total - allocated))

  return { subtotal, discount, total, items: priced }
}

// 1. PUBLIC & CUSTOMER ROUTES

app.get("/api/pricing", (_request, response) => {
  response.json(PRICING)
})

// Fetch Latest Draw Results
app.get("/api/draws/latest", async (request, response, next) => {
  try {
    const [prizes] = await pool.query(
      `SELECT p.PrizeType, p.WinningNumber, p.PrizeAmount, d.DrawDate 
       FROM Prize p 
       JOIN LotteryDraw d ON p.DrawID = d.DrawID 
       WHERE p.PrizeType IN ('First Prize', 'Second Prize', 'Third Prize')
       ORDER BY d.DrawDate DESC, p.PrizeAmount DESC 
       LIMIT 3`
    )
    response.json(prizes)
  } catch (error) {
    next(error)
  }
})

// Current open draw: the earliest draw that is still on sale (status 'Pending')
app.get("/api/draws/current", async (_request, response, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DrawID, DrawDate, DrawStatus
       FROM LotteryDraw
       WHERE DrawStatus = 'Pending'
       ORDER BY DrawDate ASC
       LIMIT 1`
    )
    if (rows.length === 0) {
      return response.status(404).json({ message: "No draw is currently open for sales." })
    }
    response.json(rows[0])
  } catch (error) {
    next(error)
  }
})

// Draw shown on the admin live-draw page, with its prizes so far.
// ?drawId=N picks a specific draw; otherwise the most recent draw that is no longer on sale.
app.get("/api/draws/live", async (request, response, next) => {
  try {
    const { drawId } = request.query
    const requestedId = drawId === undefined ? null : toInt(drawId)
    if (drawId !== undefined && requestedId === null) {
      return response.status(400).json({ message: "drawId must be a whole number." })
    }
    const [draws] = requestedId !== null
      ? await pool.execute(
        `SELECT DrawID, DrawDate, DrawStatus FROM LotteryDraw WHERE DrawID = ?`,
        [requestedId]
      )
      : await pool.query(
        `SELECT DrawID, DrawDate, DrawStatus
           FROM LotteryDraw
           WHERE DrawStatus <> 'Pending'
           ORDER BY DrawDate DESC
           LIMIT 1`
      )
    if (draws.length === 0) {
      return response.status(404).json({ message: "No draw found." })
    }
    const [prizes] = await pool.execute(
      `SELECT PrizeType, WinningNumber, PrizeAmount
       FROM Prize WHERE DrawID = ? ORDER BY PrizeID ASC`,
      [draws[0].DrawID]
    )
    response.json({ draw: draws[0], prizes })
  } catch (error) {
    next(error)
  }
})

// Check Lottery Number
app.get("/api/draws/check", async (request, response, next) => {
  try {
    const number = String(request.query.number || "")
    const { month, year, date } = request.query

    if (!number || number.length !== 6 || [...number].some(char => char < '0' || char > '9')) {
      return response.status(400).json({ message: "A 6-digit number is required." })
    }

    let query = `SELECT p.PrizeType, p.PrizeAmount, d.DrawDate 
                 FROM Prize p 
                 JOIN LotteryDraw d ON p.DrawID = d.DrawID 
                 WHERE p.WinningNumber = ?`
    const params = [number]

    if (month !== undefined || year !== undefined) {
      const m = toInt(month)
      const y = toInt(year)
      if (m === null || y === null || m < 1 || m > 12) {
        return response.status(400).json({ message: "month (1-12) and year must both be whole numbers." })
      }
      query += ` AND MONTH(d.DrawDate) = ? AND YEAR(d.DrawDate) = ?`
      params.push(m, y)
    } else if (date) {
      query += ` AND DATE(d.DrawDate) = DATE(?)`
      params.push(String(date))
    }

    query += ` ORDER BY d.DrawDate DESC LIMIT 1`

    const [rows] = await pool.execute(query, params)

    const winData = rows[0]
    if (!winData) {
      return response.json({ winner: false })
    }
    return response.json({ winner: true, ...winData })
  } catch (error) {
    next(error)
  }
})

// Fetch Historical Results by DrawID OR Month & Year
app.get("/api/draws/historical", async (req, res, next) => {
  try {
    const { month, year, drawId } = req.query

    if (drawId !== undefined) {
      const id = toInt(drawId)
      if (id === null || id < 1) {
        return res.status(400).json({ message: "drawId must be a positive whole number." })
      }
      const [prizes] = await pool.execute(
        `SELECT p.PrizeType, p.WinningNumber, p.PrizeAmount 
         FROM Prize p WHERE p.DrawID = ? ORDER BY p.PrizeID ASC`,
        [id]
      )
      return res.json(prizes)
    }

    const m = toInt(month)
    const y = toInt(year)
    if (m === null || y === null || m < 1 || m > 12 || y < 2000 || y > 9999) {
      return res.status(400).json({ message: "Provide drawId, or both month (1-12) and year." })
    }

    const [prizes] = await pool.execute(
      `SELECT p.PrizeType, p.WinningNumber, p.PrizeAmount 
       FROM Prize p JOIN LotteryDraw d ON p.DrawID = d.DrawID 
       WHERE MONTH(d.DrawDate) = ? AND YEAR(d.DrawDate) = ?
       ORDER BY p.PrizeID ASC`,
      [m, y]
    )
    res.json(prizes)
  } catch (error) {
    next(error)
  }
})

// Fetch Purchased Cart Tickets for User
app.get("/api/cart/:userId", async (request, response, next) => {
  try {
    const userId = request.params.userId
    const [tickets] = await pool.execute(
      `SELECT lt.TicketID, ln.TicketNumber, lt.Quantity, lt.PurchaseDate, d.DrawDate
       FROM LotteryTicket lt 
       JOIN LotteryNumber ln ON lt.LotteryNumberID = ln.LotteryNumberID 
       JOIN LotteryDraw d ON ln.DrawID = d.DrawID
       WHERE lt.UserID = ?
       ORDER BY lt.PurchaseDate DESC`,
      [userId]
    )
    response.json(tickets)
  } catch (error) {
    next(error)
  }
})

app.get("/api/users/:userId/winnings", async (req, res, next) => {
  try {
    const [winnings] = await pool.query(`CALL sp_get_user_winnings(?)`, [req.params.userId])
    res.json(winnings[0])
  } catch (error) {
    next(error)
  }
})

// ---- Shopping cart (CartItem table) ----
const MAX_CART_QUANTITY = 5 // matches chk_cartitem_quantity in the database

// The cart rows for one user, with what the page needs to show and to warn about stale items
const CART_QUERY = `
  SELECT ci.CartItemID, ci.Quantity, ln.DrawID, ln.LotteryNumberID, ln.TicketNumber,
         ln.AvailableQuantity, d.DrawDate, d.DrawStatus
  FROM CartItem ci
  JOIN LotteryNumber ln ON ln.LotteryNumberID = ci.LotteryNumberID
  JOIN LotteryDraw d ON d.DrawID = ln.DrawID
  WHERE ci.UserID = ?
  ORDER BY ci.CartItemID ASC`

// Get a user's cart
app.get("/api/cart-items/:userId", async (req, res, next) => {
  try {
    const userId = toInt(req.params.userId)
    if (userId === null) return res.status(400).json({ message: "Invalid user." })
    const [rows] = await pool.execute(CART_QUERY, [userId])
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

// Add a ticket to the cart (adding the same number again raises its quantity)
app.post("/api/cart-items", async (req, res, next) => {
  try {
    const userId = toInt(req.body?.userId)
    const drawId = toInt(req.body?.drawId)
    const quantity = toInt(req.body?.quantity ?? 1)
    const ticketNumber = String(req.body?.ticketNumber ?? "")
    if (userId === null) {
      return res.status(401).json({ success: false, message: "Please log in to add tickets to your cart." })
    }
    if (drawId === null || !/^\d{6}$/.test(ticketNumber) || quantity === null || quantity < 1) {
      return res.status(400).json({ success: false, message: "Invalid ticket." })
    }

    const [numbers] = await pool.execute(
      `SELECT ln.LotteryNumberID, ln.AvailableQuantity, d.DrawStatus
       FROM LotteryNumber ln JOIN LotteryDraw d ON d.DrawID = ln.DrawID
       WHERE ln.DrawID = ? AND ln.TicketNumber = ?`,
      [drawId, ticketNumber]
    )
    if (numbers.length === 0) {
      return res.status(404).json({ success: false, message: `Ticket ${ticketNumber} isn't available in this draw.` })
    }
    const { LotteryNumberID, AvailableQuantity, DrawStatus } = numbers[0]
    if (DrawStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "This draw is closed for sales." })
    }

    const limit = Math.min(MAX_CART_QUANTITY, AvailableQuantity)
    if (limit < 1) {
      return res.status(400).json({ success: false, message: `Ticket ${ticketNumber} is sold out.` })
    }
    const [existing] = await pool.execute(
      `SELECT Quantity FROM CartItem WHERE UserID = ? AND LotteryNumberID = ?`,
      [userId, LotteryNumberID]
    )
    const wanted = (existing[0]?.Quantity ?? 0) + quantity
    if (wanted > limit) {
      return res.status(400).json({
        success: false,
        message: `You can have at most ${limit} of ticket ${ticketNumber} in your cart.`,
      })
    }

    await pool.execute(
      `INSERT INTO CartItem (UserID, LotteryNumberID, Quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE Quantity = VALUES(Quantity)`,
      [userId, LotteryNumberID, wanted]
    )
    res.json({ success: true, quantity: wanted })
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({ success: false, message: "Account not found." })
    }
    next(error)
  }
})

// Change a cart item's quantity (the + and - buttons)
app.put("/api/cart-items/:cartItemId", async (req, res, next) => {
  try {
    const cartItemId = toInt(req.params.cartItemId)
    const userId = toInt(req.body?.userId)
    const quantity = toInt(req.body?.quantity)
    if (cartItemId === null || userId === null) {
      return res.status(400).json({ success: false, message: "Invalid request." })
    }
    if (quantity === null || quantity < 1 || quantity > MAX_CART_QUANTITY) {
      return res.status(400).json({ success: false, message: `Quantity must be between 1 and ${MAX_CART_QUANTITY}.` })
    }

    const [rows] = await pool.execute(
      `SELECT ci.Quantity, ln.AvailableQuantity, d.DrawStatus
       FROM CartItem ci
       JOIN LotteryNumber ln ON ln.LotteryNumberID = ci.LotteryNumberID
       JOIN LotteryDraw d ON d.DrawID = ln.DrawID
       WHERE ci.CartItemID = ? AND ci.UserID = ?`,
      [cartItemId, userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "That item is no longer in your cart." })
    }
    const { Quantity, AvailableQuantity, DrawStatus } = rows[0]
    if (DrawStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "This draw is closed for sales." })
    }
    // going down is always allowed; going up must fit the stock
    if (quantity > Quantity && quantity > AvailableQuantity) {
      return res.status(400).json({ success: false, message: `Only ${AvailableQuantity} of this ticket left.` })
    }

    await pool.execute(`UPDATE CartItem SET Quantity = ? WHERE CartItemID = ? AND UserID = ?`, [quantity, cartItemId, userId])
    res.json({ success: true, quantity })
  } catch (error) {
    next(error)
  }
})

// Remove an item from the cart (the bin button)
app.delete("/api/cart-items/:cartItemId", async (req, res, next) => {
  try {
    const cartItemId = toInt(req.params.cartItemId)
    const userId = toInt(req.query.userId)
    if (cartItemId === null || userId === null) {
      return res.status(400).json({ success: false, message: "Invalid request." })
    }
    const [result] = await pool.execute(
      `DELETE FROM CartItem WHERE CartItemID = ? AND UserID = ?`,
      [cartItemId, userId]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "That item is no longer in your cart." })
    }
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// 2. AUTHENTICATION & CHECKOUT ROUTES

// Register User
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const [result] = await pool.execute(
      `INSERT INTO User (FirstName, LastName, Phone, Email, Password, Role) VALUES (?, ?, ?, ?, ?, 'Customer')`,
      [firstName, lastName, phone, email, hashedPassword]
    )

    res.json({ message: "Registration successful", userId: result.insertId })
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email address is already registered." })
    }
    next(error)
  }
})

// Login User
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username/Email and password are required." })
    }

    const [users] = await pool.execute(
      `SELECT UserID, Password, Role FROM User WHERE Email = ? LIMIT 1`,
      [username]
    )

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" })
    }

    const user = users[0]
    const isPasswordValid = await bcrypt.compare(password, user.Password)

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" })
    }

    res.json({
      success: true,
      role: user.Role,
      userId: user.UserID,
    })
  } catch (error) {
    next(error)
  }
})

// Checkout Processing
// Buys everything in the user's cart (read from the CartItem table, never from the browser) and empties it.
// The whole thing is ONE database transaction: if any item fails, nothing is bought and the cart is untouched.
app.post("/api/checkout", async (req, res, next) => {
  const userId = toInt(req.body?.userId)
  const totalAmount = req.body?.totalAmount

  if (userId === null) {
    return res.status(401).json({ success: false, message: "Please log in first to complete your purchase." })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Lock this user's cart rows: a double-click or a second tab waits here,
    // then finds the cart already emptied instead of buying everything twice.
    const [cart] = await connection.execute(
      `SELECT ci.Quantity, ln.DrawID, ln.TicketNumber
       FROM CartItem ci
       JOIN LotteryNumber ln ON ln.LotteryNumberID = ci.LotteryNumberID
       WHERE ci.UserID = ?
       ORDER BY ln.DrawID, ln.TicketNumber
       FOR UPDATE OF ci`,
      [userId]
    )
    if (cart.length === 0) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: "Your cart is empty." })
    }

    const priced = priceCart(cart.map((row) => ({
      drawId: row.DrawID,
      ticketNumber: row.TicketNumber,
      quantity: row.Quantity,
    })))

    // The server decides the price. If the page showed a different total, refuse instead of charging a surprise.
    if (totalAmount !== undefined && Math.abs(Number(totalAmount) - priced.total) > 0.005) {
      await connection.rollback()
      return res.status(409).json({
        success: false,
        message: "The price has changed. Please review your order and try again.",
        expectedTotal: priced.total,
      })
    }

    // Always lock ticket rows in the same order, so two carts can't deadlock each other
    priced.items.sort((a, b) => a.drawId - b.drawId || a.ticketNumber.localeCompare(b.ticketNumber))

    const results = []
    for (const item of priced.items) {
      await connection.query(
        `CALL sp_process_checkout(?, ?, ?, ?, ?, @p_PaymentID, @p_TicketID)`,
        [userId, item.drawId, item.ticketNumber, item.quantity, item.amount]
      )
      const [[outParams]] = await connection.query(
        `SELECT @p_PaymentID AS paymentId, @p_TicketID AS ticketId`
      )
      results.push(outParams)
    }

    await connection.execute(`DELETE FROM CartItem WHERE UserID = ?`, [userId])

    await connection.commit()
    res.json({ success: true, total: priced.total, processedItems: results })
  } catch (error) {
    await connection.rollback().catch(() => { })
    // 45000 = a message our stored procedure raised on purpose (e.g. "Requested quantity unavailable.")
    if (error.sqlState === "45000") {
      return res.status(400).json({ success: false, message: error.sqlMessage || error.message })
    }
    next(error)
  } finally {
    connection.release()
  }
})


// 3. ADMIN ROUTES

// Admin Dashboard Metrics
app.get("/api/admin/dashboard", async (_request, response, next) => {
  try {
    const [userRes] = await pool.query(
      `SELECT COUNT(DISTINCT UserID) AS TotalUsers FROM User WHERE Role = 'Customer'`
    )
    const [salesRes] = await pool.query(
      `SELECT SUM(Amount) AS TotalSales FROM Payment`
    )
    const [ticketRes] = await pool.query(
      `SELECT SUM(Quantity) AS TotalTickets FROM LotteryTicket`
    )
    const [draws] = await pool.query(
      `SELECT d.DrawID, d.DrawDate, d.DrawStatus, SUM(ln.TotalQuantity) - SUM(ln.AvailableQuantity) AS TicketSold
      FROM LotteryDraw d
      LEFT JOIN LotteryNumber ln ON ln.DrawID = d.DrawID
      GROUP BY d.DrawID , d.DrawDate , d.DrawStatus
      ORDER BY DrawDate DESC;`
    )

    response.json({
      totalUsers: userRes[0].TotalUsers || 0,
      totalSales: salesRes[0].TotalSales || 0,
      totalTickets: ticketRes[0].TotalTickets || 0,
      draws: draws,
    })
  } catch (error) {
    next(error)
  }
})

// ---- Admin: figures for ONE draw (for the draw page) ----
// A payment has no DrawID, but each payment points at its ticket, and the ticket at its number and draw.
async function drawStats(db, drawId) {
  const [rows] = await db.execute(
    `SELECT
       (SELECT COUNT(DISTINCT lt.UserID)
          FROM LotteryTicket lt JOIN LotteryNumber ln ON ln.LotteryNumberID = lt.LotteryNumberID
          WHERE ln.DrawID = ?) AS usersEntered,
       (SELECT COALESCE(SUM(lt.Quantity), 0)
          FROM LotteryTicket lt JOIN LotteryNumber ln ON ln.LotteryNumberID = lt.LotteryNumberID
          WHERE ln.DrawID = ?) AS ticketsSold,
       (SELECT COALESCE(SUM(p.Amount), 0) FROM Payment p
          WHERE p.PaymentID IN (SELECT lt.PaymentID
                                  FROM LotteryTicket lt JOIN LotteryNumber ln ON ln.LotteryNumberID = lt.LotteryNumberID
                                  WHERE ln.DrawID = ?)) AS sales`,
    [drawId, drawId, drawId]
  )
  return {
    usersEntered: Number(rows[0].usersEntered),
    ticketsSold: Number(rows[0].ticketsSold),
    sales: Number(rows[0].sales),
  }
}

// Each draw's figures, and the draw before it for comparison status
app.get("/api/admin/draws/:drawId/stats", async (req, res, next) => {
  try {
    const drawId = toInt(req.params.drawId)
    if (drawId === null || drawId < 1) {
      return res.status(400).json({ message: "Invalid draw." })
    }
    const [draws] = await pool.execute(`SELECT DrawID, DrawDate FROM LotteryDraw WHERE DrawID = ?`, [drawId])
    if (draws.length === 0) return res.status(404).json({ message: "Draw not found." })

    const [earlier] = await pool.execute(
      `SELECT DrawID FROM LotteryDraw WHERE DrawDate < ? ORDER BY DrawDate DESC LIMIT 1`,
      [draws[0].DrawDate]
    )
    res.json({
      drawId,
      current: await drawStats(pool, drawId),
      previous: earlier.length > 0 ? await drawStats(pool, earlier[0].DrawID) : null,
    })
  } catch (error) {
    next(error)
  }
})


// ---- Admin: draws ----
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const TICKET_NUMBERS_PER_DRAW = 100 // 000000 - 000099, the same as sql/seed.sql
const TICKETS_PER_NUMBER = 3

// The 13 prizes of a draw, in the order they are drawn. The server decides the amounts, not the browser.
const PRIZE_SEQUENCE = [
  { type: "First Prize", amount: 6000000 },
  { type: "Second Prize", amount: 200000 },
  { type: "Third Prize", amount: 80000 },
  ...Array.from({ length: 10 }, (_, i) => ({ type: `Fourth Prize ${i + 1}`, amount: 2000 })),
]

// Admin: Add Draw
// One draw per month (results are looked up by month), and the new draw gets its ticket numbers
// straight away: without them nobody could buy a ticket for it.
app.post("/api/admin/draws", async (req, res, next) => {
  const drawDate = String(req.body?.drawDate ?? "")
  const match = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec(drawDate)
  const year = match ? Number(match[1]) : 0
  const month = match ? Number(match[2]) : 0
  const day = match ? Number(match[3]) : 0
  const real = new Date(Date.UTC(year, month - 1, day))
  if (!match || real.getUTCFullYear() !== year || real.getUTCMonth() !== month - 1 || real.getUTCDate() !== day) {
    return res.status(400).json({ success: false, message: "drawDate must be a real date like 2026-12-01 16:00:00." })
  }

  const monthStart = `${match[1]}-${match[2]}-01 00:00:00`
  const nextMonthStart =
    month === 12 ? `${year + 1}-01-01 00:00:00` : `${year}-${String(month + 1).padStart(2, "0")}-01 00:00:00`

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // locking read: two admins clicking at the same moment can't both add the same month
    const [existing] = await connection.execute(
      `SELECT DrawID FROM LotteryDraw WHERE DrawDate >= ? AND DrawDate < ? FOR UPDATE`,
      [monthStart, nextMonthStart]
    )
    if (existing.length > 0) {
      await connection.rollback()
      return res.status(409).json({
        success: false,
        message: `A draw already exists for ${MONTH_NAMES[month - 1]} ${year}.`,
      })
    }

    const [result] = await connection.execute(
      `INSERT INTO LotteryDraw (DrawDate, DrawStatus) VALUES (?, 'Pending')`,
      [drawDate]
    )
    await connection.query(
      `INSERT INTO LotteryNumber (DrawID, TicketNumber, TotalQuantity, AvailableQuantity)
       WITH RECURSIVE seq AS (
         SELECT 0 AS n
         UNION ALL
         SELECT n + 1 FROM seq WHERE n < ?
       )
       SELECT ?, LPAD(n, 6, '0'), ?, ? FROM seq`,
      [TICKET_NUMBERS_PER_DRAW - 1, result.insertId, TICKETS_PER_NUMBER, TICKETS_PER_NUMBER]
    )

    await connection.commit()
    res.json({ success: true, drawId: result.insertId, ticketNumbers: TICKET_NUMBERS_PER_DRAW })
  } catch (error) {
    await connection.rollback().catch(() => { })
    if (error.code === "ER_LOCK_DEADLOCK") {
      return res.status(409).json({
        success: false,
        message: "Another draw was being added at the same moment. Refresh the page and try again.",
      })
    }
    next(error)
  } finally {
    connection.release()
  }
})

// Admin: Close Draw
app.put("/api/admin/draws/:drawId/close", async (req, res, next) => {
  try {
    const drawId = toInt(req.params.drawId)
    if (drawId === null) return res.status(400).json({ success: false, message: "Invalid draw." })

    await pool.query(`CALL sp_close_draw(?)`, [drawId])
    res.json({ success: true, message: "Draw successfully closed." })
  } catch (error) {
    // 45000 = a message our stored procedure raised on purpose ("Draw is already closed." ...)
    if (error.sqlState === "45000") {
      return res.status(400).json({ success: false, message: error.sqlMessage || error.message })
    }
    next(error)
  }
})

// Admin: Save Prize Roll
// Only a CLOSED draw can be drawn. Prizes are saved strictly in order (1st, 2nd, 3rd, 4th 1..10), each
// number at most once per draw, and the 13th one marks the draw Completed, all in one transaction.
app.post("/api/admin/draws/prizes", async (req, res, next) => {
  const drawId = toInt(req.body?.drawId)
  const winningNumber = String(req.body?.winningNumber ?? "")
  const prizeType = req.body?.prizeType

  if (drawId === null || drawId < 1) {
    return res.status(400).json({ success: false, message: "drawId is required." })
  }
  if (!/^\d{6}$/.test(winningNumber)) {
    return res.status(400).json({ success: false, message: "winningNumber must be 6 digits." })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // lock the draw: two clicks on Roll at the same moment are handled one after the other
    const [draws] = await connection.execute(
      `SELECT DrawStatus FROM LotteryDraw WHERE DrawID = ? FOR UPDATE`,
      [drawId]
    )
    if (draws.length === 0) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: "Draw not found." })
    }
    if (draws[0].DrawStatus !== "Closed") {
      await connection.rollback()
      return res.status(409).json({
        success: false,
        message:
          draws[0].DrawStatus === "Completed"
            ? "This draw is already completed."
            : "Close the draw before drawing its numbers.",
      })
    }

    const [[{ drawn }]] = await connection.execute(
      `SELECT COUNT(*) AS drawn FROM Prize WHERE DrawID = ?`,
      [drawId]
    )
    const alreadyDrawn = Number(drawn)
    if (alreadyDrawn >= PRIZE_SEQUENCE.length) {
      await connection.rollback()
      return res.status(409).json({ success: false, message: "All 13 prizes are already drawn." })
    }
    const prize = PRIZE_SEQUENCE[alreadyDrawn]

    // the page must be on the same step as the database (e.g. not out of date after another admin rolled)
    if (prizeType !== undefined && prizeType !== prize.type) {
      await connection.rollback()
      return res.status(409).json({
        success: false,
        message: `The next prize to draw is ${prize.type}. Reload the page and try again.`,
      })
    }

    const [duplicate] = await connection.execute(
      `SELECT 1 FROM Prize WHERE DrawID = ? AND WinningNumber = ? LIMIT 1`,
      [drawId, winningNumber]
    )
    if (duplicate.length > 0) {
      await connection.rollback()
      return res.status(409).json({
        success: false,
        message: `${winningNumber} was already drawn in this draw. Roll again.`,
      })
    }

    await connection.execute(
      `INSERT INTO Prize (DrawID, PrizeType, WinningNumber, PrizeAmount) VALUES (?, ?, ?, ?)`,
      [drawId, prize.type, winningNumber, prize.amount]
    )

    const completed = alreadyDrawn + 1 === PRIZE_SEQUENCE.length
    if (completed) {
      await connection.execute(`UPDATE LotteryDraw SET DrawStatus = 'Completed' WHERE DrawID = ?`, [drawId])
    }

    await connection.commit()
    res.json({ success: true, prizeType: prize.type, amount: prize.amount, completed })
  } catch (error) {
    await connection.rollback().catch(() => { })
    next(error)
  } finally {
    connection.release()
  }
})


// Error Handler
app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: "The lottery service is temporarily unavailable." })
})

app.listen(port, () => {
  console.log(`Lottery API listening on port ${port}`)
})