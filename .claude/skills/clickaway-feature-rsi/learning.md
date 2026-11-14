# Feature RSI learning

## Active lessons

1. (Provisional, 1 supporting run) On Windows, write non-ASCII UI text with the Edit/Write tools, not a PowerShell pipe or here-string, then grep the changed files for stray `?` or U+FFFD. Scope: any trial that adds copy containing `·`, `—`, or similar characters. Test: the next trial that adds such copy finds no garbled characters in review.

2. (Provisional, 1 supporting run) For any change that moves or adds visible UI, measure element positions in a real browser at 1440 and 390 wide before review (bounding boxes, not screenshot reading). Scope: layout-affecting trials. Test: in trial 002 this caught a note covering the chart's bars on phone before the reviewer saw it.

3. (Strong: direct user feedback, 2026-11-13) Reviewers judged whether each change worked, never whether it was wanted or better than before. That let trials 1-2 make History worse and trial 6 add something the user didn't want. Get the user's OK before adding a feature they didn't ask for, and judge each change against what was there before, not only against its own pass conditions.

4. (Provisional, 1 supporting run) Before trusting any browser capture or Playwright result, check which process serves port 4173. Playwright reuses an existing server, and agents leave dev servers running in their worktrees. Run 2 got unchanged "after" shots and a false all-pass from another worktree's server. Scope: every capture and browser suite run. Test: the next run checks the port owner first and runs captures from its own server on another port (`SHOT_BASE_URL`).

5. (Provisional, 1 supporting run) When a change adds or reveals text in a shared component, measure the primary action at 390 wide in every state that uses the component, not just the one being changed. In 009, revealing coach text for new players pushed Start off the screen for two other onboarding states. Scope: shared lobby, Results and dialog components. Test: the next trial touching a shared component lists the states it measured.

## Recent runs

- **Run 1 (001–006, 2026-11-12), summarised:** History filter and mode control, Ladder→Duel, Ladder phone controls, Ladder no-match search, Duel picker keyboard. Five accepted locally after Sol reviews (one or two repairs each), one unverified. Lessons came from phone hand-offs, clipped controls and a stale-rank bug in a repair.
- **Run 1 outcome (2026-11-13, user review):** History trials 1-2 and trial 6 were reverted at the user's request. Trials 3-5 were kept with follow-ups: trial 5's Clear search button was removed and its text inset fixed; trial 4 was extended so Ladder rows stack on phones instead of spilling off-screen.
- **009 first round first (2026-11-14): accepted locally after repair 1.** Selection: observed onboarding order (Armory tour before any play) plus time-to-first-fun research; demand a hypothesis. Sol: pass with issues; it caught a regression the trial caused (coach text pushed Start off phones in other onboarding states) and two older clipped/off-screen problems that became trials or repairs.
- **010 next-round goal (2026-11-14): accepted locally.** Near-miss/goal-gradient line above Play Again. Sol: pass, arithmetic checked in every case.
- **011 first-round unlock (2026-11-14): accepted locally after repair 1.** Magnet to level 2; phone unlock card stacked. Sol: pass with issues (Equip landed on the wrong Armory view; fixed). One reported "double count" was a level achievement working correctly.
- **012 Armory tour on phones (2026-11-14): accepted locally with a limitation after repair 1.** Sol (high): fail on the wider task, because the card fit but covered what the steps described, and blocked a desktop click. Repair: the card sits away from the target on wide screens, and scroll room on phones. A bottom card still covers the lowest third of a phone screen until the player scrolls.
- **013 daily double XP (2026-11-14): accepted locally after repair 1.** Server-awarded, decided under the row lock. Sol (high): pass with issues; the lobby inferred eligibility from 50 loaded rounds, so the server now reports it.
- **Run 2 notes (2026-11-14):** The user delegated selection ("decide based on game behaviour research") and asked Claude to build because Codex was ahead of pace. Claude built all five; Sol did three reviews (one covered two related trials, a deliberate cost saving). Two browser checks gave stale results because Playwright reused a dev server from another worktree; it was found by a Ladder snapshot failing only after the stale server was stopped. The skill's "don't restyle working UI" rule held: every UI change sat beside existing controls or fixed breakage.
