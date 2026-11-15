# 016 · Gold targets

**Status:** accepted locally. Second core-mechanics trial, chosen by Claude after Bullseye (015).

## Player task and why it matters
Bullseye rewards precision; nothing yet rewarded reacting quickly to a moment in the round, and every target looked and played the same.

- **Observed:** all spawns were identical apart from size and position; reaction time was tracked but never scored.
- **Assumed (hypothesis):** an occasional, short-lived high-value target adds spikes of excitement and a reaction skill, without changing the base loop.

## Design
- About one spawn in ten (never the first) is gold. Hitting it within 1.5 s of its appearing scores ×3 for that hit, stacking with Bullseye (×6). After the window it plays as a normal target.
- Gold rolls come from a separate seeded stream (`deriveGoldSeed`), one draw per spawn, so every existing seed's target positions are unchanged. A spawn is a hit; powers never create one.
- The server classifies gold from its own geometry replay, never a client flag; ghosts score the same way.
- The target shows a gold rim and a ring that drains over the window (static ring with reduced motion). Feedback "Gold ×3" (or "Gold Bullseye ×6"); Results counts gold hits; Help explains it. The Test Range matches, with a local seed per run.

## Pass/fail conditions
1. Gold spawns are deterministic per seed, the first target is never gold, and the 1.5 s boundary is inclusive.
2. Target positions for existing seeds are unchanged.
3. Server and client scores agree; client flags are ignored; seedless rounds have no gold.
4. Results shows the gold count through `GameOverFlow`.

## Evidence
- Tests: `tests/goldTargets.test.js` (geometry, engine, server parity, positions unchanged), `tests/goldTargets.test.jsx` (controller and Results).
- Play test (1280×800, 60 hits): 3 gold spawns; a gold hit popped "+36 GOLD ×3"; Results "60 hits · 0 misses · 20 bullseyes · 3 gold".
- Built by Sol from Claude's spec. Review moved a React hook Sol had placed in the server-shared engine folder to the game hooks folder, and merged the gold styles with the Bullseye ring.
- Demo-player SQL regenerated so its stored duel scores include gold.

## Limitations
- Feedback popping near the arena edge can be partly clipped (true of all hit feedback).
