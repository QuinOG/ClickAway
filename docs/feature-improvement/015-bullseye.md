# 015 · Bullseye

**Status:** accepted locally. Chosen by Claude under the 2026-11-15 hand-off, after the user asked to focus on core mechanics ("we have no players yet").

## Player task and why it matters
Each click in a round should be a small decision. Before this, a hit anywhere on the target scored the same, so the only skill was clicking quickly; aiming carefully earned nothing.

- **Observed:** `createRoundSimulation` scored a hit as base × combo × modifiers, with no use of where the click landed, although every hit already records its position and the server replays the target's geometry to check it.
- **Assumed (hypothesis, no player data):** a precision reward adds a speed-versus-accuracy choice that makes rounds more engaging and skill more visible.

## Design
- A hit within a third of the target's radius from its centre is a Bullseye and scores ×2 for that hit (`BULLSEYE_RADIUS_SHARE`, `BULLSEYE_POINTS_MULTIPLIER`).
- The server decides it from its own geometry replay (`replayRoundEvents` with seed and arena), never from a client flag; ghost duels score the same way using the arena size stored with each replay.
- The client classifies from the same rounded coordinates it records. Feedback "Bullseye ×2" in gold; Results tally counts them; Help explains it; a faint ring on every target marks the zone.

## Pass/fail conditions
1. A centre hit scores double and shows Bullseye feedback; an edge hit scores as before.
2. Server and client scores agree for the same event stream; client-supplied flags are ignored; seedless streams score as before.
3. Results shows the count, including through `GameOverFlow`, and falls back to the client's count when the server omits it.
4. Existing replays keep their target positions.

## Evidence
- Unit and server: `tests/bullseye.test.js`; UI: controller tests, `tests/bullseyeResults.test.jsx`.
- Play test in the browser (1280×800): a centre hit popped "+4 BULLSEYE ×2", an edge hit "+1"; Results "8 hits · 0 misses · 4 bullseyes".
- Built by Sol from Claude's spec. Claude's review found two problems, both fixed before merge: the count never reached Results (GameOverFlow didn't pass it on; Sol's test rendered the card directly), and the engine and geometry modules imported each other.

## Limitations
- Scores run higher than before; acceptable with no live players.
- Very small targets make the zone a few pixels wide; intended as late-round mastery.
