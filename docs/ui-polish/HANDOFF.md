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
- g3 (round 2, `db86132`): Terra 7.0, Astra 7.6, Sol 7.4 → **avg 7.3** (posted). Capture trimmed to 12 shots (6 loop, 6 armory) — keep it that way.
- g4 (round 3, `df4643a`): Terra 7.2, Astra 7.6, Sol 7.5 → **avg 7.43** (comment 6641958590).
- g5 (round 4, `41d61cf`): Terra 7.0; Astra and Sol FAILED (ChatGPT usage limit). Partial posted (comment 6642243319).
- **NEXT:** once the limit resets, re-run Astra + Sol on g5 (PREVIOUS_DIR=g4, CHANGES_FILE=g5-changes.md), average, post; then round 5 → g6. Must-fix: rig ring overlaps slot-card names (armoryMachineRig in game-armory.css r4 block). Also Terra: HUD readouts closer together/bigger timer, streak milestones transform arena, emphasise one selected part candidate, results/rank-up hero emblem.
  1. Armory rig regression: r2 shrank rig → slot names + powerups truncated ("Ti…"). Restore full names; powerups as full-width rows (name + charge timing) under a compact rig; collapse installed-part card into a compact baseline header.
  2. Results: fold "View Rewards" settlement into the main results screen (one screen); feature the unlocked/next part with icon, benefit, and Equip/Test-in-Armory action.
  3. Live: enlarge next-multiplier countdown beside streak (`.hudComboNext`); miss text high contrast (replace dark-on-red "STREAK LOST" stamp with bright text + lost-streak count); distinguish streak-heat vs failure frame.
  4. Overlays: compare bench + unlock wall must sit below nav (top ≥ 78px), pinned header, internal scroll; unlock wall compact category tabs.
  5. Test-run results: label each run with its build/changed parts; add Score row.
  6. Part identity: distinct illustrated silhouettes per core/lens/rig (src/components/art), used in rig, part cards, unlocks.

Note: armory slot tabs are hidden; capture clicks `.armoryMachineHousing`. Results flow is now Play Again primary / View Rewards secondary (tests updated).


## One-change rounds (no judges, from 2026-11-04)
Each round = one major visible change, before/after in docs/ui-polish/rN/. Capture: SCENE=armory|live|rankup SHOT=<png> npx playwright test tests/e2e/zz-one.spec.js --workers=1
- r5: Armory core on its own stage, slot cards in a toned row beneath (fixes ring/name overlap)
- r6: centred HUD cluster, 132px timer medallion between score and streak
- r7: promotion ceremony: 220px tier-tinted crest hero, tier ribbon, 360px primary CTA, rematch as text link
- r8: results spotlight: unlocked/next part as a 156px emblem hero card in the empty right column; 112px final score
- r9: streak milestones relight the arena (lights, floor grid, heat glow recolour cyan>teal>gold>orange>pink) + giant outline HOT / ON FIRE / UNSTOPPABLE mark
- r10: Armory parts: featured candidate card (112px emblem, name, You gain / You give up columns, Install) above a compact tile picker; hover/focus features a part
- r11: test-run results as a duel: previous vs latest score plates (64px, VS), winner glows green/red, verdict pill; score row removed from table
Next candidates: miss feedback; lobby.
