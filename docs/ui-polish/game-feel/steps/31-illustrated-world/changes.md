Art follow-up after i51: illustrated portraits, stadium and rank crests

- Terra implemented the three requested opportunities in parallel: a five-character default portrait roster, a painted stadium plate and six rank crests (unranked through diamond). Static SVG construction was removed from PlayerPortrait, ArenaWorldArt and CrestIcon.
- Portrait assignment stays deterministic, named rivals retain their character assignments, and Vector retains the headset identity. Uploaded profile images and live rank labels remain separate.
- Kept stadium animation and theme tint as independent live layers over the raster plate. Checked auth, Play, Shop, Profile, Ladder and Duels at desktop and 390px; scripted image decoding found no broken image assets.
- Includes the corrected achievement progression documented in steps/30-gradual-detail-correction: side tabs, short ribbons, partial/full laurels, gem and crown additions. The old 140% center-disc scaling had hidden the mounts; that scaling is removed.
- Validation: production build, targeted ESLint for all three art components, all three achievementSync tests, category switching and mobile carousel boundary/navigation checks. The full app capture refreshes the PR's single baseline-to-current table. No new council rating.
- Existing unrelated limitations from the prior follow-up remain: two shop state-machine assertions fail on the unchanged baseline, and ShopHeroHeader has two unused-variable lint errors. This art pass does not change those components.
