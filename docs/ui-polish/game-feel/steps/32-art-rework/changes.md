Consolidated Art rework: remaining illustration replacements and opaque gameplay backing

- Completed the remaining worthwhile illustration replacements with Terra in parallel: Help's 13 scenes, Armory identity emblems, Results performance medals, promotion frame/cannons, Ladder podium, Duel platform and Shop booth. Existing portraits, stadium, crests, achievement detail progression and rarity pedestals remain part of the same rework.
- Help teaching cues remain live HTML; Results preserve gold/silver/bronze performance conditions. Rank text, controls, selected-build diagrams, chart geometry, gauges and animation stay live.
- Added the requested solid dark arena backing so scenery cannot interfere with aiming. The backdrop does not intercept input; targets, hit feedback, countdown and HUD remain visible.
- Verified desktop/mobile layout, image loading, Help illustration bounds, target click handling, shop preview selection, Duel replay, and Ladder search. Full-app capture refreshes all 20 screens.
- Build and targeted component lint passed. Prior unrelated ShopHeroHeader unused-variable findings and the two baseline shop test failures remain documented. No new council rating; i51 Sol 9.37 is the last score.
- PR presentation: one Art rework section and one baseline-to-current screenshot table. Earlier screenshot comments retain their notes and link to that section.

See inventory.md for the source audit and intentional exclusions; domain subfolders hold supporting captures and asset notes.
