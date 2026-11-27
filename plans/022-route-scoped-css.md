# Plan 022: Feature CSS loads with its route instead of in one global bundle (spike, then first slice)

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- src/main.jsx src/styles src/app/routeModules.js`

## Status

- **Priority**: P3
- **Effort**: L (this plan does the measured first slice only)
- **Risk**: MED (cascade order changes can shift visuals)
- **Depends on**: 002 and 003 (visual regression tests are runnable and side-effect free)
- **Category**: perf / tech-debt
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`src/main.jsx` imports `src/styles/app.css`, which `@import`s every stylesheet
(about 35 files, about 968 KB raw). That includes Armory (about 245 KB) and the
stacked override layers `polish.css`, `game-feel.css` and `unslop.css`. Vite
builds them into one CSS file of about 694 KB that loads on `/login`, even
though the JavaScript routes are lazy (`src/app/routeModules.js`). The backlog
also calls the override layering a P1 health problem
(`docs/perfect-app-backlog.md` §0, "CSS is built up in layers of overrides").
`unslop.css` must stay last, because it is the final override layer.

## Design (first slice only)

Move **Armory** CSS to load with the Armory route:

1. Measure: `npm run build`, then record the sizes of `dist/assets/*.css`.
2. In `src/styles/app.css`, find the Armory imports
   (`grep -n "armory" src/styles/app.css`). Check whether any *later* file in
   `app.css` overrides Armory selectors:
   `grep -n "\.armory\|\[class\*=armory" src/styles/polish.css src/styles/game-feel.css src/styles/unslop.css`.
   If later layers override Armory rules, moving Armory CSS to load later
   would flip the cascade. Then also move those override blocks into a new
   `armory-overrides.css` imported right after the Armory CSS, in the same order.
3. Import the Armory CSS from the Armory route's entry component (find it in
   `routeModules.js`). Vite then emits a separate CSS chunk that loads with that route.
4. Run the visual regression suite (`npm run test:browser`, which includes
   `visual-cohesion.spec.js` screenshots, and `armory-fits-screen.spec.js`).
   Snapshots must match with no `--update-snapshots`.

## Scope

**In scope**: `src/styles/app.css`, the Armory CSS files (moved imports only,
no rule changes), the Armory route entry component (one import), a new
`src/styles/armory-overrides.css` if needed, and `docs/ui-foundation.md`
(one paragraph on the loading rule).

**Out of scope**: changing any CSS rule, other features (later slices), deleting layers.

## Steps

1. Build and measure. **Verify**: sizes in NOTES.
2. Check the cascade (step 2 above). **Verify**: the list of override selectors is in NOTES.
3. Move the imports. **Verify**: `npm run build` emits a separate CSS chunk for Armory, and the main CSS is smaller (numbers in NOTES).
4. **Verify**: `npm run test:browser` passes with zero snapshot diffs, and `npm test` passes.

## Done criteria

- [ ] The main CSS bundle is smaller by roughly the Armory size
- [ ] Browser visual tests pass with no snapshot updates
- [ ] Committed on `advisor/022-route-scoped-css`

## STOP conditions

- Any visual snapshot differs that was not already failing at `1a307d9`. Twelve browser tests fail at baseline (see plan 003, Revision 2), so compare against a baseline run on the same machine. Report which ones. Don't update snapshots.
- Armory selectors are styled from files that other routes also need.

## Maintenance notes

Later slices (Shop, Ladder, History) follow the same steps. The long-term fix
is folding `polish.css`, `game-feel.css` and `unslop.css` into the base files.
That's a separate, larger plan.
