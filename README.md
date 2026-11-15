# Lotto — Full-Stack Lottery Web Application

A full-stack 6-digit lottery platform built with **React 19**, **TypeScript**, **Tailwind CSS v4**, **Node.js / Express**, and **MySQL**. Customers can pick numbers, manage a persistent shopping cart, purchase tickets through atomic database transactions, and check winning results, while administrators manage draw lifecycles and execute live prize rolls.

---

## Features

### Customer Experience
* **Ticket Purchasing:** Choose between **Quick Pick** (instant random 6-digit generator) or **Custom Pick** (manual digit entry) for active draws.
* **Persistent Server-Side Cart:** Cart items are stored in MySQL (`CartItem`) with quantity controls (up to 5 tickets per number) and automatic multi-ticket discounts (10% off orders of 3+ tickets).
* **Atomic Checkout:** Uses MySQL transactions, row-level locking (`FOR UPDATE`), and stored procedures (`sp_process_checkout`) to prevent overselling and duplicate charges.
* **Results & Verification:** Check any 6-digit ticket against historical or current draws, and browse archived winning numbers by month and year.
* **User Accounts:** Secure registration and login powered by `bcrypt` password hashing, plus a profile dashboard showing won prizes (`sp_get_user_winnings`).

### Admin Portal
* **Analytics Dashboard:** Real-time overview of total registered customers, tickets sold, revenue, and draw statuses.
* **Draw Lifecycle Management:** Create new monthly draws (auto-populating ticket stock `000000`–`000099`), close ticket sales (`sp_close_draw`), and transition completed draws.
* **Interactive Prize Draw Engine:** Roll winning numbers sequentially for 1st Prize (6,000,000 THB), 2nd Prize (200,000 THB), 3rd Prize (80,000 THB), and ten 4th Prizes (2,000 THB each), plus a Live Draw broadcast view.

---

## Tech Stack

* **Frontend:** React 19, TypeScript, React Router v7, Vite 8, Tailwind CSS v4, `date-fns`
* **Backend:** Node.js (v22+), Express 5, `mysql2`, `bcrypt`, `dotenv`
* **Database:** MySQL (Relational schema with foreign keys, triggers, and stored procedures)

---

## Project Structure

```text
├── public/
│   └── assets/             # SVG icons and PNG illustrations
├── server/
│   ├── example.env         # Environment variable template
│   └── index.js            # Express REST API & MySQL connection pool
├── sql/
│   ├── schema.sql          # Database tables, triggers, and stored procedures
│   └── seed.sql            # Sample users, draws, ticket stock, and winning prizes
├── src/
│   ├── App.tsx             # Main SPA routing and page components
│   ├── index.css           # Tailwind CSS v4 imports and custom styling
│   └── main.tsx            # React DOM entrypoint
├── index.html
├── package.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
* **Node.js** v20.19+ or v22+
* **MySQL** 8.0+

### 1. Database Setup
1. Log in to your MySQL server and run the schema and seed scripts:
   ```bash
   mysql -u root -p < sql/schema.sql
   mysql -u root -p < sql/seed.sql
   ```
2. Default seeded accounts (all use password `password123`):
   * **Admin:** `admin`
   * **Customer:** `john@example.com` or `jane@example.com`

### 2. Backend Configuration
1. Copy `server/example.env` to `server/.env` and update your MySQL credentials:
   ```env
   API_PORT=3001
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=lotto
   ```

### 3. Install & Run
1. Install dependencies from the project root:
   ```bash
   npm install
   ```
2. Start the Express backend API (runs on `http://localhost:3001`):
   ```bash
   npm run api
   ```
3. In a second terminal, start the Vite frontend dev server (runs on `http://localhost:8443`):
   ```bash
   npm run dev
   ```

---

## API Reference

### Public & Customer Routes
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/pricing` | Fetch ticket price and bulk discount rules |
| `GET` | `/api/draws/current` | Get the currently open draw for ticket sales |
| `GET` | `/api/draws/latest` | Fetch top 3 winning numbers from the latest draw |
| `GET` | `/api/draws/check` | Check if a 6-digit number won in a given month/year |
| `GET` | `/api/draws/historical` | Query all 13 prizes by `drawId` or `month` & `year` |
| `GET` | `/api/draws/live` | Fetch active live draw details and rolled prizes |
| `GET` | `/api/cart/:userId` | Retrieve purchased ticket history for a user |
| `GET` | `/api/users/:userId/winnings` | Fetch winning tickets for a user (`sp_get_user_winnings`) |

### Cart, Auth & Checkout
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new customer account |
| `POST` | `/api/auth/login` | Authenticate user credentials |
| `GET` | `/api/cart-items/:userId` | Get active shopping cart items |
| `POST` | `/api/cart-items` | Add a 6-digit ticket to the cart |
| `PUT` | `/api/cart-items/:cartItemId` | Update ticket quantity in the cart |
| `DELETE` | `/api/cart-items/:cartItemId` | Remove a ticket from the cart |
| `POST` | `/api/checkout` | Execute transactional checkout (`sp_process_checkout`) |

### Admin Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Aggregate total users, sales, tickets, and draws |
| `POST` | `/api/admin/draws` | Create a new monthly draw and generate ticket stock |
| `PUT` | `/api/admin/draws/:drawId/close` | Close ticket sales for a draw (`sp_close_draw`) |
| `GET` | `/api/admin/draws/:drawId/stats` | Get draw-specific sales and comparison trends |
| `POST` | `/api/admin/draws/prizes` | Record a winning prize roll (completes draw at 13 prizes) |
