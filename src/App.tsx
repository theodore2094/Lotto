import React, { FormEvent, useEffect, useState } from "react"
import { differenceInSeconds, intervalToDuration, format } from 'date-fns';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const getNextDrawInfo = () => {
  const today = new Date()
  const nextDraw = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const monthStr = nextDraw.toLocaleString("en-US", { month: "long" })
  const shortMonthStr = nextDraw.toLocaleString("en-US", { month: "short" })
  const year = nextDraw.getFullYear()

  return {
    obj: nextDraw,
    sqlformat: format(nextDraw, 'yyyy-MM-dd'),
    fullText: `1 ${monthStr} ${year}`,
    monthText: monthStr,
    shortText: `1 ${shortMonthStr}`,
    monthYear: `${monthStr} ${year}`
  }
}
const nextDraw = getNextDrawInfo()

const getcurrentMonthInfo = () => {
  const today = new Date()

  const monthStr = today.toLocaleString("en-US", { month: "long" })
  const shortMonthStr = today.toLocaleString("en-US", { month: "short" })
  const year = today.getFullYear()

  return {
    obj: today,
    sqlformat: format(today, 'yyyy-MM-dd'),
    fullText: `1 ${monthStr} ${year}`,
    monthText: monthStr,
    shortText: `1 ${shortMonthStr}`,
    monthYear: `${monthStr} ${year}`
  }
}
const currentMonth = getcurrentMonthInfo()

const getPastMonths = (): string[] => {
  const list: string[] = []

  for (let i = 1; i <= 5; i++) {
    const d = new Date()
    // Setting day to 1 
    d.setDate(1)
    d.setMonth(d.getMonth() - i)

    const monthStr = d.toLocaleString("en-US", { month: "long" })
    const year = d.getFullYear()
    list.push(`${monthStr} ${year}`)
  }

  return list
}

const asset = (name: string) => `/assets/${name}`

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const parseMonthYear = (text: string): { month: number; year: number } => {
  const named = /^\s*([A-Za-z]+)\s+(\d{4})\s*$/.exec(text)
  if (named) {
    const index = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === named[1].toLowerCase()
    )
    if (index >= 0) return { month: index + 1, year: Number(named[2]) }
  }
  const iso = /^(\d{4})-(\d{2})/.exec(text)
  if (iso) return { month: Number(iso[2]), year: Number(iso[1]) }

  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

const formatMonthYear = (month: number, year: number) =>
  `${MONTH_NAMES[month - 1]} ${year}`

// Default navigation links for general visitors/customers
const navItems = [
  ["Draw Results", "/results"],
  ["Buy Lottery", "/buy-lottery"],
] as const

const steps = [
  {
    label: "Choose a number and how many entries you would like",
    icon: "touch",
  },
  {
    label: "Head to check out and complete payment",
    icon: "080fc.svg",
  },
  {
    label:
      "Tickets are entered into the draw, and can be viewed in your profile",
    icon: "5191a.svg",
  },
  {
    label:
      "If you win the lottery, we will contact you through email if you opted up for it!",
    icon: "7a467.svg",
  },
] as const

const drawMonths = [
  currentMonth.monthYear,
  ...getPastMonths()
] as const

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      className={`logo${inverse ? " logo--inverse" : ""}`}
      href="/"
      aria-label="Lotto home"
    >
      LOT<span>to</span>
    </a>
  )
}

function Button({
  children,
  href,
  type = "button",
}: {
  children: React.ReactNode
  href?: string
  type?: "button" | "submit"
}) {
  if (href) {
    return (
      <a className="button" href={href}>
        {children}
      </a>
    )
  }

  return (
    <button className="button" type={type}>
      {children}
    </button>
  )
}

function TouchIcon() {
  return (
    <span className="touch-icon" aria-hidden="true">
      <img src={asset("c451d.svg")} alt="" />
      <img src={asset("10ef9.svg")} alt="" />
      <img src={asset("cd27c.svg")} alt="" />
      <img src={asset("d1e8b.svg")} alt="" />
      <img src={asset("52058.svg")} alt="" />
    </span>
  )
}

function handleLogout() {
  localStorage.removeItem("userId")
  localStorage.removeItem("userRole")
  window.location.assign("/login")
}

// Reusable dynamic Header component
function Header({ className = "header" }: { className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    const storedUserRole = localStorage.getItem("userRole")
    setIsLoggedIn(Boolean(storedUserId))
    setUserRole(storedUserRole)
  }, [])


  // Admin users see ONLY "Draw Results"; general users/visitors see "Draw Results" & "Buy Lottery"
  const activeNavItems =
    userRole === "Admin"
      ? [["Draw Results", "/results"],
      ["Live Stream", "/admin/live-draw"]]
      : [
        ["Draw Results", "/results"],
        ["Buy Lottery", "/buy-lottery"],
      ]

  return (
    <header className={className}>
      <div className="header__inner">
        <Logo />
        <button
          className="menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          className={`nav${menuOpen ? " nav--open" : ""}`}
          aria-label="Main navigation"
        >
          {activeNavItems.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
        </nav>

        {isLoggedIn ? (
          <div className="buy-header__actions">
            {userRole !== "Admin" && (
              <>
                <a href="/checkout" aria-label="CheckOut">
                  <img src={asset("shopping_basket.svg")} alt="" />
                </a>
                <a href="/cart" aria-label="Shopping cart">
                  <img src={asset("cart-9cea0.svg")} alt="" />
                </a>
              </>
            )}
            {userRole === "Admin" && (
              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                Log out
              </button>
            )}
            <a href={userRole === "Admin" ? "/admin" : "/profile"} aria-label="Your account">
              <img src={asset("cart-3854b.svg")} alt="" />
            </a>
          </div>
        ) : (
          <div className="account-actions">
            <a
              className="login-link"
              href="/login"
              style={{ display: "inline-flex" }}
            >
              Login
            </a>
            <Button href="/register">Register</Button>
          </div>
        )}
      </div>
    </header>
  )
}

function Footer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    const storedUserRole = localStorage.getItem("userRole")
    setIsLoggedIn(Boolean(storedUserId))
    setUserRole(storedUserRole)
  }, [])


  // Admin users see ONLY "Draw Results"; general users/visitors see "Draw Results" & "Buy Lottery"
  const activeNavItems =
    userRole === "Admin"
      ? [["Draw Results", "/results"],
      ["Live Stream", "/admin/live-draw"]]
      : [
        ["Draw Results", "/results"],
        ["Buy Lottery", "/buy-lottery"],
      ]
  return (<footer className="footer">
    <div className="footer__inner">
      <Logo inverse />
      <div className="payment-marks" aria-label="Accepted payment methods">
        <img
          className="promptpay"
          src={asset("e804f.png")}
          alt="PromptPay"
        />
        {[
          "99c87.svg",
          "b250f.svg",
          "0a2b7.svg",
          "4182d.svg",
          "009a9.svg",
        ].map((name) => (
          <img key={name} src={asset(name)} alt="" />
        ))}
      </div>
      <nav className="footer__nav" aria-label="Footer navigation">
        {isLoggedIn ?
          (activeNavItems.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
          ))) :
          (navItems.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
          )))
        }
      </nav>
    </div>
  </footer>
  )
}

function How() {
  return (<section className="how" id="how-it-works">
    <h2>How it works</h2>
    <div className="steps">
      <img
        className="steps__arrows"
        src={asset("55a04.svg")}
        alt=""
        aria-hidden="true"
      />
      {steps.map((step) => (
        <article className="step" key={step.label}>
          {step.icon === "touch" ? (
            <TouchIcon />
          ) : (
            <img className="step__icon" src={asset(step.icon)} alt="" />
          )}
          <p>{step.label}</p>
        </article>
      ))}
    </div>
  </section>
  )
}

function Countdown({
  arrow = "cfaf0.svg",
  showBuy = true,
}: {
  arrow?: string
  showBuy?: boolean
}) {
  const drawdate = nextDraw.obj;
  const today = currentMonth.obj;
  const result = intervalToDuration({
    start: today,
    end: drawdate
  });
  const [remaining, setRemaining] = useState((result.days || 0) * 86400 + (result.hours || 0) * 3600 + (result.minutes || 0) * 60)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((current) => (current > 0 ? current - 60 : current))
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const values = [
    { value: Math.floor(remaining / 86400), label: "Days" },
    { value: Math.floor((remaining % 86400) / 3600), label: "Hours" },
    { value: Math.floor((remaining % 3600) / 60), label: "Minutes" },
  ]

  return (
    <section className="countdown" aria-label="Countdown to the next draw">
      <div
        className={`countdown__inner${showBuy ? "" : " countdown__inner--compact"
          }`}
      >
        <div className="countdown__clock">
          {values.map((item, index) => (
            <div className="countdown__unit-wrap" key={item.label}>
              {index > 0 && <span className="countdown__colon">:</span>}
              <div className="countdown__unit">
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </div>
            </div>
          ))}
        </div>
        <p>Till the next draw!</p>
        {showBuy && (
          <a className="countdown__link" href="/buy-lottery">
            Buy now <img src={asset(arrow)} alt="" />
          </a>
        )}
      </div>
    </section>
  )
}

function HomePage() {
  const [ticket, setTicket] = useState("")
  const [date, setDate] = useState(currentMonth.sqlformat)
  const [lookupMessage, setLookupMessage] = useState("")
  const [dbPrizes, setDbPrizes] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/draws/latest")
      .then((res) => res.json())
      .then((data) => setDbPrizes(data || []))
      .catch(console.error)
  }, [])

  async function checkLottery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = ticket.trim()
    if (!/^\d{6}$/.test(normalized)) {
      setLookupMessage("Enter a 6-digit lottery number.")
      return
    }

    try {
      const hasDate = /^\d{4}-\d{2}/.test(date)
      const { month, year } = parseMonthYear(date)
      let queryUrl = `/api/draws/check?number=${normalized}`

      if (hasDate) {
        queryUrl += `&month=${month}&year=${year}`
      }

      const response = await fetch(queryUrl)
      const match = await response.json()

      const monthYearLabel = hasDate ? formatMonthYear(month, year) : date

      setLookupMessage(
        match.winner
          ? `${normalized} won the ${match.PrizeType} — ${Number(
            match.PrizeAmount
          ).toLocaleString()} baht for the ${monthYearLabel} draw!`
          : `${normalized} was not a winning number for the ${monthYearLabel} draw.`
      )
    } catch (err) {
      setLookupMessage("Error checking ticket.")
    }
  }

  return (
    <div className="site-shell">
      <Header />

      <main>
        <section className="hero" id="buy">
          <div className="hero__inner">
            <div className="hero__copy">
              <h1>
                Could you be our <span>next winner?</span>
              </h1>
              <Button href="/buy-lottery">Buy now</Button>
            </div>
            <div className="hero__visual" aria-hidden="true">
              <img className="hero__ellipse" src={asset("3ebc8.svg")} alt="" />
              <img className="hero__art" src={asset("6d2d0.png")} alt="" />
            </div>
          </div>
        </section>

        <Countdown />

        <section className="results" id="results">
          <div className="section-heading">
            <h2>Latest Draw Results</h2>
            <p>Draw Date: {nextDraw.fullText}</p>
          </div>

          <form className="lookup-form" onSubmit={checkLottery}>
            <label>
              <span>Enter Your Number</span>
              <input
                inputMode="numeric"
                maxLength={6}
                placeholder="Lottery Number"
                value={ticket}
                onChange={(event) =>
                  setTicket(event.target.value.replace(/\D/g, ""))
                }
              />
            </label>
            <label>
              <span>Date</span>
              <span className="date-field">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="Draw date"
                />
                <span className="date-field__button" aria-hidden="true">
                  <img
                    className="date-field__ripple"
                    src={asset("ab911.svg")}
                    alt=""
                  />
                  <img
                    className="date-field__icon"
                    src={asset("34fbd.svg")}
                    alt=""
                  />
                </span>
              </span>
            </label>
            <div className="lookup-form__action">
              <Button type="submit">Check Lottery</Button>
            </div>
            <p className="lookup-message" aria-live="polite">
              {lookupMessage}
            </p>
          </form>

          <div className="prizes">
            {dbPrizes.map((prize, index) => (
              <article className="prize" key={prize.WinningNumber || index}>
                {index > 0 && (
                  <img
                    className="prize__divider"
                    src={asset("df010.svg")}
                    alt=""
                  />
                )}
                <strong>{prize.WinningNumber}</strong>
                <h3>{prize.PrizeType}</h3>
                <p>{Number(prize.PrizeAmount).toLocaleString()} baht prize</p>
              </article>
            ))}
          </div>
          <Button href="/results">See more</Button>
        </section>

        <How />
      </main>

      <Footer />
    </div>
  )
}

function ResultsPage() {
  const resultsParams = new URLSearchParams(window.location.search)
  const initialMonthParam = resultsParams.get("month")

  const [ticket, setTicket] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (!initialMonthParam) return currentMonth.monthYear
    const { month, year } = parseMonthYear(initialMonthParam)
    return formatMonthYear(month, year)
  })
  const [date, setDate] = useState(currentMonth.sqlformat)
  const [lookupMessage, setLookupMessage] = useState("")
  const [monthOpen, setMonthOpen] = useState(false)
  const [dbPrizes, setDbPrizes] = useState<any[]>([])

  const getMonthYearParams = (monthYearStr: string) => parseMonthYear(monthYearStr)

  useEffect(() => {
    const { month, year } = getMonthYearParams(selectedMonth)

    const formattedMonth = String(month).padStart(2, "0")
    setDate(`${year}-${formattedMonth}-01`)

    fetch(`/api/draws/historical?month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((data) => setDbPrizes(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [selectedMonth])

  function handleDateChange(newDateStr: string) {
    setDate(newDateStr)
    if (/^\d{4}-\d{2}/.test(newDateStr)) {
      const { month, year } = parseMonthYear(newDateStr)
      setSelectedMonth(formatMonthYear(month, year))
    }
  }

  async function checkLottery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = ticket.trim()
    if (!normalized || normalized.length !== 6 || [...normalized].some(char => char < '0' || char > '9')) {
      setLookupMessage("Enter a 6-digit lottery number.")
      return
    }

    const { month, year } = getMonthYearParams(selectedMonth)

    try {
      const response = await fetch(
        `/api/draws/check?number=${normalized}&month=${month}&year=${year}`
      )
      const match = await response.json()

      setLookupMessage(
        match.winner
          ? `${normalized} won the ${match.PrizeType} (${Number(match.PrizeAmount).toLocaleString()} baht) for the ${selectedMonth} draw!`
          : `${normalized} was not a winning number for the ${selectedMonth} draw.`
      )
    } catch (err) {
      setLookupMessage("Error checking ticket.")
    }
  }

  const topPrizes = dbPrizes.filter((p) => !p.PrizeType?.includes("Fourth"))
  const fourthPrizes = dbPrizes.filter((p) => p.PrizeType?.includes("Fourth"))

  return (
    <div className="site-shell results-page">
      <Header />

      <main>
        <section className="results-hero">
          <div className="results-hero__inner">
            <h1>Lottery Results</h1>
            <h2>Check Yours Now!</h2>
            <form
              className="lookup-form lookup-form--compact"
              onSubmit={checkLottery}
            >
              <label>
                <span>Enter Your Number</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Lottery Number"
                  value={ticket}
                  onChange={(event) =>
                    setTicket(event.target.value.replace(/\D/g, ""))
                  }
                />
              </label>
              <label>
                <span>Date</span>
                <span className="date-field">
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => handleDateChange(event.target.value)}
                    aria-label="Draw date"
                  />
                  <span className="date-field__button" aria-hidden="true">
                    <img
                      className="date-field__ripple"
                      src={asset("ab911.svg")}
                      alt=""
                    />
                    <img
                      className="date-field__icon"
                      src={asset("34fbd.svg")}
                      alt=""
                    />
                  </span>
                </span>
              </label>
              <div className="lookup-form__action">
                <Button type="submit">Check Lottery</Button>
              </div>
              <p className="lookup-message" aria-live="polite">
                {lookupMessage}
              </p>
            </form>
            <div className="results-hero__visual" aria-hidden="true">
              <img
                className="results-hero__ellipse"
                src={asset("3ebc8.svg")}
                alt=""
              />
              <div className="results-hero__artwork">
                <img
                  className="results-hero__person"
                  src={asset("6d2d0.png")}
                  alt=""
                />
                <img
                  className="results-hero__trophy"
                  src={asset("6567c.png")}
                  alt=""
                />
              </div>
            </div>
          </div>
        </section>

        <Countdown arrow="86be9.svg" />

        <section className="draw-results" id="results">
          <div className="draw-results__top">
            <div className="section-heading">
              <h2>Draw Results</h2>
              <p>Draw Date: {selectedMonth}</p>
            </div>
            <div className="month-picker">
              <div className="month-picker__label">
                <img src={asset("7f5eb.svg")} alt="" />
                <span>Draw Month</span>
              </div>
              <button
                className="month-picker__trigger"
                type="button"
                aria-expanded={monthOpen}
                onClick={() => setMonthOpen((open) => !open)}
              >
                <span>{selectedMonth}</span>
                <img src={asset("89504.svg")} alt="" />
              </button>
              {monthOpen && (
                <div className="month-picker__menu">
                  {drawMonths.map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(month)
                        setMonthOpen(false)
                        setLookupMessage("")
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="winning-panel">
            <h2>Winning Numbers for {selectedMonth} Draw</h2>
            <div className="winning-panel__top-prizes">
              {topPrizes.map((prize, index) => (
                <article
                  className="winning-card"
                  key={prize.WinningNumber || index}
                >
                  <h3>
                    {index + 1}
                    {index === 0 ? "st" : index === 1 ? "nd" : "rd"} Prize
                  </h3>
                  <p>{Number(prize.PrizeAmount).toLocaleString()} baht</p>
                  <strong>{prize.WinningNumber}</strong>
                </article>
              ))}
            </div>
            <article className="winning-card winning-card--fourth">
              <h3>4th Prize</h3>
              <p>2,000 baht per prize</p>
              <div className="fourth-prize-grid">
                {fourthPrizes.map((prize, idx) => (
                  <span key={prize.WinningNumber || idx}>
                    {prize.WinningNumber}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <How />
      </main>

      <Footer />
    </div>
  )
}

function ProfilePage() {
  const [winnings, setWinnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const storedUserId = localStorage.getItem("userId")

  useEffect(() => {
    if (!storedUserId) {
      setLoading(false)
      return
    }

    fetch(`/api/users/${storedUserId}/winnings`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWinnings(data)
        } else {
          setWinnings([])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError("Failed to load your winnings.")
        setLoading(false)
      })
  }, [storedUserId])

  return (
    <div className="site-shell profile-page">
      <Header className="header buy-header" />

      <main>
        <section className="cart-history">
          <div className="section-heading">
            <h2>Your Profile</h2>
            <p>Ticket Winnings &amp; Account Details</p>
          </div>

          <div className="cart-history__panel">
            {!storedUserId ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <h3 style={{ fontSize: "22px", marginBottom: "16px" }}>
                  Please log in to view your profile and winnings.
                </h3>
                <Button href="/login">Log in</Button>
              </div>
            ) : loading ? (
              <p style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                Loading your winnings...
              </p>
            ) : error ? (
              <p style={{ textAlign: "center", color: "#e53e3e", padding: "40px" }}>
                {error}
              </p>
            ) : (
              <div className="profile-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 600 }}>Your Ticket Winnings</h3>
                  <button
                    type="button"
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>

                {winnings.length === 0 ? (
                  <div
                    className="empty-winnings"
                    style={{
                      textAlign: "center",
                      padding: "48px 24px",
                      background: "#f9fafb",
                      borderRadius: "12px",
                      border: "1px dashed #cbd5e1",
                    }}
                  >

                    <h3 style={{ fontSize: "18px", marginBottom: "8px", color: "#1e293b" }}>
                      You have not won any lottery tickets yet.
                    </h3>
                    <p style={{ color: "#64748b", marginBottom: "20px" }}>
                      Keep playing for a chance to win up to 6 Million Baht!
                    </p>
                    <Button href="/buy-lottery">Buy Lottery Tickets</Button>
                  </div>
                ) : (
                  <div className="cart-month__tickets" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {winnings.map((win: any, idx: number) => (
                      <article className="cart-ticket" key={win.WinningsID || win.TicketID || idx}>
                        <div>
                          <h3 style={{ fontSize: "24px", letterSpacing: "2px", color: "#10b981" }}>
                            {win.TicketNumber || win.WinningNumber}
                          </h3>
                          <p style={{ marginTop: "4px", color: "#475569" }}>
                            {win.PrizeType} · Prize: THB {Number(win.PrizeAmount || win.Amount || 0).toLocaleString()}
                            {win.DrawDate && ` · Draw Date: ${new Date(win.DrawDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <img className="cart-ticket__divider" src={asset("cart-e0c8e.svg")} alt="" />
                        <span className="cart-ticket__status cart-ticket__status--completed">
                          WON
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <How />
      </main>

      <Footer />
    </div>
  )
}

function LoginPage() {
  const [loginMessage, setLoginMessage] = useState("")

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "")
    const password = String(formData.get("password") ?? "")

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()

    if (data.success) {
      localStorage.setItem("userId", String(data.userId))
      localStorage.setItem("userRole", data.role)

      if (data.role === "Admin") window.location.assign("/admin")
      else window.location.assign("/")
    } else {
      setLoginMessage(data.message || "Invalid username or password.")
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <Logo />
      </header>

      <main className="login-layout">
        <section className="login-benefits">
          <div className="login-benefits__content">
            <h1>
              <span>Pick your numbers, </span>
              buy your ticket, and watch the draw.
            </h1>
            <ul>
              {[
                "Choose your own six numbers or quick pick them in one tap. buying a ticket takes under a minute.",
                "Get an email the moment results are posted, so you never have to come back and check.",
                "See every past draw's winning numbers archived in one place.",
                "Every ticket and payment is stored securely, and your personal details are never shared or sold.",
              ].map((benefit) => (
                <li key={benefit}>
                  <img src={asset("c2117.svg")} alt="" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <p className="login-benefits__help">
              Have questions? Visit our <a href="#help">Help Center</a> or reach
              out to our <a href="#support">Support Team</a>
            </p>
          </div>
        </section>

        <section className="login-form-panel" aria-labelledby="sign-in-title">
          <div className="login-form-panel__inner">
            <div className="login-form-panel__heading">
              <h2 id="sign-in-title">Sign in</h2>
              <p>Enter your login details to sign in</p>
            </div>

            <form className="sign-in-form" onSubmit={handleLogin}>
              <label>
                <span>Username or email</span>
                <span className="auth-input">
                  <img src={asset("1d21e.svg")} alt="" />
                  <input
                    type="text"
                    name="username"
                    placeholder="example@gmail.com"
                    autoComplete="username"
                    required
                  />
                </span>
              </label>
              <label>
                <span>Password</span>
                <span className="auth-input">
                  <img src={asset("dc44a.svg")} alt="" />
                  <input
                    type="password"
                    name="password"
                    placeholder="● ● ● ● ● ●"
                    autoComplete="current-password"
                    required
                  />
                </span>
              </label>

              <div className="sign-in-form__options">
                <label className="remember-me">
                  <input type="checkbox" name="remember" />
                  <span>Remember me</span>
                </label>
                <a href="#forgot-password">Forgot Password?</a>
              </div>

              <button className="sign-in-form__submit" type="submit">
                Sign in
              </button>
              <p className="login-form-message" aria-live="polite">
                {loginMessage}
              </p>
            </form>

            <p className="sign-up-prompt">
              Don’t have an account yet? <a href="/register">Sign up</a>
            </p>

            <div className="auth-divider">
              <img src={asset("95080.svg")} alt="" />
              <span>Or continue with</span>
              <img src={asset("95080.svg")} alt="" />
            </div>

            <button
              className="google-sign-in"
              type="button"
              onClick={() =>
                setLoginMessage(
                  "Google sign-in is ready to be connected to authentication."
                )
              }
            >
              <img src={asset("08fff.svg")} alt="" />
              <span>Sign in with Google</span>
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function RegisterPage() {
  const [registerMessage, setRegisterMessage] = useState("")

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      window.location.assign("/login")
    } else {
      setRegisterMessage("Registration failed.")
    }
  }

  return (
    <div className="login-page register-page">
      <header className="login-header">
        <Logo />
      </header>

      <main className="login-layout">
        <section className="login-benefits">
          <div className="login-benefits__content">
            <h1>
              <span>Pick your numbers, </span>
              buy your ticket, and watch the draw.
            </h1>
            <ul>
              {[
                "Choose your own six numbers or quick pick them in one tap. buying a ticket takes under a minute.",
                "Get an email the moment results are posted, so you never have to come back and check.",
                "See every past draw's winning numbers archived in one place.",
                "Every ticket and payment is stored securely, and your personal details are never shared or sold.",
              ].map((benefit) => (
                <li key={benefit}>
                  <img src={asset("e6a88.svg")} alt="" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <p className="login-benefits__help">
              Have questions? Visit our <a href="#help">Help Center</a> or reach
              out to our <a href="#support">Support Team</a>
            </p>
          </div>
        </section>

        <section
          className="login-form-panel register-form-panel"
          aria-labelledby="register-title"
        >
          <div className="login-form-panel__inner">
            <div className="login-form-panel__heading">
              <h2 id="register-title">Create an account</h2>
            </div>

            <form
              className="sign-in-form register-form"
              onSubmit={handleRegister}
            >
              <div className="register-form__names">
                <label>
                  <span>First Name</span>
                  <span className="auth-input">
                    <img src={asset("07ba9.svg")} alt="" />
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      autoComplete="given-name"
                      required
                    />
                  </span>
                </label>
                <label>
                  <span>Last Name</span>
                  <span className="auth-input">
                    <img src={asset("07ba9.svg")} alt="" />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      autoComplete="family-name"
                      required
                    />
                  </span>
                </label>
              </div>

              <label>
                <span>Phone</span>
                <span className="auth-input">
                  <img src={asset("a9f4e.svg")} alt="" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+66"
                    autoComplete="tel"
                    required
                  />
                </span>
              </label>

              <label>
                <span>Email</span>
                <span className="auth-input">
                  <img src={asset("e5123.svg")} alt="" />
                  <input
                    type="email"
                    name="email"
                    placeholder="example@gmail.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <label>
                <span>Password</span>
                <span className="auth-input">
                  <img src={asset("3e466.svg")} alt="" />
                  <input
                    type="password"
                    name="password"
                    placeholder="● ● ● ● ● ●"
                    autoComplete="new-password"
                    required
                  />
                </span>
              </label>

              <div className="register-form__remember">
                <label className="remember-me">
                  <input type="checkbox" name="remember" />
                  <span>Remember me</span>
                </label>
              </div>

              <button className="sign-in-form__submit" type="submit">
                Create
              </button>
              <p className="login-form-message" aria-live="polite">
                {registerMessage}
              </p>
            </form>

            <div className="auth-divider">
              <img src={asset("95080.svg")} alt="" />
              <span>Or continue with</span>
              <img src={asset("95080.svg")} alt="" />
            </div>

            <button
              className="google-sign-in"
              type="button"
              onClick={() =>
                setRegisterMessage(
                  "Google registration is ready to be connected to authentication."
                )
              }
            >
              <img src={asset("08fff.svg")} alt="" />
              <span>Sign in with Google</span>
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function BuyLotteryPage() {
  const [quickNumbers, setQuickNumbers] = useState([6, 0, 7, 1, 9, 2])
  const [customNumbers, setCustomNumbers] = useState([
    "8",
    "3",
    "7",
    "6",
    "8",
    "6",
  ])
  const [ticketMessage, setTicketMessage] = useState("")
  const [activeDraw, setActiveDraw] = useState<{
    DrawID: number
    DrawDate: string
  } | null>(null)
  const activeDrawId = activeDraw?.DrawID ?? null

  // Ask the API which draw is currently open (and when it is), instead of guessing from the clock
  useEffect(() => {
    fetch("/api/draws/current")
      .then((res) => (res.ok ? res.json() : null))
      .then((draw) => setActiveDraw(draw ?? null))
      .catch(() => setActiveDraw(null))
  }, [])

  const openDrawDate = activeDraw ? new Date(activeDraw.DrawDate) : null
  const ticketCardInfo = openDrawDate
    ? `${format(openDrawDate, "MMMM")} draw · draws ${format(openDrawDate, "d MMM")}, ${format(openDrawDate, "h:mmaaa")} · THB 100.00 per ticket`
    : "No draw is open for sales right now · THB 100.00 per ticket"

  function randomize() {
    setQuickNumbers(
      Array.from({ length: 6 }, () => Math.floor(Math.random() * 10))
    )
    setTicketMessage("")
  }

  function updateCustomNumber(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    setCustomNumbers((current) =>
      current.map((number, itemIndex) =>
        itemIndex === index ? digit : number
      )
    )
    setTicketMessage("")
  }

  async function buyTicket(type: "quick" | "custom") {
    const numbers =
      type === "quick" ? quickNumbers.join("") : customNumbers.join("")
    if (numbers.length !== 6) {
      setTicketMessage("Choose all 6 numbers before buying your ticket.")
      return
    }
    if (activeDrawId === null) {
      setTicketMessage("No draw is open for sales right now. Please check back soon.")
      return
    }

    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      setTicketMessage("Please log in to add tickets to your cart.")
      return
    }

    try {
      const res = await fetch("/api/cart-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(storedUserId),
          drawId: activeDrawId,
          ticketNumber: numbers,
          quantity: 1,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        window.location.assign("/checkout")
      } else {
        setTicketMessage(data.message || "Could not add the ticket to your cart.")
      }
    } catch {
      setTicketMessage("Could not add the ticket to your cart.")
    }
  }

  return (
    <div className="site-shell buy-page">
      <Header className="header buy-header" />

      <main>
        <section className="buy-hero">
          <div className="hero__inner">
            <h1>Get a chance to win 6 Million Bahts!</h1>
            <div className="hero__visual" aria-hidden="true">
              <img className="hero__ellipse" src={asset("3ebc8.svg")} alt="" />
              <img className="hero__art" src={asset("6d2d0.png")} alt="" />
            </div>
          </div>
        </section>

        <Countdown />

        <section className="buy-tickets">
          <div className="section-heading">
            <h2>Buy Tickets</h2>
            <p>
              Draw Date:{" "}
              {openDrawDate ? format(openDrawDate, "d MMMM yyyy") : "No draw open"}
            </p>
          </div>

          <div className="buy-tickets__panel">
            <div className="pick-methods">
              <article className="pick-method">
                <span className="pick-method__shuffle" aria-hidden="true">
                  ⇄
                </span>
                <h3>Quick Pick</h3>
                <p>
                  We randomly generate 6 numbers for you. Fastest way to pick a
                  number for your ticket.
                </p>
              </article>
              <article className="pick-method">
                <img src={asset("79c26.svg")} alt="" />
                <h3>Choose your own number</h3>
                <p>
                  Pick your own 6 numbers from 0 to 9. Good if you&apos;ve got
                  lucky numbers you always play.
                </p>
              </article>
            </div>

            <div className="ticket-options">
              <article className="ticket-card">
                <div className="ticket-card__heading">
                  <h3>Buy a ticket</h3>
                  <p>{ticketCardInfo}</p>
                </div>
                <div className="ticket-tabs">
                  <span className="ticket-tabs__active">Quick pick</span>
                  <span>Choose my own</span>
                </div>
                <div className="quick-pick">
                  <div className="quick-pick__numbers">
                    {quickNumbers.map((number, index) => (
                      <span key={`${number}-${index}`}>{number}</span>
                    ))}
                  </div>
                  <div className="ticket-selection-meta">
                    <span>Randomly generated for you</span>
                    <button type="button" onClick={randomize}>
                      Randomize again
                    </button>
                  </div>
                </div>
                <div className="ticket-card__total">
                  <div>
                    <small>Total</small>
                    <strong>THB 100.00</strong>
                  </div>
                  <button type="button" onClick={() => buyTicket("quick")}>
                    Buy ticket
                  </button>
                </div>
              </article>

              <article className="ticket-card">
                <div className="ticket-card__heading">
                  <h3>Buy a ticket</h3>
                  <p>{ticketCardInfo}</p>
                </div>
                <div className="ticket-tabs">
                  <span>Quick pick</span>
                  <span className="ticket-tabs__active">Choose my own</span>
                </div>
                <div className="custom-pick">
                  <div className="custom-pick__inputs">
                    {customNumbers.map((number, index) => (
                      <span className="custom-pick__input-wrap" key={index}>
                        {index > 0 && <i>-</i>}
                        <input
                          aria-label={`Lottery digit ${index + 1}`}
                          inputMode="numeric"
                          maxLength={1}
                          value={number}
                          onChange={(event) =>
                            updateCustomNumber(index, event.target.value)
                          }
                        />
                      </span>
                    ))}
                  </div>
                  <div className="ticket-selection-meta">
                    <span>
                      {customNumbers.filter(Boolean).length} of 6 chosen
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomNumbers(["", "", "", "", "", ""])
                        setTicketMessage("")
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="ticket-card__total">
                  <div>
                    <small>Total</small>
                    <strong>THB 100.00</strong>
                  </div>
                  <button type="button" onClick={() => buyTicket("custom")}>
                    Buy ticket
                  </button>
                </div>
              </article>
            </div>
            <p className="ticket-message" aria-live="polite">
              {ticketMessage}
            </p>
          </div>
        </section>

        <How />
      </main>

      <Footer />
    </div>
  )
}

function CartPage() {
  const [openMonths, setOpenMonths] = useState(() => new Set<string>())
  const [groupedCart, setGroupedCart] = useState<any[]>([])
  const [isNotLoggedIn, setIsNotLoggedIn] = useState(false)

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")

    if (!storedUserId) {
      setIsNotLoggedIn(true)
      return
    }

    fetch(`/api/cart/${storedUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        const groups = data.reduce((acc: any, row: any) => {
          const date = new Date(row.DrawDate)
          const monthKey = `${date.toLocaleString("en-US", {
            month: "long",
          })} ${date.getFullYear()}`
          if (!acc[monthKey]) acc[monthKey] = { month: monthKey, tickets: [] }
          acc[monthKey].tickets.push({
            id: row.TicketID,
            number: row.TicketNumber,
            details: `Quantity: ${row.Quantity} · Drawing ${date.toLocaleDateString()}`,
            status: "Pending",
          })
          return acc
        }, {})
        setGroupedCart(Object.values(groups))
      })
      .catch(console.error)
  }, [])

  function toggleMonth(month: string) {
    setOpenMonths((current) => {
      const next = new Set(current)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  return (
    <div className="site-shell cart-page">
      <Header className="header buy-header cart-header" />

      <main>
        <Countdown showBuy={false} />

        <section className="cart-history">
          <div className="section-heading">
            <h2>Your Tickets</h2>
            <p>Results &amp; History</p>
          </div>

          <div className="cart-history__panel">
            {isNotLoggedIn ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <h3 style={{ fontSize: "22px", marginBottom: "16px" }}>
                  Please log in first to view your purchased tickets.
                </h3>
                <Button href="/login">Log in</Button>
              </div>
            ) : (
              <div className="cart-accordion">
                {groupedCart.map((group) => {
                  const isOpen = openMonths.has(group.month)
                  return (
                    <section className="cart-month" key={group.month}>
                      <button
                        className="cart-month__toggle"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleMonth(group.month)}
                      >
                        <span>Draw Month: {group.month}</span>
                        <img
                          src={asset(
                            isOpen && group.closeIcon
                              ? group.closeIcon
                              : "cart-02071.svg"
                          )}
                          alt=""
                        />
                      </button>
                      {isOpen && (
                        <div className="cart-month__content">
                          {group.summary && <p>{group.summary}</p>}
                          <div className="cart-month__tickets">
                            {group.tickets.map((ticket: any) => (
                              <article className="cart-ticket" key={ticket.id}>
                                <div>
                                  <h3>{ticket.number}</h3>
                                  <p>{ticket.details}</p>
                                </div>
                                <img
                                  className="cart-ticket__divider"
                                  src={asset("cart-e0c8e.svg")}
                                  alt=""
                                />
                                <span
                                  className={`cart-ticket__status cart-ticket__status--${ticket.status.toLowerCase()}`}
                                >
                                  {ticket.status}
                                </span>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}
                      <img
                        className="cart-month__line"
                        src={asset(group.lineIcon || "cart-3ffd1.svg")}
                        alt=""
                      />
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <How />
      </main>

      <Footer />
    </div>
  )
}

type CartItem = {
  CartItemID: number
  Quantity: number
  DrawID: number
  TicketNumber: string
  AvailableQuantity: number
  DrawDate: string
  DrawStatus: string
}

const MAX_CART_QUANTITY = 5 // same limit as the CartItem table in the database

// Something that will make checkout fail, so we can warn about it before the user tries
function cartItemProblem(item: CartItem) {
  if (item.DrawStatus !== "Pending") {
    return "This draw is closed for sales. Remove this ticket to continue."
  }
  if (item.Quantity > item.AvailableQuantity) {
    return `Only ${item.AvailableQuantity} left. Lower the quantity to continue.`
  }
  return ""
}

function CheckoutPage() {
  // The cart is stored in the database (CartItem table), so it survives refreshes and other devices
  const storedUserId = localStorage.getItem("userId")
  const [items, setItems] = useState<CartItem[]>([])
  const [loadingCart, setLoadingCart] = useState(true)
  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [checkoutMessage, setCheckoutMessage] = useState("")

  function loadCart() {
    if (!storedUserId) {
      setLoadingCart(false)
      return
    }
    fetch(`/api/cart-items/${storedUserId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setCheckoutMessage("Could not load your cart."))
      .finally(() => setLoadingCart(false))
  }

  useEffect(loadCart, [storedUserId])

  // Prices come from the server, so what is shown here is what gets charged
  const [pricing, setPricing] = useState({
    pricePerTicket: 100,
    discountMinQuantity: 3,
    discountRate: 0.1,
  })

  function loadPricing() {
    fetch("/api/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPricing(data)
      })
      .catch(console.error)
  }

  useEffect(loadPricing, [])

  const subtotal = items.reduce(
    (sum, item) => sum + item.Quantity * pricing.pricePerTicket,
    0
  )
  const totalQuantity = items.reduce((sum, item) => sum + item.Quantity, 0)
  const discountRate =
    totalQuantity >= pricing.discountMinQuantity ? pricing.discountRate : 0
  const discount = Math.round(subtotal * discountRate * 100) / 100
  const total = Math.round((subtotal - discount) * 100) / 100

  const problemItem = items.find((item) => cartItemProblem(item) !== "")
  const problemMessage = problemItem
    ? `Ticket ${problemItem.TicketNumber}: ${cartItemProblem(problemItem)}`
    : ""

  // + / - buttons: saved in the database, then shown
  async function changeQuantity(item: CartItem, amount: number) {
    const next = item.Quantity + amount
    if (busyItemId !== null || next < 1) return

    const limit = Math.min(MAX_CART_QUANTITY, item.AvailableQuantity)
    if (next > limit) {
      setCheckoutMessage(
        `You can have at most ${limit} of ticket ${item.TicketNumber}.`
      )
      return
    }

    setBusyItemId(item.CartItemID)
    try {
      const res = await fetch(`/api/cart-items/${item.CartItemID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(storedUserId), quantity: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setItems((current) =>
          current.map((i) =>
            i.CartItemID === item.CartItemID ? { ...i, Quantity: next } : i
          )
        )
        setCheckoutMessage("")
      } else {
        setCheckoutMessage(data.message || "Could not update the quantity.")
        if (res.status === 404) loadCart() // the item was removed elsewhere
      }
    } catch {
      setCheckoutMessage("Could not update the quantity.")
    } finally {
      setBusyItemId(null)
    }
  }

  // bin button: deletes the row from the database
  async function removeItem(item: CartItem) {
    if (busyItemId !== null) return

    setBusyItemId(item.CartItemID)
    try {
      const res = await fetch(
        `/api/cart-items/${item.CartItemID}?userId=${storedUserId}`,
        { method: "DELETE" }
      )
      if (res.ok || res.status === 404) {
        // 404 = already gone, which is what the user wanted anyway
        setItems((current) =>
          current.filter((i) => i.CartItemID !== item.CartItemID)
        )
        setCheckoutMessage("")
      } else {
        const data = await res.json().catch(() => ({}))
        setCheckoutMessage(data.message || "Could not remove the ticket.")
      }
    } catch {
      setCheckoutMessage("Could not remove the ticket.")
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleCheckout() {
    if (items.length === 0) return

    if (!storedUserId) {
      setCheckoutMessage("Please log in first to complete your purchase.")
      return
    }

    try {
      // No items are sent: the server buys what is in the CartItem table
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(storedUserId),
          totalAmount: total,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        window.location.assign("/cart")
      } else {
        if (response.status === 409) loadPricing() // price changed on the server: refresh what we show
        loadCart() // stock may have changed: refresh what we show
        setCheckoutMessage(data.message || "Checkout failed. Please try again.")
      }
    } catch (error) {
      setCheckoutMessage("An error occurred during checkout.")
    }
  }

  return (
    <div className="site-shell checkout-page">
      <Header className="header buy-header cart-header" />

      <main>
        <Countdown showBuy={false} />

        <section className="checkout-cart">
          <div className="section-heading">
            <h2>Your Cart</h2>
            <p>Proceed to Checkout within 15 minutes</p>
          </div>

          <div className="checkout-cart__panel">
            <div className="checkout-grid">
              <div className="checkout-items">
                {!storedUserId ? (
                  <p className="checkout-empty">
                    Please <a href="/login">log in</a> to see your cart.
                  </p>
                ) : loadingCart ? (
                  <p className="checkout-empty">Loading your cart...</p>
                ) : items.length === 0 ? (
                  <p className="checkout-empty">
                    Your cart is empty. <a href="/buy-lottery">Buy a ticket</a>
                  </p>
                ) : (
                  items.map((item, index) => (
                    <article className="checkout-item" key={item.CartItemID}>
                      <div className="checkout-item__image">
                        <img
                          src={asset("checkout-6305f.png")}
                          alt="Lottery ticket"
                        />
                      </div>
                      <div className="checkout-item__details">
                        <div>
                          <h3>Ticket Prize (THB {pricing.pricePerTicket.toFixed(2)})</h3>
                          <p
                            className={
                              cartItemProblem(item) ? "checkout-item__note" : undefined
                            }
                          >
                            Ticket {item.TicketNumber} · Draw{" "}
                            {new Date(item.DrawDate).toLocaleDateString()}
                          </p>
                        </div>
                        <strong>THB {item.Quantity * pricing.pricePerTicket}</strong>
                      </div>
                      <div className="checkout-item__actions">
                        <button
                          className="checkout-item__remove"
                          type="button"
                          aria-label={`Remove ticket ${item.TicketNumber}`}
                          disabled={busyItemId !== null}
                          onClick={() => removeItem(item)}
                        >
                          <img src={asset("checkout-d8a74.svg")} alt="" />
                        </button>
                        <div className="quantity-control">
                          <button
                            type="button"
                            aria-label={`Decrease ticket ${item.TicketNumber} quantity`}
                            disabled={busyItemId !== null}
                            onClick={() => changeQuantity(item, -1)}
                          >
                            <img src={asset("checkout-af48a.svg")} alt="" />
                          </button>
                          <span>{item.Quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ticket ${item.TicketNumber} quantity`}
                            disabled={busyItemId !== null}
                            onClick={() => changeQuantity(item, 1)}
                          >
                            <img src={asset("checkout-acf6e.svg")} alt="" />
                          </button>
                        </div>
                      </div>
                      {index < items.length - 1 && (
                        <img
                          className="checkout-item__line"
                          src={asset("checkout-ff140.svg")}
                          alt=""
                        />
                      )}
                    </article>
                  ))
                )}
              </div>

              <aside className="order-summary">
                <h2>Order Summary</h2>
                <div className="order-summary__rows">
                  <p>
                    <span>Subtotal</span>
                    <strong>THB {subtotal}</strong>
                  </p>
                  <p>
                    <span>{Math.round(pricing.discountRate * 100)}% Multi-Draw discount</span>
                    <strong className="discount">-THB {discount}</strong>
                  </p>
                  <img src={asset("checkout-c34bd.svg")} alt="" />
                  <p className="order-summary__total">
                    <span>Total</span>
                    <strong>THB {total}</strong>
                  </p>
                </div>
                <div className="promo-form">
                  <label>
                    <img src={asset("checkout-72fbe.svg")} alt="" />
                    <input
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      placeholder="Add promo code"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckoutMessage(
                        promoCode.trim()
                          ? `Promo code ${promoCode.trim()} applied.`
                          : "Enter a promo code first."
                      )
                    }
                  >
                    Apply
                  </button>
                </div>
                <button
                  className="checkout-submit"
                  type="button"
                  disabled={items.length === 0 || problemItem !== undefined || busyItemId !== null}
                  onClick={handleCheckout}
                >
                  Go to Checkout
                  <img src={asset("checkout-efdea.svg")} alt="" />
                </button>
                <p className="checkout-message" aria-live="polite">
                  {checkoutMessage || problemMessage}
                </p>
              </aside>
            </div>
          </div>
        </section>

        <How />
      </main>

      <Footer />
    </div>
  )
}


type DashboardData = {
  totalUsers: number
  totalSales: number
  totalTickets: number
  draws: any[]
}

// Loads the numbers of the admin dashboard. Used by the dashboard AND the draw page,
// so both always show the same figures.
function useAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalSales: 0,
    totalTickets: 0,
    draws: [],
  })

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((data) =>
        setDashboardData({
          totalUsers: data.totalUsers ?? 0,
          totalSales: data.totalSales ?? 0,
          totalTickets: data.totalTickets ?? 0,
          draws: data.draws ?? [],
        })
      )
      .catch(console.error)
  }, [])

  return [dashboardData, setDashboardData] as const
}

const secondsToNextDraw = () =>
  Math.max(0, differenceInSeconds(nextDraw.obj, new Date()))

// How much a figure went up or down compared with the previous draw (null = nothing to compare with)
type Trend = { percent: number } | null

function trendBetween(current: number, previous: number | undefined): Trend {
  if (previous === undefined || previous <= 0) return null
  return { percent: Math.round(((current - previous) / previous) * 1000) / 10 }
}

function MetricTrend({ trend }: { trend: Trend }) {
  if (!trend) return null
  const up = trend.percent >= 0
  return (
    <div
      className={`admin-metric__trend admin-metric__trend--${up ? "up" : "down"}`}
    >
      <img src={asset(up ? "admin-870db.svg" : "admin-0c4c4.svg")} alt="" />
      <span>
        {trend.percent === 0 ? (
          "No change from last draw"
        ) : (
          <>
            <b>
              {Math.abs(trend.percent).toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}
              %
            </b>{" "}
            {up ? "Up" : "Down"} from last draw
          </>
        )}
      </span>
    </div>
  )
}

// The four metrics at the top of the admin dashboard and the draw page.
// Dashboard: totals for the whole app. Draw page: pass labels + trends for the one draw.
function AdminMetrics({
  totalUsers,
  totalTickets,
  totalSales,
  labels = { users: "Total Users", tickets: "Total Tickets", sales: "Total Sales" },
  trends,
}: {
  totalUsers: number
  totalTickets: number
  totalSales: number
  labels?: { users: string; tickets: string; sales: string }
  trends?: { users: Trend; tickets: Trend; sales: Trend }
}) {
  const [secondsLeft, setSecondsLeft] = useState(secondsToNextDraw)

  useEffect(() => {
    const timer = window.setInterval(
      () => setSecondsLeft(secondsToNextDraw()),
      60000
    )
    return () => window.clearInterval(timer)
  }, [])

  const timeLeft = [
    [String(Math.floor(secondsLeft / 86400)), "Days"],
    [String(Math.floor((secondsLeft % 86400) / 3600)), "Hours"],
    [String(Math.floor((secondsLeft % 3600) / 60)), "Minutes"],
  ]

  return (
    <div className="admin-metrics">
      <article className="admin-metric">
        <p>{labels.users}</p>
        <strong>{Number(totalUsers).toLocaleString()}</strong>
        <img
          className="admin-metric__icon"
          src={asset("admin-b5e7d.svg")}
          alt=""
        />
        {trends ? (
          <MetricTrend trend={trends.users} />
        ) : (
          <div className="admin-metric__trend admin-metric__trend--up">
            <img src={asset("admin-870db.svg")} alt="" />
            <span>
              <b>8.5%</b> Up from yesterday
            </span>
          </div>
        )}
      </article>
      <article className="admin-metric">
        <p>{labels.tickets}</p>
        <strong>{Number(totalTickets).toLocaleString()}</strong>
        <img
          className="admin-metric__icon"
          src={asset("admin-8d550.svg")}
          alt=""
        />
        {trends ? (
          <MetricTrend trend={trends.tickets} />
        ) : (
          <div className="admin-metric__trend admin-metric__trend--up">
            <img src={asset("admin-870db.svg")} alt="" />
            <span>
              <b>1.3%</b> Up from past week
            </span>
          </div>
        )}
      </article>
      <article className="admin-metric">
        <p>{labels.sales}</p>
        <strong>THB {Number(totalSales).toLocaleString()}</strong>
        <img
          className="admin-metric__icon"
          src={asset("admin-f45fc.svg")}
          alt=""
        />
        {trends ? (
          <MetricTrend trend={trends.sales} />
        ) : (
          <div className="admin-metric__trend admin-metric__trend--down">
            <img src={asset("admin-0c4c4.svg")} alt="" />
            <span>
              <b>4.3%</b> Down from last month
            </span>
          </div>
        )}
      </article>
      <article className="admin-metric admin-metric--time">
        <p>Time remaining</p>
        <div className="admin-mini-countdown">
          {timeLeft.map(([value, label], index) => (
            <span className="admin-mini-countdown__wrap" key={label}>
              {index > 0 && <i>:</i>}
              <span className="admin-mini-countdown__unit">
                <b>{value}</b>
                <small>{label}</small>
              </span>
            </span>
          ))}
        </div>
      </article>
    </div>
  )
}


function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useAdminDashboard()
  const [adminMessage, setAdminMessage] = useState("")


  async function closeDraw(drawId: number) {
    setAdminMessage("")
    try {
      const res = await fetch(`/api/admin/draws/${drawId}/close`, { method: "PUT" })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setDashboardData((prev) => ({
          ...prev,
          draws: prev.draws.map((d) =>
            d.DrawID === drawId ? { ...d, DrawStatus: "Closed" } : d
          ),
        }))
      } else {
        setAdminMessage(data.message || "Could not close the draw.")
      }
    } catch {
      setAdminMessage("Could not reach the server. The draw was not closed.")
    }
  }

  async function addDraw() {
    setAdminMessage("")
    const newDate = nextDraw.sqlformat
    try {
      const res = await fetch("/api/admin/draws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawDate: newDate }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setDashboardData((prev) => ({
          ...prev,
          draws: [
            {
              DrawID: data.drawId,
              DrawDate: newDate,
              DrawStatus: "Pending",
              TicketSold: 0,
            },
            ...prev.draws,
          ],
        }))
      } else {
        setAdminMessage(data.message || "Could not add the draw.")
      }
    } catch {
      setAdminMessage("Could not reach the server. The draw was not added.")
    }
  }

  return (
    <div className="site-shell admin-page">
      <Header className="header buy-header" />

      <main>
        <section className="admin-heading">
          <h1>Dashboard</h1>
          <p>Welcome, admin!</p>
        </section>

        <section className="admin-content">
          <AdminMetrics
            totalUsers={dashboardData.totalUsers}
            totalTickets={dashboardData.totalTickets}
            totalSales={dashboardData.totalSales}
          />

          <section className="manage-draws">
            <div className="manage-draws__heading">
              <div>
                <h2>Manage Draws</h2>
                <p>Draw details</p>
              </div>
              <button type="button" onClick={addDraw}>
                New Draw
              </button>
            </div>
            {adminMessage && (
              <p className="admin-message" role="alert">
                {adminMessage}
              </p>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Draw</th>
                    <th>Closes</th>
                    <th>Tickets Sold</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.draws.map((draw: any, index: number) => {
                    const status = (
                      draw.DrawStatus ||
                      draw.status ||
                      "Pending"
                    ).toLowerCase()
                    const drawName =
                      draw.DrawID ?? draw.draw ?? `Draw #${index + 1}`
                    const closesText =
                      draw.DrawDate ?? draw.closes ?? "N/a"
                    const ticketsText =
                      draw.TicketSold ?? draw.tickets ?? "0"

                    return (
                      <tr key={draw.DrawID || index}>
                        <td>{drawName}</td>
                        <td>{closesText}</td>
                        <td>{ticketsText}</td>
                        <td
                          className={`admin-status admin-status--${status}`}
                        >
                          {status}
                        </td>
                        <td>
                          {status === "pending" ? (
                            <button
                              className="admin-action admin-action--close"
                              type="button"
                              onClick={() => closeDraw(draw.DrawID)}
                            >
                              Close Draw
                            </button>
                          ) : status === "closed" ? (
                            <a
                              className="admin-action admin-action--run-ready"
                              href={`/admin/draw?draw=${encodeURIComponent(
                                drawName
                              )}&drawId=${draw.DrawID}&date=${encodeURIComponent(
                                closesText
                              )}`}
                            >
                              Run Draw
                            </a>
                          ) : status === "completed" ? (
                            <a
                              className="admin-action"
                              href={`/results?month=${encodeURIComponent(
                                closesText
                              )}`}
                            >
                              Results
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  )
}

type DrawStats = { usersEntered: number; ticketsSold: number; sales: number }

function AdminDrawPage() {
  // figures for THIS draw, and for the draw before it (to show the change)
  const [drawStats, setDrawStats] = useState<{
    current: DrawStats
    previous: DrawStats | null
  } | null>(null)
  const [drawNumber, setDrawNumber] = useState("000000")
  const [rollCount, setRollCount] = useState(1)
  const [dbWinningRows, setDbWinningRows] = useState<any[]>([])
  const [rolling, setRolling] = useState(false)
  const [drawMessage, setDrawMessage] = useState("")

  const drawParams = new URLSearchParams(window.location.search)
  const requestedDraw = drawParams.get("draw") ?? "Current Draw"
  // No default: if the link has no drawId we must not guess which draw to write prizes into
  const drawId = drawParams.get("drawId")
  const drawDateRaw = drawParams.get("date") ?? ""

  const formatMonthYearFromDate = (rawDate: string) => {
    if (!rawDate) return currentMonth.monthYear
    const { month, year } = parseMonthYear(rawDate)
    return formatMonthYear(month, year)
  }

  const targetMonthYear = formatMonthYearFromDate(drawDateRaw)

  const prizeNames = [
    "First Prize",
    "Second Prize",
    "Third Prize",
  ]

  useEffect(() => {
    if (!drawId) return
    fetch(`/api/draws/historical?drawId=${encodeURIComponent(drawId)}`)
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : []
        setDbWinningRows(rows)
        setRollCount(rows.length + 1)
        if (rows.length > 0) {
          setDrawNumber(rows[rows.length - 1].WinningNumber || "000000")
        }
      })
      .catch(console.error)
  }, [drawId])

  useEffect(() => {
    if (!drawId) return
    fetch(`/api/admin/draws/${encodeURIComponent(drawId)}/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDrawStats(data))
      .catch(console.error)
  }, [drawId])

  const thisDraw = drawStats?.current
  const lastDraw = drawStats?.previous ?? undefined

  async function rollNumber() {
    if (rolling) return

    if (rollCount > 13) {
      window.location.assign(`/results?month=${encodeURIComponent(targetMonthYear)}`)
      return
    }

    const nextNumber = String(Math.floor(Math.random() * 1_000_000)).padStart(
      6,
      "0"
    )
    const currentPrizeName =
      rollCount <= 3
        ? prizeNames[rollCount - 1]
        : `Fourth Prize ${rollCount - 3}`

    setRolling(true)
    setDrawMessage("")
    try {
      // The server checks the draw is closed, picks the prize amount and keeps the order
      const res = await fetch("/api/admin/draws/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawId: Number(drawId),
          prizeType: currentPrizeName,
          winningNumber: nextNumber,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.success) {
        // only show the number once it is really saved
        setDrawNumber(nextNumber)
        setDbWinningRows((prev) => [
          ...prev,
          {
            PrizeType: currentPrizeName,
            WinningNumber: nextNumber,
            ticketId: "N/A",
            quantity: 0,
          },
        ])
        setRollCount((current) => current + 1)
      } else {
        setDrawMessage(data.message || "This number could not be saved. Roll again.")
      }
    } catch {
      setDrawMessage("Could not reach the server. This number was not saved. Roll again.")
    } finally {
      setRolling(false)
    }
  }

  if (!drawId) {
    return (
      <div className="site-shell admin-draw-page">
        <Header className="header buy-header" />
        <main>
          <section className="admin-heading admin-draw-heading">
            <h1>Ticket Draws</h1>
            <p>No draw selected</p>
          </section>
          <section className="admin-content">
            <p>
              Open a closed draw from the dashboard and press &quot;Run Draw&quot;.
            </p>
            <Button href="/admin">Back to dashboard</Button>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="site-shell admin-draw-page">
      <Header className="header buy-header" />

      <main>
        <section className="admin-heading admin-draw-heading">
          <h1>Ticket Draws</h1>
          <p>{requestedDraw}</p>
        </section>

        <section className="admin-content admin-draw-content">
          <AdminMetrics
            totalUsers={thisDraw?.usersEntered ?? 0}
            totalTickets={thisDraw?.ticketsSold ?? 0}
            totalSales={thisDraw?.sales ?? 0}
            labels={{ users: "Users Entered", tickets: "Tickets Sold", sales: "Sales" }}
            trends={{
              users: trendBetween(thisDraw?.usersEntered ?? 0, lastDraw?.usersEntered),
              tickets: trendBetween(thisDraw?.ticketsSold ?? 0, lastDraw?.ticketsSold),
              sales: trendBetween(thisDraw?.sales ?? 0, lastDraw?.sales),
            }}
          />

          <section className="number-chooser" aria-labelledby="chooser-title">
            <div className="number-chooser__glow" />
            <div className="number-chooser__inner">
              <header>
                <p>Random Number</p>
                <h2 id="chooser-title">Chooser</h2>
              </header>
              <div className="number-chooser__number">{drawNumber}</div>
              <div className="number-chooser__prizes">
                <label>
                  <span>CHOOSING FOR:</span>
                  <strong>
                    {rollCount === 1
                      ? "First Prize"
                      : rollCount === 2
                        ? "Second Prize"
                        : rollCount === 3
                          ? "Third Prize"
                          : rollCount <= 13
                            ? `Fourth Prize (${rollCount - 3})`
                            : "Complete"}
                  </strong>
                </label>
                <label>
                  <span>NEXT:</span>
                  <strong>
                    {rollCount === 1
                      ? "Second Prize"
                      : rollCount === 2
                        ? "Third Prize"
                        : rollCount < 13
                          ? `Fourth Prize (${rollCount - 2})`
                          : "Complete"}
                  </strong>
                </label>
              </div>
              <div className="number-chooser__progress-label">
                <span>{Math.min(rollCount, 13)}</span>
                <span>13</span>
              </div>
              <div className="number-chooser__progress">
                <img src={asset("draw-28093.svg")} alt="" />
              </div>
              <button type="button" disabled={rolling} onClick={rollNumber}>
                {rollCount > 13 ? "View Results" : "Roll"}
              </button>
            </div>
          </section>

          {drawMessage && (
            <p className="admin-message" role="alert">
              {drawMessage}
            </p>
          )}

          <section className="winning-admin">
            <div className="winning-admin__heading">
              <h2>Winning Lottery Numbers</h2>
              <p>Draw details</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table winning-admin__table">
                <thead>
                  <tr>
                    <th>Prize</th>
                    <th>Ticket ID</th>
                    <th>Ticket Number</th>
                    <th>Quantity Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {dbWinningRows.map((row: any, index: number) => (
                    <tr key={index}>
                      <td>{row.PrizeType || row.prize}</td>
                      <td>{row.ticketId || "N/A"}</td>
                      <td>{row.WinningNumber || row.number}</td>
                      <td>{row.quantity ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function AdminLiveDrawPage() {
  const [dbWinningRows, setDbWinningRows] = useState<any[]>([])

  const drawParams = new URLSearchParams(window.location.search)
  const requestedDrawId = drawParams.get("drawId")
  const [liveDrawLabel, setLiveDrawLabel] = useState("")
  const requestedDraw = drawParams.get("draw") || liveDrawLabel || "No draw available"

  useEffect(() => {
    const url = requestedDrawId
      ? `/api/draws/live?drawId=${encodeURIComponent(requestedDrawId)}`
      : "/api/draws/live"
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setDbWinningRows(data.prizes || [])
        setLiveDrawLabel(format(new Date(data.draw.DrawDate), "MMMM yyyy"))
      })
      .catch(console.error)
  }, [requestedDrawId])

  return (
    <div className="site-shell admin-live-draw-page">
      <Header className="header buy-header" />

      <main>
        <section className="admin-heading admin-live-heading">
          <div className="live-badge-wrap">
            <span className="live-badge">
              <span className="live-dot">•</span> LIVE
            </span>
            <h1>Live Ticket Draw</h1>
          </div>
          <p>{requestedDraw}</p>
        </section>

        <section className="admin-content admin-live-content">
          <div className="live-stream-box">
            <img
              src={asset("Stream.png")}
              alt="Live Draw Stream"
              className="live-stream-img"
            />
          </div>

          <section className="encryption-key-card">
            <div className="encryption-key-card__header">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h2>Public Encryption Key</h2>
            </div>
            <code className="encryption-key-code">
              0x2c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d
            </code>
            <div className="encryption-key-verified">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Verified by Auth.org</span>
            </div>
          </section>

          <section className="winning-admin">
            <div className="winning-admin__heading">
              <h2>Winning Lottery Numbers</h2>
              <p>Draw details</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table winning-admin__table">
                <thead>
                  <tr>
                    <th>Prize</th>
                    <th>Ticket Number</th>
                  </tr>
                </thead>
                <tbody>
                  {dbWinningRows.length > 0 ? (
                    dbWinningRows.map((row: any, index: number) => (
                      <tr key={index}>
                        <td>{row.PrizeType || row.prize}</td>
                        <td>{row.WinningNumber || row.number || "123456"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2}>No numbers drawn yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="site-shell">
      <Header className="header buy-header" />
      <main>
        <section className="cart-history">
          <div className="section-heading">
            <h2>Page not found</h2>
            <p>That page doesn&apos;t exist.</p>
          </div>
          <div className="cart-history__panel">
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Button href="/">Back to home</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/buy-lottery" element={<BuyLotteryPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/draw" element={<AdminDrawPage />} />
        <Route path="/admin/live-draw" element={<AdminLiveDrawPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App