# 011: A new player's first round ends with an unlock

## Player task
A new player finishes their first round and gets something new to use.

Why it matters: an early reward builds commitment to keep going (endowed progress), and the first session is where it counts. Before this, a first Casual round (about 160 XP) reached level 2, but the first new item was at level 4, so the round ended with "Unlocks at Lv 4". The effect size here is a hypothesis; there are no player numbers.

## Baseline (observed)
`PLAY_ROUND=1 NEW_PLAYER=1` (shots/011/before-*): the first Results shows "Unlocks at Lv 4 · Magnet…". On phones the card's title and label were cut off ("Magnet", "UNLOCKS AT LV 4" running off the card), which was also visible in 010's before shot for a different part.

## Intended outcome (pass/fail)
- A new player's first Casual round of normal play reaches level 2 and shows "Unlocked · Powerup: Magnet Center" with Equip.
- The unlock card's text fits on a 390-wide phone.
- Not changed: every other unlock level; existing players only gain access to Magnet earlier, nothing is taken away; desktop layout.

Excluded: further unlock pacing (level 5 Tempo Bastion, level 7 Combo Surge stay). Repair limit: two.

## Result
- `magnet_center` unlocks at level 2 instead of 4 (`src/constants/buildcraft.js`, shared by client and server).
- Phone layout (≤600px): the unlock card stacks icon above text and lets the name wrap (`game-play.css`).
- Pressing Equip on that first Results takes the player to the Armory, where the build tour now starts at the moment the build matters (see 009).
- Checks: unit (158) and full UI suite (228) pass. Shots: shots/011/before-*, after-*.
