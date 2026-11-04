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
- g1: capture of `feda8a8` (round 6 build) — awaiting first review.
