# ClickAway

ClickAway is a full-stack browser game built around reaction speed, accuracy, and streak management. The frontend is a Vite/React app, the backend is an Express API, and player accounts plus progression are stored in Supabase Postgres.

This README is meant to get a new developer or reviewer from zero to running the app locally, then give enough structure to understand where the important parts of the project live.

## What the app includes

- Account signup and login with JWT-based sessions stored in httpOnly cookies, with server-side session revocation
- A game screen with Practice, Casual, and Ranked modes
- Persistent coins, XP, MMR, unlocked cosmetics, round history, and achievements
- A cosmetic shop for button skins, arena themes, and profile images
- Profile, history, leaderboard, and help pages

## Tech stack

- Frontend: React 19, React Router 7, Vite 7, Axios
- Backend: Express 5, JSON Web Tokens, bcryptjs, express-rate-limit
- Database: Supabase Postgres via `pg`
- Styling: plain CSS organized by page/component

## Prerequisites

Before you start, make sure you have:

- Node.js (Node 22 recommended) and npm installed
- A Supabase project (free tier is fine): https://supabase.com/dashboard

## First-time setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/QuinOG/ClickAway.git
cd ClickAway
npm install
```

### 2. Get your Supabase connection string

The backend creates and migrates its own schema automatically on startup (`initializeSchema()`). You only need to:

1. In the Supabase Dashboard, open your project, go to Project Settings, Database, Connection string, and copy the URI (use the "Transaction pooler" string for serverless-friendly pooling, or the direct/session connection for a long-running server like this one).
2. Paste it into `SUPABASE_DB_URL` in `.env`.
3. Start the backend once. It creates every table it needs and backfills any missing columns on older databases.

No manual SQL import is required. `server/data/clickaway.sql` is kept only as a historical snapshot of the old MySQL schema for reading by eye. See `server/data/MIGRATIONS.md` for details and why it should not be treated as the source of truth.

### 3. Create your environment file

Copy `.env.example` to `.env`.

```bash
copy .env.example .env
```

If `copy` is not available in your shell, duplicate the file manually.

### 4. Fill in `.env`

These are the environment variables listed in `.env.example`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Secret used to sign and verify auth tokens. The server will not start without it. |
| `PORT` | No | Backend port. Defaults to `4000`. |
| `CLIENT_ORIGIN` | No | Allowed frontend origin for CORS. Defaults to `http://localhost:5173`. |
| `ADMIN_USERNAME` | No | Username for the optional seeded admin account. Defaults to `admin`. |
| `ADMIN_PASSWORD` | No | If set, the backend creates or refreshes the admin account password on startup. If empty, admin seeding is skipped. |
| `SUPABASE_DB_URL` | Yes | Postgres connection string from Supabase Dashboard (Project Settings, Database). |
| `DB_AUTO_MIGRATE` | No | Defaults to `true`. Set to `false` when migrations are applied separately and the runtime uses a restricted database role. |
| `DB_SSL_MODE` | No | Controls database TLS verification: `verify` checks the certificate against `DB_SSL_CA`, `disable` turns TLS off (for local Postgres only), and `no-verify` (default) encrypts without checking the certificate and logs a warning. Use `verify` in production. Leave `sslmode` out of `SUPABASE_DB_URL` because it overrides this setting. |
| `DB_SSL_CA` | For `verify` | CA certificate from Supabase Dashboard (Database, SSL). Accepts either a path to a PEM file or the PEM text (with `\n` for newlines). |
| `VITE_SUPABASE_URL` | No | Supabase project URL for optional client-side Supabase SDK usage. Not required by the backend database layer. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | No | Supabase publishable/anon key for optional client-side Supabase SDK usage. Not required by the backend database layer. |
| `VITE_API_BASE_URL` | No | Frontend API base URL. Defaults to `/api` (Vite proxies `/api` to the backend in local dev). Set this only when the frontend and backend are served from different origins. |

The provided `.env.example` already matches the default local development setup, so in most cases you only need to:

- set `JWT_SECRET`
- set `SUPABASE_DB_URL` to your Supabase connection string
- keep the default ports unless something on your machine conflicts

### 5. Start the app

Run the backend and frontend together:

```bash
npm run dev:all
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/api/health`
- Backend readiness check: `http://localhost:4000/api/health/ready`

You can also run each side separately:

```bash
npm run server
npm run dev
```

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite frontend |
| `npm run server` | Starts the Express backend |
| `npm run dev:all` | Starts frontend and backend together |
| `npm run build` | Builds the production frontend bundle |
| `npm run preview` | Serves the built frontend locally |
| `npm run lint` | Runs ESLint |
| `npm test` | Runs unit tests and UI tests (`test:unit` then `test:ui`) |
| `npm run test:unit` | Runs Node unit tests (`tests/*.test.js`) |
| `npm run test:ui` | Runs Vitest and Testing Library UI tests (`tests/*.test.jsx`) |
| `npm run test:integration` | Runs server integration tests (`tests/integration/*.test.js`) against in-process PGlite Postgres |
| `npm run test:browser` | Runs Playwright browser tests in `tests/e2e/` (excludes `zz-*` capture specs) |
| `npm run test:capture` | Runs Playwright with `PLAYWRIGHT_CAPTURE=1` to include `zz-*` capture specs |
| `npm run test:browser:update` | Updates Playwright visual-cohesion snapshots |
| `npm run test:release` | Runs lint, unit and UI tests, browser tests, and production build |

## Testing

- **Unit tests** (`npm run test:unit`): run `node:test` suites in `tests/*.test.js`.
- **UI tests** (`npm run test:ui`): run Vitest + Testing Library suites in `tests/*.test.jsx` via `scripts/run-vitest.mjs`, which normalizes drive-letter case on Windows.
- **Integration tests** (`npm run test:integration`): run `tests/integration/*.test.js` against the Express app factory (`server/app.js`) and an in-process PGlite Postgres instance (`tests/integration/testDatabase.js`). No external database is required.
- **Browser tests** (`npm run test:browser`): run Playwright specs in `tests/e2e/`. Capture specs named `zz-*.spec.js` are excluded by default.
- **Capture scripts** (`npm run test:capture`): run Playwright with `PLAYWRIGHT_CAPTURE=1` to include `zz-*` design-review capture specs.
- **CI** (`.github/workflows/ci.yml`): runs `npm run lint`, `npm test`, `npm run test:integration`, and `npm run build` on Node 22 for pushes to `main` and pull requests, followed by an informational Playwright browser job.

## Health checks

- `GET /api/health` is a liveness check that returns `200` with `{ "ok": true }`.
- `GET /api/health/ready` is a readiness check that runs `SELECT 1` against Postgres with a 2-second timeout. It returns `200` with `{ "ok": true, "database": "up" }` when the database responds, or `503` with `{ "ok": false, "database": "down" }` when it does not. `railway.json` uses `/api/health/ready` as its deploy healthcheck path.
- On `SIGTERM` or `SIGINT`, `server/index.js` stops accepting new connections, waits up to 10 seconds for in-flight HTTP requests to finish, and closes the database pool.

## How to use the app

All main pages are behind authentication. A normal first pass through the app looks like this:

1. Open the frontend in the browser.
2. Create an account on `/signup` or log in on `/login`.
3. Land on `/game` and play rounds.
4. Spend earned coins in `/shop`.
5. Review progress in `/profile`, `/history`, `/leaderboard`, and `/help`.

## Main app areas

### Authentication

- `LoginPage` and `SignupPage` call the backend auth routes.
- The session is a JWT held in an httpOnly, `SameSite=Lax` cookie set by the server. Page JS never sees or stores the token, which keeps it safe from theft via XSS.
- Sessions are tracked server-side by session ID (`sid`) in Postgres.
- On refresh, the app checks `GET /api/auth/me` (cookie sent automatically by the browser) to restore the session.
- Logging out calls `POST /api/auth/logout`, which revokes the current session and clears the cookie.
- Logging out of all devices calls `POST /api/auth/logout-all` (available on the Profile page), which revokes every active session for the account and clears the cookie.

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

#### Ranked rules: leaving a started ranked round counts as a loss

When a player starts a Ranked round, the server records it as a pending ranked round. Leaving or abandoning a started ranked round without submitting it counts as a loss: starting another ranked round or letting the round token expire settles the unsubmitted round as a forfeit (zero score, zero coins, zero XP, and the ranked loss delta).

If a completed round's save response is lost due to a network or 5xx error, the client allows retrying the submission with the same round token, and the server replays the saved outcome (`alreadySaved: true`) instead of treating the completed round as a forfeit.

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
- best score, streak, and reaction metrics
- achievement progress
- sign-out controls, including logging out of all devices

### History

The history page shows previously completed rounds, including score, hits, misses, rewards, reaction metrics, and rank movement.

### Leaderboard

The leaderboard page is backed by `GET /api/leaderboard` and renders live ranked standings returned by the server. The Reaction board ranks players by server-derived reaction times from verified rounds.

### Help

The help page explains controls, formulas, modes, ranking, progression, and other gameplay rules. Most of its content comes from structured data in `src/features/help/helpPageStructuredContent.js`.

## Project structure

```text
ClickAway/
|- public/                         Static images and rank/cosmetic assets
|- scripts/                        Test runner helpers (Vitest drive normalization, capture runner)
|- server/
|  |- app.js                       Express app factory, middleware, and API routes
|  |- index.js                     Server startup, admin seeding, and graceful shutdown
|  |- securityHeaders.js           CSP and browser security headers middleware
|  |- playerStateStore.js          Purchase/equip logic for player state
|  |- serverShopCatalogIdMappings.js   Mapping between frontend item ids and DB ids
|  |- data/
|  |  |- clickaway.sql             Historical MySQL schema snapshot (pre-Supabase)
|  |  |- MIGRATIONS.md             Manual migration ledger and environment notes
|  |  |- migrations/               Incremental patches for older databases
|- src/
|  |- app/                         App-level state and synchronization hooks
|  |- components/                  Reusable UI shared across pages
|  |- constants/                   Config for modes, storage keys, shop data, etc.
|  |- features/                    Feature-specific UI and helpers
|  |- game/                        Round engine and achievement definitions/evaluation
|  |- hooks/                       Small reusable React hooks
|  |- pages/                       Route-level pages
|  |- services/                    API client functions
|  |- styles/                      Global, layout, and component CSS
|  |- utils/                       Pure helpers for math, history, rank, progression
|  |- App.jsx                      Main route tree and page wiring
|  |- main.jsx                     React app entry point
|- tests/                          Unit, UI, integration, and Playwright browser tests
|- .env.example                    Environment variable template
```

## How state and data flow through the app

At a high level, the app works like this:

1. `src/main.jsx` mounts the React app with `BrowserRouter`.
2. `src/App.jsx` owns route wiring plus the top-level player/session state.
3. `src/app/useAuthSession.js` restores and verifies the current session.
4. `src/app/useAppPlayerState.js` stores the local in-memory player state used across pages.
5. `src/services/clickAwayHttpApiClient.js` wraps the backend API calls.
6. The backend in `server/app.js` handles auth, shop, round, leaderboard, replay, challenge, and progress routes, returning JSON `404` responses for unknown `/api/*` paths.
7. The server persistence layer reads from and writes to Supabase Postgres.

A common path looks like this:

- user logs in
- backend creates a session, sets the session cookie, and returns the user's saved progress in the response body
- frontend hydrates coins, XP, MMR, inventory, and history from that response (no token bookkeeping on the client)
- completing rounds submits the round to `POST /api/round/complete`, which derives rewards, reaction metrics, rank updates, and achievements on the server
- the frontend syncs editable progress fields such as saved loadouts, active loadout, build walkthrough, and seen unlock parts through `PUT /api/progress`; coins, XP, MMR, unlocked achievements, and round history are server-owned and not accepted from the client

## Common files to edit

If you are changing a specific part of the app, these are the main entry points:

- Game mode tuning: `src/constants/gameModesConfig.js`
- Shop catalog and cosmetic metadata: `src/constants/shopCatalog.js`
- Help page content: `src/features/help/helpPageStructuredContent.js`
- Backend routes and middleware: `server/app.js`
- Frontend/backend cosmetic ID mapping: `server/serverShopCatalogIdMappings.js`

## Important current notes

These are useful to know before making deeper changes:

- The Postgres schema is created and migrated automatically on server boot when `DB_AUTO_MIGRATE` is not `"false"`. No manual SQL import is needed.
- The leaderboard is backend-driven through `GET /api/leaderboard`.
- Shop metadata lives in the frontend, while the backend only knows item ids and mappings.
- Achievements are recomputed on the server from trusted lifetime stats and progress when rounds complete (using the shared rules in `src/game/achievements/evaluateAchievements.js`), and unlocked achievement ids are persisted in Postgres.
- Unknown `/api/*` routes return JSON `404` responses, hashed production assets under `/assets` are served with immutable long-term caching, and `index.html` is served with `Cache-Control: no-cache`.
- If you add or rename a cosmetic item, you usually need to update both `src/constants/shopCatalog.js` and `server/serverShopCatalogIdMappings.js`, and keep the SQL seed ids aligned.

## Troubleshooting

### The server exits immediately on startup

Check:

- `JWT_SECRET` is set
- `SUPABASE_DB_URL` is set and reachable (it can point at an empty database because the server creates its own schema on startup)
- If `DB_SSL_MODE=verify`, `DB_SSL_CA` is set to valid PEM text or a readable PEM file path

### Login/signup requests fail from the browser

Check:

- the backend is running on the port in `PORT`
- `VITE_API_BASE_URL` is unset in local dev (so Vite proxies `/api`) or points at the backend origin in a split deployment
- `CLIENT_ORIGIN` matches the frontend URL

### The frontend loads but progress is missing

Check:

- you are logged into the expected account
- the backend can reach Supabase (`SUPABASE_DB_URL` is correct and the project is not paused)
- `GET /api/health/ready` reports `{ "ok": true, "database": "up" }`

## Quick orientation for a new contributor

If you only want the shortest path to understanding the repo:

1. Read `src/App.jsx` to see the routes and the top-level state wiring.
2. Read `src/pages/GamePage.jsx` and `src/features/game/` to understand the core gameplay loop.
3. Read `server/app.js` to see the API surface and middleware.
4. Read `tests/integration/server.test.js` to see end-to-end backend flows running against PGlite.
