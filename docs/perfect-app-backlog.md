# ClickAway — "Perfect App" Running Backlog

A living list of everything that would take ClickAway from "solid" to "done right".
Check items off as they land, add new ones at the bottom of their section, and keep
the notes short. Started 2026-11-25.

**Priority key:** `P0` = risk or blocker for real users · `P1` = clearly worth doing soon ·
`P2` = polish / nice to have · `P3` = someday / stretch

**Baseline when this list was written:** `npm run lint` clean, 277 unit tests + 345 UI
tests passing, production build succeeds. Gameplay, ranked, duels, shop, armory,
history, leaderboard and achievements (38) all exist. Most gaps are in operations,
accounts, and trust, not in core gameplay.

---

## 0. Hands-on review findings (2026-11-25)

From playing the app with mock data at desktop (1440×900) and phone (390×844) sizes,
then checking the code behind what showed up.

### Bugs and wrong behaviour
- [ ] `P1` **Grade is too generous.** A Casual round where the player stopped after ~1.5 s
      (score 34, PB 1,040) gets a **B**. `getRoundGrade` in `GameOverOverlay.jsx` averages five
      equal ratings; accuracy and speed stay high after quitting, and "vs best" is only 1/5 of it.
      Weight score heavily, or cap the grade when score is far below the player's average.
- [ ] `P1` **"Next round · Push for 1,041 points" after scoring 34.** The next-round goal ignores
      the round just played. Suggest a reachable step (e.g. the player's average, then PB).
- [ ] `P1` **Hit feedback covers the target on phone.** "+6" floats over the live target and
      "BULLSEYE ×2" text is clipped by the burst sprite. In a reaction game nothing may cover the
      next target. Move popups away from the target or fade them faster.
- [ ] `P2` Profile "Last 7 rounds" mixes Practice, Casual and Ranked scores in one trend ("+24%").
      Those modes have different rules, so the trend is meaningless. Filter by mode.
- [ ] `P2` Ladder shows "Season ending soon" with no date or countdown.
- [ ] `P2` The mock `dataState: "empty"` still shows level 12, 1,850 coins and records, so the
      **brand-new-player experience has never actually been captured or tested**. Fix the fixture,
      then review every page as a level-1 player.

### Design (my honest opinion)
- [ ] `P1` **The meta layer is heavier than the game.** The core is "click the moving target",
      but around it are Armory mods (tempo core, streak lens, power rig), powerups, spec sheets,
      compare modes, a test range, an unlock wall, blueprints, drills, duels, seasons, placements,
      daily goals, 38 achievements and a shop. A new player meets a lot of jargon before they've had
      fun. Hide the Armory until ~level 5, start with one loadout, and unlock systems one at a time.
- [ ] `P1` **Decide whether loadouts belong in Ranked.** Ranked uses the player's loadout, so
      "Anchor" gives 12% bigger targets for −12% score. That's fine if balance is airtight, but it
      makes rank partly about the build rather than skill. Options: a fixed standard loadout in Ranked,
      or a balance test that proves no build wins on rating gains.
- [ ] `P1` **The results screen hides the useful information.** Hits, accuracy, reaction time and
      what to improve are behind "Round details". Show 2–3 key stats and one specific tip right away.
- [ ] `P2` Too many top-level destinations (Play, Armory, Shop, Ladder, Duels, Profile, History,
      Help, Settings = 9). Fold History into Profile and Help into Settings/first-run.

### Codebase health (my honest opinion)
- [ ] `P1` **CSS is built up in layers of overrides.** `game-feel.css` (3.7k lines), `armory.css` +
      `game-armory.css` (6.6k), `polish.css`, `game.css` + `game-play.css`. That's the trace of many
      polish passes stacked on top of each other, and why the CSS bundle is 708 kB. Consolidate per
      component and delete overridden rules **before** more visual polish rounds.
- [ ] `P1` **Stop polishing, start playtesting.** The repo has four self-improvement loop skills,
      council screenshots, ~30 one-off `zz-*` capture specs and many audit/roadmap docs. Further
      model-judged polish has diminishing returns. The highest-value input now is 5–10 real people
      playing for a week, plus the analytics in §11 to see where they quit.

---

## 1. Accounts & identity

- [ ] `P0` **Password change** for a logged-in player (current password + new password).
- [ ] `P0` **Account recovery.** Today a forgotten password means a lost account. Options:
      email reset link (needs an email field + provider), or one-time recovery codes shown at signup.
- [ ] `P0` **Server-side session revocation.** Logout only clears the cookie; a copied 7-day JWT
      stays valid. Add a `token_version` (or session table) checked in `requireAuth`, bumped on
      logout-everywhere and password change.
- [ ] `P1` **Delete my account** (with confirmation) and **export my data** (JSON). Needed for GDPR/CCPA
      if the game has real users.
- [ ] `P1` "Log out of all devices" button.
- [ ] `P2` Optional email address on the profile (enables recovery + notifications).
- [ ] `P2` Username change, with a cooldown and old-name reservation window.
- [ ] `P2` Breached/common-password check on signup (local top-10k list, no external call needed).
- [ ] `P3` OAuth sign-in (Google/Discord/GitHub).
- [ ] `P3` Guest play that converts into a real account without losing progress.

## 2. Security & fair play

- [ ] `P0` **Security headers** (`helmet` or equivalent): Content-Security-Policy, `frame-ancestors`,
      `X-Content-Type-Options`, `Referrer-Policy`, HSTS in production.
- [ ] `P0` **Human-plausibility checks on round submissions.** The server validates round deadlines
      (`server/roundRewards.js`) but should also reject impossible play: sub-human reaction times,
      perfectly regular click intervals, impossible accuracy streaks. Flag rather than silently reward.
- [ ] `P1` Rate limits on every write route, not just auth and round (`/api/shop/*`, `/api/challenges`,
      `PUT /api/progress`).
- [ ] `P1` Audit `PUT /api/progress`: confirm it can never change coins, XP, MMR, or unlocks
      (only settings/loadout), and add a test that proves it.
- [ ] `P1` Account lockout / increasing delay after repeated failed logins per username (not just per IP).
- [ ] `P1` `npm audit` in CI and Dependabot/Renovate for dependency updates.
- [ ] `P2` Suspicious-result review queue for admins (ties into §3).
- [ ] `P2` Username profanity/impersonation filter (e.g. block "admin", "moderator", slurs).
- [ ] `P2` Run the `security-review` pass and record findings in `SECURITY_IMPLEMENTATION.md`.

## 3. Admin & moderation

- [ ] `P1` The `admin` role is seeded but unused. Add an admin-only area (route guard on server + client).
- [ ] `P1` Admin actions: view a player, reset/adjust coins/XP/MMR with an audit log entry, ban/unban,
      force username rename, remove a leaderboard entry.
- [ ] `P2` Admin view of flagged rounds (from §2 plausibility checks).
- [ ] `P2` Season controls: start/end a season, preview reward payout.
- [ ] `P3` Feature flags / kill switches (e.g. disable duels without a deploy).

## 4. Operations & reliability

- [ ] `P0` **CI pipeline** (GitHub Actions): lint → unit → UI → build on every push/PR;
      Playwright on PRs or nightly.
- [ ] `P0` **Real health check.** `/api/health` always returns `ok`; make it run `SELECT 1` and
      return 503 when the database is unreachable. Add a separate `/api/ready` if needed.
- [ ] `P1` **Graceful shutdown**: handle `SIGTERM`, stop accepting requests, let in-flight round
      saves finish, close the pg pool.
- [ ] `P1` **Structured logging** (pino or similar) with request IDs; no secrets/passwords in logs.
- [ ] `P1` **Error tracking** for server and browser (Sentry or equivalent), wired into `AppErrorBoundary`.
- [ ] `P1` Database backups verified by an actual restore drill; document the procedure.
- [ ] `P1` Staging environment that mirrors production (separate Supabase project).
- [ ] `P2` Uptime monitor + alert on the health endpoint.
- [ ] `P2` Basic metrics: request latency, error rate, rounds completed/hour, signups/day.
- [ ] `P2` Migrations run as a separate deploy step (the `DB_AUTO_MIGRATE=false` path), with a
      documented rollback for each migration.
- [ ] `P3` Load test the round-complete and leaderboard endpoints (e.g. k6) to know the ceiling.

## 5. Testing & code health

- [ ] `P1` **API integration tests against a real Postgres** (Docker or a throwaway Supabase branch):
      signup → login → start round → complete round → buy → equip → leaderboard.
- [ ] `P1` **Clean up `tests/e2e/`**: ~30 `zz-*` specs look like one-off screenshot/audit scripts.
      Move them to `tests/e2e/scratch/` (excluded by default) or delete, so `test:browser` is a real suite.
- [ ] `P1` Stop committing generated files under `test-results/` (keep only hand-written docs, or move
      them to `docs/`).
- [ ] `P2` Coverage reporting in CI, with a floor on `server/` and `src/game/engine/`.
- [ ] `P2` Split the biggest files: `useGameScreenController.js` (~1.8k lines), `playerMysqlDatabase.js`
      (~2.7k lines, also misnamed now that the DB is Postgres), `server/index.js` (~1k lines → routers).
- [ ] `P2` Type safety: JSDoc types checked by `tsc --checkJs`, or a gradual TypeScript migration,
      starting with server payloads and the round engine.
- [ ] `P2` Shared validation schemas (e.g. zod) used by both client and server for round/progress payloads.
- [ ] `P3` Mutation testing on the round engine and reward math.

## 6. Performance

- [ ] `P1` **CSS bundle is ~708 kB (135 kB gzipped)** in a single file. Split CSS per route alongside the
      already lazy-loaded JS pages, and prune dead selectors (there are many overlapping
      `game-*.css` / `polish.css` layers).
- [ ] `P2` Performance budget in CI (fail if JS/CSS gzip grows past a threshold).
- [ ] `P2` Image audit: serve AVIF/WebP with explicit sizes everywhere, preload the arena art on the game route.
- [ ] `P2` Cache headers for hashed assets (`immutable`, 1 year) from the Express static handler.
- [ ] `P2` Measure input latency on the arena (click → feedback) on a low-end Android device; this is
      a reaction game, so frame timing *is* the product.
- [ ] `P3` Leaderboard pagination/virtualization if the player count grows.

## 7. Gameplay & content

- [ ] `P1` **Tutorial that teaches by playing** for first-time players (one guided round), not just help text.
- [ ] `P1` Difficulty curve review using real round data: are Easy/Normal/Hard and ranked tiers spaced well?
- [ ] `P2` More modes for replay value: endless survival, precision-only, daily seeded challenge
      (everyone plays the same seed; the seeded RNG already exists).
- [ ] `P2` Weekly rotating modifiers (smaller targets, decoys, moving targets).
- [ ] `P2` Personal bests per mode with a "ghost" of your best run (duel ghosts already exist — reuse).
- [ ] `P2` More achievements in under-covered areas (duels, armory builds, streak recovery).
- [ ] `P3` Seasonal cosmetics and a season pass track.
- [ ] `P3` Custom/private lobbies with shareable codes.

## 8. Social & retention

- [ ] `P2` Friends list and a friends-only leaderboard.
- [ ] `P2` Shareable result card (image) after a round or a rank-up.
- [ ] `P2` Notifications for incoming duel challenges (in-app badge exists; add email/push opt-in).
- [ ] `P2` Daily login streak with gentle rewards (daily goals exist; tie them together).
- [ ] `P3` Spectate / watch replays of top players.
- [ ] `P3` Clans or teams.

## 9. Accessibility

- [ ] `P1` Full keyboard-only playthrough of every page, including the arena (keyboard target activation
      exists — verify end to end).
- [ ] `P1` Run axe on every route in CI (`@axe-core/playwright` is already a dev dependency).
- [ ] `P1` Colorblind-safe target/gold/decoy colors, or a colorblind mode with shapes as well as color.
- [ ] `P2` Reduced-motion audit across all animation layers (41 `prefers-reduced-motion` rules exist;
      confirm the confetti and overlay motion respect it too).
- [ ] `P2` Screen-reader announcements for round start, score, and results.
- [ ] `P2` Adjustable target size / timing assist for motor accessibility (excluded from ranked).

## 10. UX & polish

- [ ] `P1` Settings page that gathers everything in one place: audio, haptics, motion, account, privacy.
- [ ] `P2` Light theme (the app is dark-only via `color-scheme: dark`).
- [ ] `P2` Offline / poor-connection handling: queue round results and retry, with a clear banner.
- [ ] `P2` Installable PWA (manifest + service worker) — good fit for a phone game.
- [ ] `P2` SEO/social meta in `index.html`: description, Open Graph, Twitter card, theme-color.
- [ ] `P2` A public landing page for logged-out visitors that shows what the game is before signup.
- [ ] `P3` Localization framework (strings currently inline) — English first, structure for more.

## 11. Analytics & product insight

- [ ] `P2` Privacy-respecting product analytics: signup → first round → day-1/day-7 return funnel.
- [ ] `P2` Gameplay telemetry dashboards: average reaction time by mode, where players quit, which
      shop items sell.
- [ ] `P2` In-app feedback/bug report button that attaches app version and browser info.

## 12. Docs, legal & project hygiene

- [ ] `P1` LICENSE file (or an explicit "all rights reserved" statement).
- [ ] `P1` Privacy policy and terms of service pages (required once there are real accounts).
- [ ] `P2` Real versioning (package is `0.0.0`) + CHANGELOG, and show the version in the app footer/help.
- [ ] `P2` CONTRIBUTING.md: how to run, test, and the commit message format the repo uses.
- [ ] `P2` Architecture overview doc (one diagram: client → API → Postgres, round token flow).
- [ ] `P2` Consolidate the many roadmap/audit docs in `docs/` into one index so it's clear which are current.
- [ ] `P3` Delete or archive `server/data/clickaway.sql` (legacy MySQL snapshot) once nobody needs it.

---

## Suggested order of attack

1. **Trust the basics:** CI, real health check, security headers, graceful shutdown.
2. **Don't lose players:** password change, account recovery, session revocation.
3. **Keep it fair:** plausibility checks on rounds, write-route rate limits, admin tools.
4. **Make it fast and clean:** CSS split, e2e cleanup, API integration tests.
5. **Make it sticky:** tutorial round, daily seeded challenge, share cards, friends.

## Changelog of this list

- 2026-11-25 — Initial list.
- 2026-11-25 — Added §0 hands-on review findings (bugs, design and codebase opinions).
