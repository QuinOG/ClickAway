# ClickAway — Test Cases

> **Stack context:** React 19 + Vite frontend, Express backend with JWT auth (7-day tokens in an httpOnly cookie), bcrypt password hashing, and a Supabase Postgres database. Casual and Ranked round results are submitted to `POST /api/round/complete`; `PUT /api/progress` syncs client-controlled settings and loadout fields.

---

## Table of Contents
1. [Functional Tests](#1-functional-tests)
   - [Authentication](#11-authentication)
   - [Game Mechanics](#12-game-mechanics)
   - [Powerup System](#13-powerup-system)
   - [Shop & Loadout](#14-shop--loadout)
   - [Progress & Progression](#15-progress--progression)
   - [Achievements](#16-achievements)
   - [Leaderboard](#17-leaderboard)
   - [Round History](#18-round-history)
2. [Usability Tests](#2-usability-tests)
   - [UI Feedback & Responsiveness](#21-ui-feedback--responsiveness)
   - [Navigation & Routing](#22-navigation--routing)
   - [Accessibility](#23-accessibility)
3. [Non-Functional Tests](#3-non-functional-tests)
   - [Security](#31-security)
   - [Performance](#32-performance)
   - [Compatibility](#33-compatibility)

---

## 1. Functional Tests

### 1.1 Authentication

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-A01 | Successful signup | POST `/api/auth/signup` with a unique username (≥3 chars) and password (≥8 chars) | Returns `201` with the user object and initial progress, plus a `Set-Cookie` containing the session JWT |
| F-A02 | Duplicate username rejected | Sign up with a username that already exists | Returns `409` with `"That username is already taken."` |
| F-A03 | Short username rejected | Submit username `"ab"` (2 chars) | Returns `400` with `"Username must be at least 3 characters."` |
| F-A04 | Short password rejected | Submit password `"pass"` (4 chars) | Returns `400` with `"Password must be at least 8 characters."` |
| F-A05 | Successful login | POST `/api/auth/login` with valid credentials | Returns `200` with the user object and synced progress, plus a `Set-Cookie` containing the session JWT |
| F-A06 | Wrong password rejected | POST `/api/auth/login` with correct username, wrong password | Returns `401` with `"Invalid username or password."` |
| F-A07 | Unknown username rejected | POST `/api/auth/login` with a username that does not exist | Returns `401` (same generic error — no username enumeration) |
| F-A08 | Session restore (`/me`) | GET `/api/auth/me` with a valid session cookie | Returns current user object and latest progress |
| F-A09 | Frontend redirect on logout | Log out from the UI | Server clears the session cookie; UI redirects to `/login`, protected routes become inaccessible |
| F-A10 | Empty body handled | POST `/api/auth/login` with `{}` | Returns `400` — does not crash server |

---

### 1.2 Game Mechanics

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-G01 | Clicking the button scores a point | In a Casual/Ranked round, click the moving button | Score increments by the current combo multiplier |
| F-G02 | Missing the button breaks streak | Click anywhere outside the button during PLAYING phase | Streak resets to 0; combo multiplier drops back to 1× |
| F-G03 | Button shrinks on each hit | Click the button multiple times in one round | Button width visually decreases each hit (`shrinkFactor = 0.97`) |
| F-G04 | Button never goes below minimum size | Click the button ≥100 times | Button size floors at `MIN_BUTTON_SIZE` (10px), never disappears |
| F-G05 | Casual timer counts down | Start a Casual round | Timer starts at 30 s and decrements every second |
| F-G06 | Ranked timer counts down | Start a Ranked round | Timer starts at 15 s and decrements every second |
| F-G07 | Practice mode has no timer | Start a Practice round | HUD displays "No Limit"; no countdown occurs |
| F-G08 | Round ends when timer hits 0 | Let a Casual/Ranked timer expire | Phase transitions to GAME_OVER; Game Over overlay appears |
| F-G09 | "End Practice Round" button ends game | Click "End Practice Round" during a Practice game | Phase transitions to GAME_OVER |
| F-G10 | Countdown before round starts | Select a mode and press Start | 3-2-1 countdown runs before PLAYING phase begins |
| F-G11 | Practice rounds award no coins/XP | Complete a Practice round | `coins` and `levelXp` do not change |
| F-G12 | Casual rounds award coins and XP | Complete a Casual round with a positive score | `coins` and `levelXp` increase; `rankMmr` unchanged |
| F-G13 | Ranked rounds award coins, XP, and MMR | Complete a Ranked round | `coins`, `levelXp`, and `rankMmr` all increase |

---

### 1.3 Powerup System

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-P01 | Time Boost charge earned every 5 hits | Build a streak of 5 in Casual/Ranked | `time_boost` charge count increments by 1 |
| F-P02 | Grow charge earned every 10 hits | Build a streak of 10 | `size_boost` charge count increments by 1 |
| F-P03 | Freeze charge earned every 15 hits | Build a streak of 15 | `freeze_movement` charge count increments by 1 |
| F-P04 | Pressing "1" uses a Time Boost charge | Have ≥1 `time_boost` charge and press `1` | Timer increases by 2 s; charge count decrements by 1 |
| F-P05 | Pressing "2" uses a Grow charge | Have ≥1 `size_boost` charge and press `2` | Button grows; charge decrements |
| F-P06 | Pressing "3" uses a Freeze charge | Have ≥1 `freeze_movement` charge and press `3` | Button stops moving for 1 s; charge decrements |
| F-P07 | Powerup key does nothing with 0 charges | Press `1` with no Time Boost charges | Nothing happens; no error |
| F-P08 | Segment bar reflects streak progress | Build streak of 3 in Casual (Time Boost = every 5 hits) | Progress bar shows 3 of 5 segments filled |
| F-P09 | Segment bar resets after charge awarded | Hit 5 in a row (Time Boost earned) | Bar resets to 0 filled; charge count goes up |
| F-P10 | Time Boost cannot exceed max buffer | Press `1` repeatedly when timer is already near `MAX_TIME_BUFFER_SECONDS` (30 s) | Timer is capped at 30 s |

---

### 1.4 Shop & Loadout

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-S01 | Purchase item with sufficient coins | Have enough coins, click Buy on a shop item | Item added to `ownedItemIds`; coins deducted; confirmed via `POST /api/shop/purchase` |
| F-S02 | Purchase rejected with insufficient coins | Attempt to buy an item costing more than current `coins` | Error shown; coins unchanged; item not added |
| F-S03 | Built-in items require no purchase | Open the shop | Default button skin and arena theme show as owned without spending coins |
| F-S04 | Equip owned item | Click Equip on an owned item | `equipped*Id` updates; item visually active; `POST /api/shop/equip` succeeds |
| F-S05 | Cannot equip unowned item | Attempt to equip an item that is not in `ownedItemIds` | Equip action is blocked |
| F-S06 | Equipped skin renders in arena | Equip a non-default button skin, start a game | Game button uses the equipped skin appearance |
| F-S07 | Equipped arena theme applies | Equip an arena theme, start a game | Arena background reflects the selected theme class |

---

### 1.5 Progress & Progression

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-PR01 | Progress persists after round | Complete any Casual or Ranked round | `POST /api/round/complete` persists the round and rewards; server-side progress updated |
| F-PR02 | Progress loads on login | Log in from a fresh browser tab | Frontend state hydrates from the server response; the session cookie is sent automatically and no token is stored in page JS |
| F-PR03 | Partial progress update preserves other fields | Send `PUT /api/progress` with only `buildWalkthrough: "completed"` in the body | Build walkthrough status updates; coins, XP, MMR, and history remain unchanged on the server |
| F-PR04 | Level XP accumulates correctly | Complete multiple Casual rounds | `levelXp` accumulates; level display increases at correct thresholds |
| F-PR05 | Ranked MMR increases on good round | Score well in a Ranked round | `rankMmr` increases; rank badge may upgrade |
| F-PR06 | Reaction metrics persist with round history | Complete a Casual or Ranked round with at least one hit, then log out and back in | `avgReactionMs` and `bestReactionMs` are still present in saved history and derived profile stats |

---

### 1.6 Achievements

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-ACH01 | Metric achievement unlocks at threshold | Reach the required cumulative hit count for an achievement | Achievement is added to `unlockedAchievementIds`; toast/notification shown |
| F-ACH02 | Achievement not re-awarded | Unlock the same achievement, continue playing | Achievement does not duplicate in `unlockedAchievementIds` |
| F-ACH03 | Achievement progress visible | Open Achievements section; have partial progress | Progress bar shows correct `current / target` ratio |
| F-ACH04 | Category master unlocks after all in category | Unlock every achievement in a single category | Category master achievement unlocks automatically |

---

### 1.7 Leaderboard

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-LB01 | Leaderboard loads for authed user | Navigate to `/leaderboard` while logged in | `GET /api/leaderboard` returns the default page of 25 rows for the requested board |
| F-LB02 | Leaderboard blocked for guests | Access `/leaderboard` without a token | Redirected to `/login` via `ProtectedRoute` |
| F-LB03 | Player's own row is highlighted | View leaderboard as a logged-in user who has played | Current user's row is visually distinguished |

---

### 1.8 Round History

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| F-H01 | Round is recorded after completion | Complete a Casual or Ranked round | New entry appears in `roundHistory` with score, mode, date, streak, and reaction metrics when available |
| F-H02 | History page displays all past rounds | Navigate to `/history` | All entries in `roundHistory` are listed, newest first |
| F-H03 | Practice rounds not recorded | Complete a Practice round | No new entry added to `roundHistory` |

---

## 2. Usability Tests

### 2.1 UI Feedback & Responsiveness

| ID | Test Case | Criteria |
|----|-----------|----------|
| U-UI01 | Click feedback appears on hit | A `+N` floating label appears at the click position within one frame |
| U-UI02 | Score display updates immediately | Score number changes without a visible delay after each hit |
| U-UI03 | Timer urgency changes at thresholds | Timer text enters warning state below 5 s and danger state below 3 s |
| U-UI04 | Screen shakes on streak milestone | At streak multiples of 10, a brief screen shake animation plays |
| U-UI05 | "End Practice Round" button does not shift layout | In Practice mode the button sits inline with the stats row — the arena does not move |
| U-UI06 | Powerup tray fills correctly | Segment bar for each powerup fills smoothly as streak builds; does not overfill |
| U-UI07 | Game Over overlay shows final stats | After a round, the overlay displays score, hits, misses, and streak |
| U-UI08 | Shop preview reflects equipped item | Equipping a skin in the shop updates the preview card without a page reload |
| U-UI09 | Navbar active link highlighted | The nav item for the current route is visually active |
| U-UI10 | Layout adapts below 700 px | At mobile widths the powerup tray, HUD, and arena stack without overflow |
| U-UI11 | Reduced-motion disables non-essential animation | With `prefers-reduced-motion: reduce`, page-enter, timer pulse, score pulse, stagger, and unlock animations do not play |

---

### 2.2 Navigation & Routing

| ID | Test Case | Criteria |
|----|-----------|----------|
| U-NAV01 | Unauthenticated users are redirected | Visiting `/game`, `/shop`, etc. without a token redirects to `/login` |
| U-NAV02 | Authenticated users skip login | Visiting `/login` or `/signup` while logged in redirects to `/game` |
| U-NAV03 | Reload preserves session | Hard-refreshing any protected page does not log the user out (token re-verified via `/api/auth/me`) |
| U-NAV04 | 404 / unknown routes handled | Navigating to a non-existent path shows a graceful fallback, not a blank screen |

---

### 2.3 Accessibility

| ID | Test Case | Criteria |
|----|-----------|----------|
| U-A11Y01 | Score has `aria-live` | Screen readers announce score changes during gameplay |
| U-A11Y02 | Buttons have accessible labels | All `<button>` elements have meaningful text or `aria-label` attributes |
| U-A11Y03 | Keyboard-only gameplay | A user can navigate menus and activate powerups (keys 1–3) without a mouse |
| U-A11Y04 | Color is not the only indicator | Timer warning, streak state, and powerup readiness are distinguishable beyond color alone |
| U-A11Y05 | Sufficient contrast | Text elements meet WCAG AA contrast ratio (4.5:1) against their backgrounds |

---

## 3. Non-Functional Tests

### 3.1 Security

> These are the highest-priority tests for the backend API.

#### JWT & Authentication

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-JWT01 | Missing token rejected | Call any protected endpoint without a session cookie | `401` — `"Missing authentication token."` |
| S-JWT02 | Expired token rejected | Send a session cookie containing a JWT signed with `exp` in the past | `401` — `"Invalid or expired authentication token."` |
| S-JWT03 | Tampered token rejected | Modify the payload of a valid JWT (e.g. change `sub`) and send it in the session cookie | `401` — signature mismatch detected by `jsonwebtoken` |
| S-JWT04 | Weak/missing `JWT_SECRET` blocks startup | Start the server with `JWT_SECRET=""` | Server throws and exits — does not start insecurely |
| S-JWT05 | Token not accepted by wrong secret | Sign a token with a different secret and send it in the session cookie | `401` — rejected |
| S-JWT06 | Role claim does not authorize requests | Sign in as a normal account and compare the token's `role` claim with the role returned by `GET /api/auth/me` | Protected routes authorize by user id, not by the token role claim; `/api/auth/me` returns the database role |

#### Input Validation & Injection

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-INJ01 | SQL injection in username field | POST `/api/auth/signup` with `username: "' OR 1=1 --"` | Parameterized queries prevent injection; returns 400 (username rules) or 409 |
| S-INJ02 | Oversized username truncated/rejected | Submit a username of 500 characters | Returns `400` — `"Username must be 32 characters or less."` |
| S-INJ03 | Null/missing body fields handled | POST `/api/auth/login` with `{}` or `null` body | Returns `400`; server does not throw |
| S-INJ04 | `itemId` of unknown shop item rejected | POST `/api/shop/purchase` with a fabricated `itemId` | Returns an error — item not found in catalog |
| S-INJ05 | Progress fields with wrong types | PUT `/api/progress` with `coins: "drop table users"` | `coins` is server-owned and ignored; no server error |

#### Access Control

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-AC01 | Player cannot read another player's state | GET `/api/player/state` with user A's session cookie | Returns only user A's data — no cross-user leakage |
| S-AC02 | Player cannot write another player's progress | PUT `/api/progress` using user A's session cookie | Only user A's row is updated; user B's data is untouched |
| S-AC03 | CORS blocks unexpected origins | Send a request with an `Origin` other than `CLIENT_ORIGIN` | Browser CORS policy blocks the response |

#### Password & Credential Security

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-PW01 | Passwords are hashed in the database | Inspect the `users` table after signup | `passwordHash` is a bcrypt hash (starts with `$2b$`), never plaintext |
| S-PW02 | Wrong password cannot be derived | Attempt login with every common password against a test account | bcrypt work factor (12) makes brute force computationally infeasible |
| S-PW03 | Error message is generic for login failures | Attempt login with a valid username and wrong password | Error says `"Invalid username or password."` — does not reveal whether username exists |

#### Frontend / Client-Side

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S-FE01 | No secrets stored in `localStorage` | Inspect `localStorage` in DevTools after login | No auth token or persisted progress blob is stored; the session lives in an httpOnly cookie |
| S-FE02 | Cookie is cleared on logout | Log out | `POST /api/auth/logout` clears the session cookie; subsequent protected API calls fail with `401` |
| S-FE03 | No sensitive data in page source | View page source of a rendered page | No user credentials, secrets, or internal API keys visible |

---

### 3.2 Performance

| ID | Test Case | Criteria |
|----|-----------|----------|
| P-01 | Game loop runs smoothly | During a round, button movement and click feedback should run at 60 fps with no visible jank on a mid-range device |
| P-02 | Round end does not lag | Completing a round (progress sync + overlay render) should feel instant — target < 500 ms for the API round-trip |
| P-03 | Leaderboard loads quickly | `GET /api/leaderboard` (25 rows) should respond within 200 ms on a local network |
| P-04 | Large round history renders without freezing | A `roundHistory` with 200+ entries should not block the main thread when opening the History page |
| P-05 | Signup/login API response time | Auth endpoints should respond within 1 second (bcrypt `cost=12` is intentionally slow — this is expected and acceptable) |

---

### 3.3 Compatibility

| ID | Test Case | Criteria |
|----|-----------|----------|
| C-01 | Chrome (latest) | Full gameplay, auth, and shop work correctly |
| C-02 | Firefox (latest) | Full gameplay, auth, and shop work correctly |
| C-03 | Safari / WebKit | CSS animations and click events behave identically to Chrome |
| C-04 | Mobile browser (iOS Safari / Android Chrome) | Game is playable by tapping; layout stacks correctly; no horizontal scroll |
| C-05 | `localStorage` unavailable (private mode) | App shows a graceful error or fallback rather than crashing silently |
