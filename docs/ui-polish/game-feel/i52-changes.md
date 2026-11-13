# Round 52 changes (i51 → i52): run 6 opens with the art rework (PR #15)

Sol scored i51 at 9.37. Since then, PR #15 replaced most of the remaining hand-coded illustration with raster art that GPT-6.1 Terra generated. No council has read it yet. This round contains no new code: it is Sol's read of the merged art rework. Settings (10) and the mobile More menu (20) are unchanged byte for byte. Every other screen changed.

## Ratchet after i51
- Help's strip scenes and the spec-sheet assembly are back to their pre-r51 versions, because the r51 swaps had lost teaching cues and build information.
- The Armory featured part is enlarged.

## Illustrated world (all screens with the stadium or players)
- **Stadium:** the arena backdrop on Login, Sign-up, Play, Shop and the other menu pages is a painted stadium plate. Live lighting and the theme tint are separate layers on top of it.
- **Player portraits:** the default portraits on Profile, Duels, Ladder, the hovercard and the identity popover come from a roster of five illustrated characters. Each name always gets the same character, and Vector keeps a headset.
- **Rank crests:** six illustrated rank crests (unranked to diamond) appear on Ladder, the hovercard, Profile and promotion.

## Screen art
- **Profile (05):** achievement medals share one centre with category symbols. Each tier adds one visible detail: bronze rim, silver side tabs, gold short ribbon tails, platinum partial laurels, diamond fuller laurels plus a gem, and a crown on master. Progress rings and locks stay live.
- **Shop (04):** each button skin stands on a support set by its rarity: Common/Core a dish, Rare a ring, Epic a claw, Legendary a red cushion. The hero is an illustrated striped-awning booth.
- **Ladder (06, 15):** the podium plinths are generated images, with live rank labels on top.
- **Duels (07):** the stake area is an illustrated wooden platform holding the three score tokens.
- **Results (12):** the gold, silver and bronze performance medals are generated images. The clean-run and accuracy rules that decide them are unchanged.
- **Rank-up (13):** the division frame and the confetti cannons on each side are generated images. Confetti stays animated.
- **Help (09):** all 13 teaching scenes are illustrations. Countdown, score, combo and reset cues remain live text on the paper.
- **Armory (03, 16–18):** the build-identity emblems (control, pressure, utility, balanced) use illustrated art.

## Live round (11)
- A 15% black shade sits over the stadium during play, so the target stands out while the crowd stays visible. Targets, hit feedback and the HUD sit above the shade.

## Code
- 23 source files since r51: 267 lines added, 774 removed. The SVG construction is gone from PlayerPortrait, ArenaWorldArt and CrestIcon.
