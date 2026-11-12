Achievement art follow-up after i51: simple medals with gradual tier detail

- User direction: a mix of gradual progression and simple medals throughout; share medal designs across categories and change the central category symbol.
- Terra generated six versioned rims, including bronze. Replaced oversized wings, ribbons and burst mounts with matched circular footprints and small material/edge changes. Removed the CSS shield/star/hexagon/diamond disc cutouts.
- Kept live category symbols, progress rings, locks, category tabs and achievement descriptions.
- Verified all six tier image references in the app, desktop profile and 390px mobile, unlocked/progressing/locked examples, category switching, mobile next/previous navigation and the final-page boundary. Build, targeted component ESLint and all three achievementSync tests passed.
- No new council score; Sol's last recorded score remains i51 9.37. Existing unrelated shop state-machine failures and ShopHeroHeader lint findings remain documented in the prior follow-up.

Other artwork opportunities (Terra source audit):

1. Default player portraits: src/components/art/PlayerPortrait.jsx draws name-based SVG portraits used on Profile, Duels and Ladder. A small illustrated roster can preserve deterministic name-based selection and uploaded images. Recommended next batch.
2. Stadium backdrop: src/components/art/ArenaWorldArt.jsx draws the stadium and is reused by auth arrival and shop scenes. A wide illustrated plate needs careful mobile cropping; leave lighting animation and interactive elements separate.
3. Rank crests: src/components/art/GameIcons.jsx draws rank shields reused by leaderboard and hover cards. A restrained matched tier set can keep live rank text and mappings.

These are opportunities, not implemented changes in this commit. Existing Armory part and power illustrations already use raster assets.
