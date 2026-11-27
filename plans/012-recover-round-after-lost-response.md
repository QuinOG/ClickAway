# Plan 012: A round whose save response was lost can be retried safely and shows the real outcome

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/app.js server/playerMysqlDatabase.js server/routeErrors.js src/features/game src/app`
> Plans 004, 005 and 011 changed round completion and its location. Re-read the live code.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (must keep rewards exactly-once)
- **Depends on**: 005 (pending ranked rounds), 011
- **Category**: bug
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

The client submits a finished round once
(`src/features/game/hooks/useGameScreenController.js`, about lines 1410-1460,
through `onRoundComplete`). If the connection drops after the server commits,
the player sees "This round couldn't be saved, so its rewards weren't added"
(`GameOverOverlay.jsx`, about line 274), even though the rewards *were* added.
If it drops before the commit, there is no retry button, and with plan 005 the
ranked round later becomes a forfeit. The server already makes rounds
single-use (`consumed_round_tokens`, `RoundAlreadySubmittedError` returns 409).
What's missing is (a) a way to ask "what happened to round X?" and (b) a retry.

## Design

1. **Record outcome by token.** Add `round_history_id bigint NULL` to
   `consumed_round_tokens` (`addColumnIfMissing`), set in `completeUserRound`
   after the history insert. Because it is in the same transaction, it is set
   exactly when the rewards commit.
2. **Idempotent replay of the response.** In `/api/round/complete`, when the
   token claim fails (duplicate), look up the consumed token row for this user.
   If it has a `round_history_id`, return **200** with
   `{ alreadySaved: true, historyEntry, progress, earnedCoins, earnedXp, rankDelta }`.
   Build the values from the stored history row plus a fresh
   `findUserProgressByUserId`. Fields the history row lacks (daily bonus split,
   rank progress before and after) may be omitted. The client must handle
   them being absent. If the token was consumed by a forfeit (plan 005), keep
   returning 409 with the forfeit message.
3. **Client retry.** In the save flow, a network error (no HTTP response) or a
   5xx sets `roundSave` to `{ status: "failed", retryable: true }`.
   `GameOverOverlay` shows a "Try saving again" button next to the failure
   message (reuse the existing secondary button class used in that file). It
   re-sends the identical payload, kept in a ref. Retry up to 3 times by hand,
   then hide the button. A response with `alreadySaved: true` is treated as
   success and shows the normal saved state.
4. Keep the copy plain. Failure text when a retry is possible: "This round
   hasn't been confirmed yet. Check your connection and try again."

## Revision 2 (2026-11-27, after plan 005 landed)

Plan 005 added a pending-round check inside `completeUserRound`. It runs
`DELETE FROM pending_ranked_rounds ...` and throws `RoundForfeitedError` when
nothing was deleted. That check currently runs **before** the
`if (!claim.affectedRows) throw new RoundAlreadySubmittedError()` check. So a
duplicate submit of a *completed* ranked round gets the forfeit message. Fix
this as part of this plan:

- Evaluate the token claim first. If the claim fails, decide between three outcomes:
  - (a) The consumed token has a `round_history_id`: the round was completed. Return 200 `alreadySaved` (Design step 2).
  - (b) The token was consumed by a forfeit: 409 with the forfeit message. Plan 005's forfeit settlement inserts into `consumed_round_tokens`. Have it set `round_history_id` to the forfeit history row and check that row's `outcome = 'forfeit'`. Or add a `consumed_by varchar(20)` column. Pick one and explain it in NOTES.
  - (c) Otherwise, the existing `RoundAlreadySubmittedError`.
- Run the pending check only after a successful claim.
- Integration tests are discovered by glob (`tests/integration/*.test.js`).
  `tests/integration/server.test.js` already has ranked forfeit cases from
  plan 005. Keep them passing.

## Scope

**In scope**: `server/app.js` (or wherever `/api/round/complete` lives),
`server/playerMysqlDatabase.js` (column, completion, lookup function),
`server/data/MIGRATIONS.md`, the client save path
(`useGameScreenController.js` and whichever `src/app/*` module implements
`onRoundComplete`; find it with `grep -rn "onRoundComplete" src/app src/App.jsx`),
`GameOverOverlay.jsx` (button and copy), tests (unit, UI and integration).

**Out of scope**: reward math, plan 005's forfeit logic (only read it).

## Steps

1. Column and completion write. **Verify**: `npm run test:unit` → `ℹ fail 0`.
2. Duplicate token returns 200 `alreadySaved`. Integration test: complete a round, submit the same body again → 200, `alreadySaved: true`, and coins unchanged after the second call. **Verify**: `npm run test:integration` passes.
3. Client retry. UI test: a mocked first save rejects with a network error → the retry button appears. Clicking it resolves → "saved" state. A mocked `alreadySaved` response → "saved". **Verify**: UI suite passes.
4. **Verify**: `npm run lint`, `npm test` and `npm run test:integration` exit 0.

## Done criteria

- [ ] Re-submitting a saved round returns 200 `alreadySaved` and awards nothing twice (integration test)
- [ ] The retry button appears only for network or 5xx failures (UI test)
- [ ] Committed on `advisor/012-recover-round-after-lost-response`

## STOP conditions

- `completeUserRound` inserts the history row outside the transaction that claims the token.
- The client save path is shared with non-round mutations in a way that makes a retry unsafe.

## Maintenance notes

Tokens are pruned after 2 days, so a retry later than that gets a normal "token
expired" error. Tokens expire after 60 minutes anyway.
