# Plan 005: An unsubmitted ranked round counts as a loss

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/index.js server/playerMysqlDatabase.js server/roundRewards.js server/roundToken.js src/features/game src/utils/rankUtils.js`
> Plans 004 and 011 may have changed these files on `improve/integration`.
> That's expected. Re-read the live code instead of trusting line numbers.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH (changes MMR outcomes for real players)
- **Depends on**: 004 (also edits round completion). 011 is preferred first, so integration tests exist.
- **Category**: security (fair play)
- **Planned at**: commit `1a307d9`, 2026-11-27
- **Product decision (from the owner, 2026-11-27)**: "Yes, an unsubmitted ranked round should count as a loss."

## Why this matters

`POST /api/round/start` signs a ranked round token and records nothing.
MMR changes only when `POST /api/round/complete` is submitted. A player whose
ranked round is going badly can close the tab or reload, and lose nothing.
Then they start again. This lets players dodge losses and inflates the ladder.
After this plan, the server records each issued ranked token as pending. A
pending round that is never submitted is settled as a loss, the same as
submitting a zero-score ranked round.

## Current state

- `server/index.js` `app.post("/api/round/start", ...)`: validates `modeId`,
  handles duel `challengeId`, then `signRoundToken({ userId, modeId, seed, challengeId }, JWT_SECRET)`.
  The token payload includes a fresh `roundId` UUID (`server/roundToken.js:15-31`).
  Expiry is 60 minutes.
- `server/index.js` `app.post("/api/round/complete", ...)`: verifies the token,
  simulates, calls `calculateRoundRewards({ modeId, hits, misses, score, bestStreak })`
  (`server/roundRewards.js`), then `completeUserRound({...})`.
- `completeUserRound` (`server/playerMysqlDatabase.js`, about lines 1920-2060):
  opens a transaction, locks the user row (`getUserStateRow(..., { forUpdate: true })`),
  claims the token with
  `INSERT INTO consumed_round_tokens (token_id, user_id) VALUES (?, ?) ON CONFLICT (token_id) DO NOTHING`
  (409 `RoundAlreadySubmittedError` on a duplicate), then applies
  `applyRankedMatchResult({ currentMmr, currentRankedState, hasRankedHistory, baseRankDelta, placementMatchScore, allowsRankProgression })`
  (`src/utils/rankUtils.js:519`) and writes the history row and lifetime stats.
- `consumed_round_tokens` is created in `initializeSchema()` (about line 363)
  and pruned at boot (`DELETE ... WHERE consumed_at < now() - interval '2 days'`).
- `round_history` columns: `id, user_id, mode, progression_mode, score, hits, misses, best_streak, coins_earned, xp_earned, rank_delta, played_at`,
  plus later `addColumnIfMissing` columns (about lines 166-250).
- Client (`src/features/game/hooks/useGameScreenController.js`, about lines 742-761):
  for ranked (`requiresRoundToken`) it requests the token, then calls
  `beginCountdown()` immediately on success. So issuing a token means the
  player committed to the round.

## Design

1. **Table** `pending_ranked_rounds (round_id varchar(64) PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE, mode_id varchar(50) NOT NULL, issued_at timestamptz NOT NULL DEFAULT now())`,
   plus an index on `user_id`. Created in `initializeSchema()`. Add it to
   `verifySchema()`'s expected tables if that list exists, and add an entry to
   `server/data/MIGRATIONS.md`.
2. **On ranked `/api/round/start`** (only when `mode.allowsRankProgression` and
   no `challengeId`): in one transaction, lock the user row, then **settle every
   existing pending ranked round for this user as a forfeit**, then insert the
   new pending row with the new token's `roundId`. This means `signRoundToken`
   must expose the `roundId`. Return it from the function or generate it in the
   route and pass it in. Keep the token payload the same.
3. **On `/api/round/complete`** with a token: inside `completeUserRound`'s
   transaction, `DELETE FROM pending_ranked_rounds WHERE round_id = ? AND user_id = ?`
   right after the token claim. If the row is already gone (it was settled as a
   forfeit because the player started another ranked round first), reject the
   submit with a new `RoundForfeitedError`. Map it in `server/routeErrors.js` to
   409 `{ error: "This ranked round was already counted as a loss because a new one was started." }`.
   For non-ranked rounds, skip the pending check.
4. **Forfeit settlement** is a function in `playerMysqlDatabase.js`,
   `settlePendingRankedRounds(connection, userId, { olderThanMs = 0 })`. For each
   pending row: compute rewards as a zero round,
   `calculateRoundRewards({ modeId, hits: 0, misses: 0, score: 0, bestStreak: 0 })`.
   Pass the reward calculator in as a parameter, or import it from
   `server/roundRewards.js` if that creates no import cycle. Apply
   `applyRankedMatchResult` exactly like `completeUserRound` does, update the
   user's MMR and ranked state, and insert a `round_history` row with score 0,
   `progression_mode` `ranked`, the applied `rank_delta`, and a new column
   `outcome varchar(20) NOT NULL DEFAULT 'completed'` set to `'forfeit'`.
   Insert the round id into `consumed_round_tokens` so the old token can never
   be submitted. Delete the pending row. No coins or XP. Don't count it toward
   lifetime hit stats.
5. **Lazy settlement of expired rounds.** Also call
   `settlePendingRankedRounds(..., { olderThanMs: 60 * 60 * 1000 })`, the token
   lifetime, at the start of `findUserProgressByUserId`'s caller in
   `GET /api/player/state` and `GET /api/auth/me`. Do this in a short
   transaction of its own, only when a pending row exists (cheap
   `SELECT 1 ... LIMIT 1` first). This makes an abandoned round show up as a
   loss the next time the player opens the app, even if they never start
   another ranked round.
6. **History display.** `round_history.outcome` must reach the client history
   entry as `outcome`. Find where history rows map to entries (`buildHistoryEntryFromRow`
   or similar, `grep -n "rank_delta AS" server/playerMysqlDatabase.js`).
   `src/pages/HistoryPage.jsx` shows a "Forfeit" label for those rows. Reuse the
   existing cell markup and add a plain text label. No new CSS.
7. **Client warning.** While a ranked round is in COUNTDOWN or PLAYING, the
   page registers a `beforeunload` handler (`event.preventDefault()`) so the
   browser asks before leaving. Show this one-line note in the Ranked ready
   state: "Leaving a ranked round after it starts counts as a loss." Find the
   Ranked copy in `src/features/game/components/roundOverlays/ReadyOverlay.jsx`.

## Scope

**In scope**: `server/index.js`, `server/roundToken.js`,
`server/playerMysqlDatabase.js`, `server/routeErrors.js`,
`server/data/MIGRATIONS.md`, `src/features/game/hooks/useGameScreenController.js`
(beforeunload only), `src/features/game/components/roundOverlays/ReadyOverlay.jsx`
(one line of copy), `src/pages/HistoryPage.jsx` (label only), the history-entry
normalizer it uses, new tests `tests/rankedForfeit.test.js`, and the slicing
tests from conventions.

**Out of scope**: rank math in `src/utils/rankUtils.js`, duel rounds, practice
and casual rounds, rewards for completed rounds.

## Steps

### Step 1: Schema (table, `outcome` column, MIGRATIONS entry)

**Verify**: `npm run test:unit` → `ℹ fail 0`.

### Step 2: `settlePendingRankedRounds` with unit tests

Use a fake connection like `tests/roundCompletionRoute.test.js` does. Cases:
- One pending row produces one forfeit history row with score 0, the negative
  delta from `applyRankedMatchResult`, MMR lowered, the token in
  `consumed_round_tokens`, and the pending row deleted.
- No pending rows means no writes.
- `olderThanMs` skips fresh rows.

**Verify**: `node --test tests/rankedForfeit.test.js` passes.

### Step 3: Wire the start route (settle, then insert pending)

Test: starting ranked twice settles the first as a forfeit.

**Verify**: the new test passes.

### Step 4: Wire completion (delete pending, or `RoundForfeitedError` → 409)

Tests:
- A normal ranked completion deletes its pending row and applies the real result once.
- Completion after a forfeit returns 409 and changes nothing.

**Verify**: `npm run test:unit` → `ℹ fail 0`.

### Step 5: Lazy settlement on `/api/player/state` and `/api/auth/me`

Test: a pending row older than 60 minutes is settled when state is read.

### Step 6: Client warning, ready note, and history "Forfeit" label

Add a UI test asserting the label renders for `outcome: "forfeit"`.

**Verify**: UI suite passes (uppercase path).

### Step 7: Full check

**Verify**: `npm run lint` and `npm test` exit 0.

## Done criteria

- [ ] Starting a second ranked round settles the first as a loss (test)
- [ ] An abandoned round older than the token lifetime is settled on the next state read (test)
- [ ] A completed ranked round is applied exactly once, and a forfeited token can't be submitted (tests)
- [ ] Practice, casual and duel rounds create no pending rows (test)
- [ ] `npm run lint` and `npm test` exit 0
- [ ] Only in-scope files changed. Committed on `advisor/005-ranked-forfeit-on-abandon`

## STOP conditions

- `completeUserRound` does not apply the rank result inside the same transaction as the token claim.
- A forfeit would need changes to `applyRankedMatchResult` (for example, placement rounds break with a zero score). Report how placement behaves.
- Importing `calculateRoundRewards` into the database module creates a circular import, and passing it as a parameter is not clean.

## Maintenance notes

- A player whose network drops after the server commits the round still gets
  the real result. The pending row is deleted in the same transaction as the
  rewards. A drop *before* the commit becomes a forfeit later. Plan 012 (retry
  after a lost response) reduces that case.
- Reviewers: check that forfeit settlement and completion both lock the user
  row first, in the same order, to avoid deadlocks.
- The `outcome` column could later mark other results (for example "void" for admin-voided rounds).
