# Profile phone clipping cleanup

Reproduced with deterministic Playwright fixtures at 320x640, 360x740 and 390x844. Before/after evidence is in `shots/cleanup/{before,after}-phone-profile-{width}x{height}-{card,attributes,form,achievements}.png`.

The regression assertion failed against the original source. At 320px it reported the achievement heading, Economy tab, featured title/description/percentage, card description and next-page arrow outside a clipping ancestor, plus the player's name overflowing its text box vertically. Including inline labels also found the Nearest achievement kicker clipped at 320px and 360px.

Profile-only phone rules remove the achievement section's minimum-content width, wrap the heading and category buttons, stack the featured medal/title, and remove description line clamps and progress ellipses. Player names and attribute labels can wrap; gauges respect their card width. The carousel shows one achievement per page at widths up to 360px, preserving readable words and existing keyboard paging. Existing design materials, fonts and colors are retained.

`tests/e2e/profile-text-fits.spec.js` checks text scrollWidth <= clientWidth and text bounds against clipping ancestors for every category and carousel page at all three phone sizes. It also checks height where overflow clips text. The 1280x800 check compares all Profile element bounds with the new phone rules present and removed; geometry is unchanged. Screenshots are generated only with PROFILE_SHOTS=before/after.

Only `mobile-320-profile.png` was refreshed. Header, branding and shared global styles were not edited. Optional zz capture/manual audit tools are excluded from the assertion-based browser run, consistent with the preceding cleanup audit.

Validation:
- `npm run lint`: passed.
- `npm run test:unit`: 215/215 passed.
- `npx vitest run --config vitest.config.js`: the default run stalled during startup. The completed single-worker fork run covered 43 files / 285 tests: 283 passed, two Armory tests timed out at the default five-second limit. Both passed when retried with `--pool=threads --maxWorkers=1 --testTimeout=20000`: "renders three steps with the passive editor open by default" and "hovering a power does not change the build or cadence". All four Profile UI tests passed in the full run.
- `npm run build`: final build passed; an earlier attempt stopped with an esbuild service error.
- Focused Profile browser checks: 4/4 passed, including all categories/pages and unchanged 1280x800 geometry. Baseline assertion failures were confirmed before applying the fix.
- All eight assertion spec files in tests/e2e were exercised: 159 checks passed against the production build; the cold lazy route check requires intercepting `/src/pages/HistoryPage.jsx`, so its production attempt failed and its development-server rerun passed (1/1). This covers all 160 checks successfully across the two environments. Desktop Profile's existing visual snapshot passed without refresh.
- Refreshed snapshot: `tests/e2e/visual-cohesion.spec.js-snapshots/mobile-320-profile.png` only.
