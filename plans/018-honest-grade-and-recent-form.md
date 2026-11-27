# Plan 018: Round grade reflects round length, and Profile recent form compares like with like

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- src/features/game/components/roundOverlays/GameOverOverlay.jsx src/pages/ProfilePage.jsx`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

Hands-on review (`docs/perfect-app-backlog.md`, lines 23-33) found two
misleading results:

1. **Grade too generous.** A Casual round where the player stopped after about
   1.5 s got a B. The grade is the plain average of five 0–10 ratings
   (accuracy, streak, average speed, fastest, vs best). A few fast, accurate
   clicks score high on four of them, and "Vs best" is 10 when there is no best
   score.
2. **Profile "Last 7 rounds"** mixes Practice, Casual and Ranked scores in one
   trend ("+24%"). Practice is untimed and Ranked is 15 s, so the trend is noise.

## Current state

`src/features/game/components/roundOverlays/GameOverOverlay.jsx:67-91`:

```jsx
const clampRating = (value) => Math.max(0, Math.min(10, Math.round(value)))

function getRoundGrade(average) {
  if (average >= 9) return "S"
  if (average >= 7.5) return "A"
  if (average >= 6) return "B"
  if (average >= 4) return "C"
  return "D"
}

function getPerformanceStats({ accuracy, bestStreak, avgReactionMs, bestReactionMs, score, bestScore }) {
  // ... five stats with { label, value, rating } ...
  { label: "Vs best", value: normalizedBest ? `...%` : "New", rating: normalizedBest ? clampRating((score / normalizedBest) * 10) : 10 },
}
```

and at line 225: `const grade = getRoundGrade(stats.reduce((sum, stat) => sum + stat.rating, 0) / stats.length)`.

`src/pages/ProfilePage.jsx:58-85` `buildRecentForm(roundHistory)` takes the 7
newest rounds of any mode and computes `averageScore` and `trendPercent` over
them. Each bar already carries `mode` (`getModeLabelFromHistoryEntry`) and
`isRanked`.

## Design

1. **Grade.** Keep the five ratings and the letter thresholds. Add a cap from
   the round's hit count: fewer than 10 hits caps the grade at C, fewer than 20
   caps it at B. Also change the "New" rating (no best score) from 10 to 5, a
   neutral value. GameOverOverlay must already receive `hits` as a prop or
   value. Find it. Export `getRoundGrade` and a new `getGradeForRound({ stats, hits })`
   so they can be tested.
2. **Recent form.** Compute `averageScore` and `trendPercent` only over rounds
   in the same mode as the newest round (keep up to 7 of them). Return a new
   field, `trendModeLabel`, and render it next to the trend so the player can
   see which mode is compared. For example "Casual · +12%": find where
   `trendPercent` is rendered and add the label in the same element, using the
   existing classes. The bars may keep showing all modes.

## Scope

**In scope**: the two source files above. New tests `tests/roundGrade.test.js`
(or `.jsx` if JSX imports force vitest) and `tests/profileRecentForm.test.jsx`.
Existing tests that assert the old grade or trend may be updated to the new
rule. List each one in NOTES.

**Out of scope**: rewards, any server code, CSS beyond reusing existing classes.

## Steps

### Step 1: Grade cap and neutral "New" rating

Tests:
- 3 hits with perfect stats gives at most C.
- 15 hits with perfect stats gives at most B.
- 30 hits with perfect stats gives S.
- No best score gives a "Vs best" rating of 5.

**Verify**: the new grade test passes.

### Step 2: Same-mode recent form

Tests:
- Mixed modes with the newest Casual uses only Casual scores.
- `trendModeLabel` is "Casual".
- A single round gives trend 0.
- An empty history gives average 0, trend 0 and label null.

**Verify**: the new profile test passes.

### Step 3: Full check

**Verify**: `npm run lint` exits 0, and the UI suite passes from an uppercase path (`Test Files  N passed`, no failures).

## Done criteria

- [ ] New tests exist and pass
- [ ] `npm run lint` and `npm test` exit 0 (UI from uppercase path)
- [ ] Only in-scope files changed. Committed on `advisor/018-honest-grade-and-recent-form`

## STOP conditions

- GameOverOverlay has no access to the round's hit count.
- More than 3 existing tests assert the old grade letters. The thresholds may be used elsewhere, so report instead.

## Maintenance notes

The hit thresholds (10 and 20) suit 15 s and 30 s rounds. Revisit them if round lengths change.
