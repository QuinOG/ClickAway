# Bug pass · Bullseye (015) and Gold targets (016)

Reviewed 2026-11-15. The pass was cut short by a usage limit, so the list may not be complete.

## Findings

| id | risk | severity | status | finding |
|---|---|---|---|---|
| S1 | 8 | medium | plan | A round submitted without a server token is scored by the server with no Bullseye or gold, so the saved score is far below the one the player saw. |
| S2 | 7 | low | plan | Replays stored before 015 have no arena size, so a duel against one compares a score with no multipliers to a challenger's score with them. |
| S3 | 2 | low | fixed | The Bullseye ring was painted up to 1.5px past the scoring zone, which on a 10px target is almost double the real zone. |
| S4 | 2 | low | fixed | With the OS reduced-motion setting the gold ring was hidden, and with the in-app setting it still drained; the record says it should be a static ring. |
| S5 | 1 | trivial | fixed | Results read "1 hits · 1 misses · 1 bullseyes". |

Checked and found consistent: client and server use the same rounded coordinates, the same geometry state and the same elapsed-time clock for Bullseye and gold in token rounds; the 1.5 s boundary is inclusive on both; powers and frozen hits behave the same on both; arena resize mid-round maps clicks back to the logical playfield; the Test Range uses the same classification; ghost replays stored since 015 replay with their stored arena size.

Not counted as a bug: ranked RR (`floor(score / 40)`) and the placement score bands were tuned for scores before the multipliers, so RR now rises faster. Record 015 already accepts higher scores; the RR tuning is a balance decision.

## Checks

- `npm run lint`: clean.
- `npm run test:unit`: 217 passed, 0 failed.
- `npx vitest run --config vitest.config.js`: 286 passed in 43 files.
- Not run: `npm run build` and the Playwright specs. The ring moved by about 1.5px, so `visual-cohesion.spec.js` (`desktop-1440-armory-range`, `*-play`) should be run before merge.

## Plan S1 · tokenless rounds lose Bullseye and gold on the server

**Repro.** Thirty centre hits, 400 ms apart, seed 38, arena 600×400, replayed through `simulateRound`:

| mode | client | server with token | server without token |
|---|---|---|---|
| Practice | 238 (30 bullseyes, 5 gold) | 238 | 95 (0, 0) |
| Casual | 274 (30 bullseyes, 5 gold) | 274 | 111 (0, 0) |

**Where it happens.** `server/index.js` takes the seed only from the round token; without one `roundSeed` stays `null` and `replayRoundEvents` runs with no geometry. The client always has a seed and always scores both mechanics. Two paths reach this: Practice, when `/round/start` fails or answers after the 3 s countdown, and a ghost race opened with `?replay=` and no challenge (always tokenless).

**What the player sees.** Results shows the client score; the tally shows the client's counts, then flips to none once the save returns `bullseyes: 0, goldHits: 0`; History stores the lower server score.

**Fix.**
1. Client: send the round's `seed` in `submitRound` (it is already passed to `onRoundComplete` but dropped in `clickAwayHttpApiClient.js`).
2. Server: when there is no token and the body has an integer seed in 0–0xffffffff plus valid arena dimensions, pass that seed to `simulateRound` for geometry. Keep it in a separate variable from the token seed, so replay storage, duel settlement, rewards and `countsTowardStats` stay tied to the token exactly as now.
3. If the seed or arena is missing or invalid, score seedless as today (old clients keep working).

**Risks.** Tokenless rounds gain geometry validation, so a stream that passed before can now be rejected; an honest client's stream passes the same check token rounds already use. History rows for these rounds will hold higher scores. The other reviewer should confirm whether tokenless rounds feed daily goals.

**Tests.** Server: a tokenless submission with seed and arena matches the client simulation; without a seed the score is unchanged; a forged seed cannot store a replay or earn rewards. Controller: `submitRound` receives the seed.

## Plan S2 · replays stored before 015

**Repro.** A replay with no `arenaWidth` in its snapshot replays seedless: ghost HUD 95 and stored score 95, while a challenger making the same clicks today scores 238.

**Cause.** Arena size was first stored with replays in commit `d446153` (015). Earlier replays cannot be rescored, because target positions depend on the arena size.

**Options.**
1. Recommended while there are no players: delete replays that lack `loadoutSnapshot.arenaWidth`, and the open duels that point at them, in a one-off script reviewed as a migration. Demo data is already regenerated.
2. Otherwise: have the replay and duel queries skip replays without an arena size, so they stay in History but cannot be raced.

The same gap applies to best scores and leaderboard rows saved before 015; a reset decision for those belongs with this one.

**Risks.** Stored data is removed or hidden; needs the user's go-ahead as a migration.
