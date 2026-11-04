# UI polish — handoff (resume point for a fresh chat)

PR #7 (`ui-ux-polish`). Phase 3 focus: **gameplay loop + Armory only** (leave other pages alone).

**Loop per round** (do not implement until all 3 ratings are in):
1. `SHOT_DIR=C:/Users/Quinlan/ui-shots/g<N> npx playwright test tests/e2e/zz-capture.spec.js --workers=1` (27 shots: loop + armory; rank-up seeded at 799 MMR).
2. Write `C:/Users/Quinlan/ui-shots/g<N>-changes.md` (what changed vs previous round).
3. Delegate 3 judges (Codex: `gpt-6.1-terra`, `gpt-6-astra`, `gpt-6.1-sol`, reasoningEffort high) with brief `C:/Users/Quinlan/ui-shots/council-brief-g.md`, replacing CURRENT_DIR / PREVIOUS_DIR / CHANGES_FILE.
4. Post ratings to PR #7 (`C:/Users/Quinlan/ui-shots/gh.sh POST /issues/7/comments <json>`), pick top consensus fixes, implement fully, run `npm run lint`, `npm run test`, `npm run build`, capture next round, commit + push, repeat.

**Exit:** average of the 3 scores ≥ 8, or 10 rounds (phase-3 round count starts at g1).
**Token rules:** Claude does not open screenshots (judges view them); keep judge replies ≤ ~350 words.
Styles live in `src/styles/game-*.css`; art in `src/components/art/`.

## Round log
- g1 (round-6 build): Terra 7.0, Astra 7.3, Sol 7.3 → **avg 7.2**. Fixes chosen: layout obstructions, armory stat deltas/exact values/compact rig, merged results + promotion emblem, live feel cues.
- g2 (round 1, `c14fb89`): Terra 7.0, Astra 7.5, Sol 7.6 → **avg 7.4** (posted to PR).
- **NEXT = round 2 → capture as g3.** Implement these consensus fixes:
  1. Practice lobby: 2nd drill row still clipped at Start — when Practice is selected, show all 4 drills in the left stage area (or a compact mode switch), Start in its own footer.
  2. Armory: shrink rig + build-bay sidebar, widen parts workspace, no truncated descriptions, consistent benefit/cost rows per part.
  3. Compare bench + mod cards: aligned installed → candidate numeric rows (shrink rate, min target, score %) with deltas; no adjectives as values.
  4. Live: one unmistakable hit boundary (drop extra concentric rings), strong miss X + "streak lost / -N" cue, next-multiplier indicator near HUD.
  5. Test-run results: show previous run under same rules beside latest + "Keep build" / "Back to slot" actions.
  6. Results: show newly unlocked part / level gain + Armory link; carry arena framing into results.
  Then write `C:/Users/Quinlan/ui-shots/g3-changes.md`, capture g3, commit, launch judges with PREVIOUS_DIR=g2.

Note: armory slot tabs are hidden; capture clicks `.armoryMachineHousing`. Results flow is now Play Again primary / View Rewards secondary (tests updated).
