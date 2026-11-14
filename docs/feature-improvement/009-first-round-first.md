# 009: A new player's first stop is a round

## Player task
A brand-new player opens ClickAway and plays their first round, knowing what to do, without being pulled elsewhere.

Why it matters: first-session drop-off is the biggest loss in most games, and every screen before the first fun moment costs players ("time to first fun"). This is a well-supported pattern; the size of the effect here is a hypothesis, since there are no player numbers.

## Baseline (observed)
`NEW_PLAYER=1 ROUTE=play` captures a level 1 account with no rounds and onboarding not started (shots/009/before-*):
- The lobby offers three modes and build stats ("shrink ×0.96, combo every 5, charge ×1.00") with no explanation of the game.
- Two "NEW" badges (nav Armory, "View in Armory") pull the player to the Armory, where a build tutorial auto-starts before they've played.
- The game's own coaching (Practice → Casual) only begins after that Armory tour.
- Found while doing this: the lobby hides its header paragraphs for space, which also hid every onboarding coach's instructions, so the existing Practice/Casual coaching steps showed only "Step 2 of 3" with no text.

## Intended outcome (pass/fail)
- A brand-new account sees "Your first round", one sentence on how to play, Casual only, and a **Play** button visible without scrolling at 1440 and 390 wide.
- No Armory badge until the first round is done; after it, the badges and the Armory tour work as before.
- Not changed: players with any rounds; accounts in other onboarding states; a new player who opens a duel link (the duel takes priority).
- Coach instruction text is visible for every onboarding step.

Excluded: the Armory tour itself, Practice/Casual coaching content, rewards. Repair limit: two.

## Result
- `FIRST_ROUND_STEP` in `src/constants/gameOnboarding.js`; shown when onboarding is not started and the player has no rounds and no duel link.
- Mode locked to Casual, single mode card, "Play" button; badges hidden until a round exists (lobby and nav).
- Coach text made visible (`game-lobby.css`); the repeated "First round" label dropped.
- Checks: unit (onboarding steps), controller tests (new player / returning / duel link), lint. Shots: shots/009/after-*.

## Review (Sol, pass with issues) and repair 1
- Confirmed: Play fully on screen at 1440 and 390 with no scrolling; first round completes; no Armory pull before it; returning players and real duel links unaffected; badges and the Armory tour appear after the first round.
- Regression caused here: making coach text visible pushed Start below the fold on phones for the Practice and Casual coaching steps. Repair: every coached step shows only its own (locked) mode card. Measured Start bottoms at 390×844: 610, 697, 657 (nav starts at 784).
- Already there, fixed in the same repair: "Pressure" was clipped on the selected mode card on phones (tiles were 48px wide beside the emblem). The stat row now uses the card's full width; all three tiles measured inside the card.
- Already there, not fixed: on phones the Armory tour's second step puts its controls far below the screen. More visible now that the tour follows the first round; a candidate for the next trial.
