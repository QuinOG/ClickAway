# ClickAway

ClickAway is a full-stack browser game built around reaction speed, accuracy, and streak management. The frontend is a Vite/React app, the backend is an Express API, and player accounts plus progression are stored in MySQL.

This README is meant to get a new developer or reviewer from zero to running the app locally, then give enough structure to understand where the important parts of the project live.

## What The App Includes

- Account signup and login with JWT-based sessions
- A game screen with Practice, Casual, and Ranked modes
- Persistent coins, XP, MMR, unlocked cosmetics, round history, and achievements
- A cosmetic shop for button skins, arena themes, and profile images
- Profile, history, leaderboard, and help pages

## Tech Stack

- Frontend: React 19, React Router 7, Vite 7, Axios
- Backend: Express 5, JSON Web Tokens, bcryptjs
- Database: MySQL via `mysql2`
- Styling: plain CSS organized by page/component

## Prerequisites

Before you start, make sure you have:

- Node.js and npm installed
- A local MySQL server running
- A way to create a database and import a `.sql` file

## First-Time Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/QuinOG/ClickAway.git
cd ClickAway
npm install
```

### 2. Create the MySQL database

The backend does not create the schema automatically. You need to:

1. Create a database named `clickaway` in MySQL, or choose another name and update `DB_NAME` in `.env`.
2. Import the bootstrap schema from `server/data/clickaway.sql`.

That SQL file creates the tables the app currently expects:

- `users`
- `round_history`
- `user_collection`
- `user_achievement_progress`
- lookup tables for cosmetics and achievements

### 3. Create your environment file

Copy `.env.example` to `.env`.

```bash
copy .env.example .env
```

If `copy` is not available in your shell, just duplicate the file manually.

### 4. Fill in `.env`

These are the variables used by the app:

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Secret used to sign and verify auth tokens. The server will not start without it. |
| `PORT` | No | Backend port. Defaults to `4000`. |
| `CLIENT_ORIGIN` | No | Allowed frontend origin for CORS. Defaults to `http://localhost:5173`. |
| `ADMIN_USERNAME` | No | Username for the optional seeded admin account. Defaults to `admin`. |
| `ADMIN_PASSWORD` | No | If set, the backend creates or refreshes the admin account password on startup. If empty, admin seeding is skipped. |
| `DB_HOST` | Yes | MySQL host. Usually `localhost`. |
| `DB_PORT` | Yes | MySQL port. Usually `3306`. |
| `DB_USER` | Yes | MySQL username. |
| `DB_PASSWORD` | No | MySQL password. |
| `DB_NAME` | Yes | Database name the backend connects to. |
| `VITE_API_BASE_URL` | No | Frontend API base URL. Defaults to `http://localhost:4000/api`. |

The provided `.env.example` already matches the default local development setup, so in most cases you only need to:

- set `JWT_SECRET`
- set your MySQL credentials
- keep the default ports unless something on your machine conflicts

### 5. Start the app

Run the backend and frontend together:

```bash
npm run dev:all
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/api/health`

You can also run each side separately:

```bash
npm run server
npm run dev
```

## Available Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite frontend |
| `npm run server` | Starts the Express backend |
| `npm run dev:all` | Starts frontend and backend together |
| `npm run build` | Builds the production frontend bundle |
| `npm run preview` | Serves the built frontend locally |
| `npm run lint` | Runs ESLint |

## How To Use The App

All main pages are behind authentication. A normal first pass through the app looks like this:

1. Open the frontend in the browser.
2. Create an account on `/signup` or log in on `/login`.
3. Land on `/game` and play rounds.
4. Spend earned coins in `/shop`.
5. Review progress in `/profile`, `/history`, `/leaderboard`, and `/help`.

## Main App Areas

### Authentication

- `LoginPage` and `SignupPage` call the backend auth routes.
- The JWT token is stored locally in the browser.
- On refresh, the app checks `/api/auth/me` to restore the session.

### Game

The game page is the core of the app:

- `Practice` is untimed and does not award progression
- `Casual` awards coins and XP
- `Ranked` awards coins, XP, and rank/MMR changes

Each round moves through four phases:

1. Ready
2. Countdown
3. Playing
4. Game Over

While the round is live, hits increase score and streak, misses reset pressure, and the target shrinks based on the selected mode's tuning values.

### Shop

The shop is cosmetic-only. It lets the player:

- buy button skins
- buy arena themes
- buy profile images
- equip owned items

Purchases and equips go through authenticated backend routes and are then reflected in persisted player state.

### Profile

The profile page summarizes a player's account:

- coins
- level progress
- rank tier and MMR
- best score and streak
- achievement progress

### History

The history page shows previously completed rounds, including score, hits, misses, rewards, and rank movement.

### Leaderboard

The leaderboard page currently combines the logged-in player's ranked stats with mock leaderboard entries. It is useful for UI work, but it is not backed by a real leaderboard API yet.

### Help

The help page explains controls, formulas, modes, ranking, progression, and other gameplay rules. Most of its content comes from structured data in `src/features/help/helpContent.js`.

## Project Structure

```text
ClickAway/
|- public/                         Static images and rank/cosmetic assets
|- server/
|  |- data/clickaway (3).sql       Bootstrap MySQL schema
|  |- index.js                     Express app and API routes
|  |- db.js                        MySQL queries and persistence helpers
|  |- playerStateStore.js          Purchase/equip logic for player state
|  |- shopItemMap.js               Mapping between frontend item ids and DB ids
|- src/
|  |- app/                         App-level state and synchronization hooks
|  |- components/                  Reusable UI shared across pages
|  |- constants/                   Config for modes, storage keys, shop data, etc.
|  |- features/                    Feature-specific UI and helpers
|  |- game/                        Achievement definitions/evaluation
|  |- hooks/                       Small reusable React hooks
|  |- pages/                       Route-level pages
|  |- services/                    API client functions
|  |- styles/                      Global, layout, and component CSS
|  |- utils/                       Pure helpers for math, history, rank, progression
|  |- App.jsx                      Main route tree and page wiring
|  |- main.jsx                     React app entry point
|- .env.example                    Environment variable template
|- MYSQL_AUDIT.md                  Notes on current MySQL ownership and gaps
```

## How State And Data Flow Through The App

At a high level, the app works like this:

1. `src/main.jsx` mounts the React app with `BrowserRouter`.
2. `src/App.jsx` owns route wiring plus the top-level player/session state.
3. `src/app/useAuthSession.js` restores and verifies the current session.
4. `src/app/useAppPlayerState.js` stores the local in-memory player state used across pages.
5. `src/services/api.js` wraps the backend API calls.
6. The backend in `server/index.js` handles auth, shop, and progress routes.
7. `server/db.js` reads from and writes to MySQL.

A common path looks like this:

- user logs in
- backend returns a token and the user's saved progress
- frontend stores the token and hydrates coins, XP, MMR, inventory, and history
- completing rounds updates local state
- the frontend persists that state back to the backend through `PUT /api/progress`

## Common Files To Edit

If you are changing a specific part of the app, these are the main entry points:

- Game mode tuning: `src/constants/difficultyConfig.js`
- Shop catalog and cosmetic metadata: `src/constants/shopCatalog.js`
- Help page content: `src/features/help/helpContent.js`
- Backend routes: `server/index.js`
- Database reads/writes: `server/db.js`
- Frontend/backend cosmetic ID mapping: `server/shopItemMap.js`

## Important Current Notes

These are useful to know before making deeper changes:

- The MySQL schema is bootstrapped from `server/data/clickaway (3).sql`; there is no migration system yet.
- The leaderboard is not fully backend-driven yet. The current page still uses mock data for non-local players.
- Shop metadata lives in the frontend, while the backend only knows item ids and mappings.
- Achievement rules are evaluated in the frontend, while unlocked achievement ids are persisted in MySQL.
- If you add or rename a cosmetic item, you usually need to update both `src/constants/shopCatalog.js` and `server/shopItemMap.js`, and keep the SQL seed ids aligned.

## Troubleshooting

### The server exits immediately on startup

Check:

- `JWT_SECRET` is set
- MySQL is running
- the database in `DB_NAME` exists
- the schema from `server/data/clickaway (3).sql` has been imported

### Login/signup requests fail from the browser

Check:

- the backend is running on the port in `PORT`
- `VITE_API_BASE_URL` points at the backend
- `CLIENT_ORIGIN` matches the frontend URL

### The frontend loads but progress is missing

Check:

- you are logged into the expected account
- the backend can reach MySQL
- the relevant tables were imported correctly

## Quick Orientation For A New Contributor

If you only want the shortest path to understanding the repo:

1. Read `src/App.jsx` to see the routes and the top-level state wiring.
2. Read `src/pages/GamePage.jsx` and `src/features/game/` to understand the core gameplay loop.
3. Read `server/index.js` to see the API surface.
4. Read `server/db.js` to see what data is persisted.
5. Read `MYSQL_AUDIT.md` to understand what is fully implemented versus still frontend-owned or mocked.
