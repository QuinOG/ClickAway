# Phase E3 — Full Cohesion and Regression Review

Date: 2026-07-12  
Status: release gate implemented; checklist signed off by the automated E3 suite

## Outcome

ClickAway now has a repeatable browser-level release gate in addition to its unit and component suites. The gate verifies the shared shell and every authenticated route as one product, exercises the supported responsive range, checks serious/critical accessibility findings, covers input and feedback preference combinations, captures stable visual baselines, and runs representative account, commerce, competition, loading, failure, and gameplay journeys.

## Release matrix

| Area | Automated coverage | Gate |
|---|---|---|
| Visual cohesion | Login plus all eight authenticated scenes at 320×844 and 1440×1000 | Pixel baseline, 1% maximum changed-pixel ratio |
| Responsive layout | 320, 360, 390, 430, 667×375 landscape, 768, 1024 short laptop, and 1440 | No document overflow or clipped primary action |
| Accessibility | All authenticated scenes at 390×844, including color contrast | No serious or critical axe violations |
| Inputs | Keyboard navigation/focus restoration, touch mode selection/navigation, pointer tooltip discovery | Equivalent route and selection outcomes |
| Preferences | Reduced motion, mute/unmute, optional haptics, saved root attributes | State persists and optional feedback remains independent |
| Resilience | Session calibration, cold lazy route, sparse, empty, API error/retry, history exhaustion | Branded state and recovery action remain available |
| Critical journeys | Login/logout, Shop unlock→equip, duel accept/create, History pagination, Ladder board/view filters, Practice keyboard start | Source state and destination state remain continuous |
| Static cohesion | Catalog asset existence, canonical Ladder terminology, shared hidden-announcement primitive | Node contract tests |

The browser fixtures intercept API calls with deterministic rich, sparse, empty, and error data. This keeps screenshots and behavior checks stable without weakening production API contracts.

## Integration defects closed

1. Returning mature accounts could stack every historical achievement toast, obscuring the entire 320px viewport. Achievement reconciliation is now silent on hydration and deduplicated for the lifetime of a session; genuinely new unlocks still announce once.
2. Exact mode-rule descriptions used an undefined `srOnly` class and rendered visibly inside the 320px mode rail. Game announcements now use the shared `uiVisuallyHidden` primitive, and the duplicate local hiding rule was removed.
3. Armory unlock-batch and Shop preview labels were attached to generic `div` elements without permitted roles. The batch is now a labelled group and the preview is a labelled image.
4. Ladder top/around-me controls communicated selection only through styling. They now expose `aria-pressed` state.
5. Player-facing Help and accessibility labels mixed “Leaderboard” with the canonical “Ladder” route term. Field-guide and Ladder control copy now use the canonical term; internal API/component identifiers remain unchanged.
6. “Cosmetic Armory” competed with the distinct buildcraft Armory route. The Shop scene now identifies itself as “Cosmetic shop.”

## Duplicate and drift closure

- Shared status, action, scene, and visually-hidden primitives remain the canonical implementations.
- The obsolete countdown-only `.srOnly` CSS implementation was removed.
- Source identifiers such as `LeaderboardPage`, `/leaderboard`, `fetchLeaderboard`, and `ChallengesPage` are retained as compatibility contracts; they are not player-facing terminology drift.
- Dense History and Ladder tables remain secondary tools below their trajectory/podium compositions, consistent with the roadmap contract.

## Accepted exception log

| ID | Boundary | Risk | Owner / disposition |
|---|---|---|---|
| E3-EX-01 | Touch and vibration are browser-emulated; physical iOS/Android haptic strength and safe-area rendering are not measurable in this repository. | Non-critical device variance. | Release QA — verify on one modern iOS and Android device before mobile-store or formal device certification. |
| E3-EX-02 | Intermediate widths receive structural overflow/input coverage rather than dedicated pixel baselines. | Low visual drift between endpoint baselines. | Frontend — endpoint snapshots plus the eight-width matrix are the maintained gate; add a baseline only when a new breakpoint is introduced. |

No known critical product regression is accepted.

## Release commands

```text
npm run test:release
npm run test:browser:update   # intentional visual changes only
```

The release command runs lint, Node unit contracts, Vitest UI/component tests, the Playwright browser/a11y/visual matrix, and the production build. Browser installation for a fresh CI worker is `npx playwright install chromium`.

