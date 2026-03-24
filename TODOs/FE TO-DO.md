# Frontend Backlog

This backlog is a set of incremental, Codex-ready frontend tasks for the current React/Vite app. Each item is intentionally scoped to be independently shippable, low risk, and implementation-focused without broad rewrites.

## High Priority

### Replace Mock Data Fallbacks With Proper Empty States
**Why it matters**  
History and leaderboard currently show mock content when real player data is missing, which makes the UI feel misleading and weakens trust.

**Affected files/components**  
`src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/features/history/historyData.js`, `src/features/leaderboard/leaderboardData.js`, shared table/empty-state styles as needed

**Codex prompt**
```text
Replace the mock-data fallbacks on the History and Leaderboard pages with proper empty states.

Scope:
- Update `src/pages/HistoryPage.jsx` so it no longer renders `MOCK_HISTORY` when the player has no real history.
- Update `src/pages/LeaderboardPage.jsx` so it no longer injects `MOCK_LEADERBOARD` into the live page flow.
- Keep the existing page layouts and overall visual style intact.
- Add clear, polished empty states that explain why the page is empty and what the player should do next.
- Preserve existing behavior for real data.

Constraints:
- Do not redesign unrelated areas.
- Do not add backend work or new API dependencies.
- Keep the changes independently shippable and frontend-only.
- If the mock constants are no longer needed by the live UI, remove or isolate them cleanly without affecting other files.

Return:
- updated code
- brief summary
- verification of the empty-state behavior for both pages
```

### Improve Leaderboard Row Accessibility And Interaction Semantics
**Why it matters**  
The leaderboard currently uses clickable table rows with keyboard handlers and a placeholder `console.log`, which creates accessibility and interaction issues for keyboard and assistive technology users.

**Affected files/components**  
`src/pages/LeaderboardPage.jsx`, `src/components/PlayerHoverCard.jsx`, `src/styles/layout.css`, `src/styles/components/tables.css`

**Codex prompt**
```text
Improve the accessibility and interaction semantics of the leaderboard without redesigning the page.

Scope:
- Refactor `src/pages/LeaderboardPage.jsx` so interactive behavior is attached to proper interactive elements instead of relying on clickable `<tr>` rows.
- Preserve sorting, current-user highlighting, and the existing hover-card concept.
- Remove the non-production `console.log` placeholder path and replace it with a clean no-op or intentional disabled behavior for non-self profiles, unless a better frontend-only behavior already fits the current design.
- Ensure keyboard users can reach the intended action reliably.
- Keep table semantics correct and avoid breaking the current layout.

Constraints:
- Do not redesign unrelated areas.
- Preserve existing visible behavior unless needed to fix accessibility/semantic issues.
- Do not add backend profile navigation work.
- Keep the implementation independently shippable and low risk.

Return:
- updated code
- brief summary
- verification covering keyboard interaction, row action semantics, and table accessibility
```

### Add Mobile-Friendly Containment For Shared Tables
**Why it matters**  
The shared table styles do not currently provide strong containment on small screens, which risks overflow, clipping, and poor readability across history, help, and leaderboard views.

**Affected files/components**  
`src/styles/components/tables.css`, `src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/pages/HelpPage.jsx`

**Codex prompt**
```text
Add responsive containment for the shared table system so tables remain usable on small screens.

Scope:
- Update `src/styles/components/tables.css` to support horizontal scrolling, safe spacing, and mobile readability for existing tables.
- Apply the solution in a way that works for the History, Leaderboard, and Help pages.
- Preserve the current desktop appearance as much as possible.
- If minimal wrapper markup is needed in page components, keep it small and consistent.

Constraints:
- Do not redesign unrelated areas.
- Preserve existing table content and sorting behavior.
- Do not convert tables into cards or introduce a new table system.
- Keep the solution independently shippable and low risk.

Return:
- updated code
- brief summary
- verification for narrow viewport behavior on history, leaderboard, and help tables
```

### Tighten Tab Accessibility For Shop And Profile Achievement Tabs
**Why it matters**  
The app uses tab semantics in multiple places, but the current implementations do not fully manage keyboard movement and tab-panel relationships.

**Affected files/components**  
`src/features/shop/components/ShopCategoryTabs.jsx`, `src/pages/ShopPage.jsx`, `src/pages/ProfilePage.jsx`, related styles only if needed

**Codex prompt**
```text
Improve tab accessibility and keyboard behavior for the shop category tabs and the profile achievement category tabs.

Scope:
- Update `src/features/shop/components/ShopCategoryTabs.jsx` and the related shop page usage so the tablist has stronger accessibility semantics.
- Update the achievement category tab UI inside `src/pages/ProfilePage.jsx` with the same standard.
- Support expected keyboard behavior for tablists, including arrow-key movement where appropriate.
- Add proper IDs, selected state linkage, and panel relationships where needed.
- Preserve the current visual design and existing active-tab behavior.

Constraints:
- Do not redesign unrelated areas.
- Do not rewrite these flows into a new component system unless a very small shared helper meaningfully reduces duplication.
- Preserve existing behavior except for accessibility improvements.
- Keep the implementation independently shippable and low risk.

Return:
- updated code
- brief summary
- verification covering keyboard navigation and tab semantics in both locations
```

### Improve Navbar And Profile Hover-Card Accessibility
**Why it matters**  
The navbar profile hover card is primarily hover-driven, which leaves keyboard and touch users with weaker access to the same quick stats.

**Affected files/components**  
`src/components/Navbar.jsx`, `src/components/PlayerHoverCard.jsx`, `src/styles/layout.css`

**Codex prompt**
```text
Improve the accessibility of the navbar profile hover-card interaction without redesigning the top navigation.

Scope:
- Update the profile nav interaction in `src/components/Navbar.jsx` so the quick-stats card is accessible to keyboard users and behaves reasonably on non-hover devices.
- Update `src/styles/layout.css` only as needed to support the improved interaction.
- Keep the current hover behavior for mouse users if it still fits after the change.
- Preserve the current visual treatment and the existing quick-stats content from `src/components/PlayerHoverCard.jsx`.

Constraints:
- Do not redesign unrelated areas.
- Do not add new routes or backend work.
- Preserve existing content and visual style unless a small polish improvement is required for clarity.
- Keep the change independently shippable and low risk.

Return:
- updated code
- brief summary
- verification covering mouse, keyboard, and touch/non-hover access
```

## Medium Priority

### Extract Shared Auth Form Validation And Hint Logic
**Why it matters**  
The login and signup pages duplicate touched-field tracking, validation timing, and hint generation, which makes the auth UI harder to maintain consistently.

**Affected files/components**  
`src/pages/LoginPage.jsx`, `src/pages/SignupPage.jsx`, `src/components/auth/AuthInputField.jsx`, new helper or hook file under `src/components/auth` or `src/hooks`

**Codex prompt**
```text
Refactor the duplicated auth form validation and hint logic into shared frontend utilities.

Scope:
- Reduce duplication between `src/pages/LoginPage.jsx` and `src/pages/SignupPage.jsx`.
- Extract shared field-touch, submit-state, or hint-generation logic into a small helper or dedicated hook.
- Preserve the current validation messages and current UX unless a tiny consistency improvement is clearly beneficial.
- Keep `src/components/auth/AuthInputField.jsx` simple and reusable.

Constraints:
- Do not redesign unrelated areas.
- Do not change auth API behavior.
- Preserve existing behavior unless a minor consistency fix is necessary.
- Keep the refactor independently shippable and low risk.

Return:
- updated code
- brief summary
- verification that login and signup still behave the same from a user perspective
```

### Break Down Oversized Frontend Components Without Changing Behavior
**Why it matters**  
A few large page/feature files carry too many UI responsibilities, which makes them harder to read, test, and evolve safely.

**Affected files/components**  
`src/pages/ProfilePage.jsx`, `src/features/game/components/roundOverlays/GameOverOverlay.jsx`, optionally `src/features/game/hooks/useGameScreenController.js`

**Codex prompt**
```text
Break down the largest frontend components into smaller units while preserving current behavior.

Scope:
- Start with `src/pages/ProfilePage.jsx` and `src/features/game/components/roundOverlays/GameOverOverlay.jsx`.
- If there is a clean, low-risk follow-up extraction in `src/features/game/hooks/useGameScreenController.js`, include it only if it improves clarity without changing logic.
- Extract self-contained presentational sections or helper logic into nearby components/utilities.
- Preserve current UI, copy, and behavior.

Constraints:
- Do not redesign unrelated areas.
- Do not change gameplay logic, profile calculations, or route behavior.
- Prefer small, readable extractions over deep architecture changes.
- Keep the refactor independently shippable and low risk.

Return:
- updated code
- brief summary
- verification that behavior and rendered output are preserved
```

### Consolidate Repeated Formatting And Parsing Utilities
**Why it matters**  
The frontend repeats number formatting, signed-value formatting, coin formatting, and accuracy parsing across multiple files, which invites drift and inconsistent output.

**Affected files/components**  
`src/pages/LeaderboardPage.jsx`, `src/pages/ProfilePage.jsx`, `src/components/PlayerHoverCard.jsx`, `src/features/shop/components/ShopItemCard.jsx`, `src/features/shop/components/ShopHeroHeader.jsx`, `src/features/game/components/roundOverlays/GameOverOverlay.jsx`, related utility files

**Codex prompt**
```text
Consolidate repeated frontend formatting and parsing helpers into shared utilities.

Scope:
- Identify repeated helpers such as coin formatting, generic number formatting, signed-value formatting, and accuracy percent parsing.
- Move the shared logic into an appropriate utility module or modules.
- Update call sites across leaderboard, profile, hover card, shop, and game overlay code.
- Preserve current visible output unless you find a clear inconsistency that should be normalized.

Constraints:
- Do not redesign unrelated areas.
- Do not over-generalize into a large utility framework.
- Keep the refactor independently shippable and low risk.
- Prefer a small number of focused shared helpers.

Return:
- updated code
- brief summary
- verification that output formatting remains correct in the affected areas
```

### Clean Up Frontend-Visible Shop Catalog Copy Issues
**Why it matters**  
The shop catalog includes visible typos and encoding problems, which weakens polish in a user-facing part of the app.

**Affected files/components**  
`src/constants/shopCatalog.js`, shop UI surfaces that render item names/descriptions

**Codex prompt**
```text
Clean up the frontend-visible quality issues in the shop catalog copy.

Scope:
- Review `src/constants/shopCatalog.js` for typos, malformed punctuation/encoding, and obviously unpolished item text.
- Fix concrete issues such as `Buuble` and `8 ball's loud cousin`, plus any similar problems you find nearby.
- Preserve the existing personality/tone of the catalog unless a line is clearly broken or low quality.
- Keep all item IDs, types, and functional metadata unchanged.

Constraints:
- Do not redesign unrelated areas.
- Do not change shop logic, pricing, ownership rules, or asset paths.
- Keep the cleanup independently shippable and low risk.

Return:
- updated code
- brief summary
- verification listing the catalog copy issues you corrected
```

### Improve Achievements Carousel Responsiveness And Resize Handling
**Why it matters**  
The achievements carousel manages viewport-dependent pagination with direct resize handling, which can be clearer and more resilient.

**Affected files/components**  
`src/components/achievements/AchievementsCarousel.jsx`, related achievement styles only if needed

**Codex prompt**
```text
Improve the achievements carousel responsiveness and resize behavior without redesigning the achievements UI.

Scope:
- Refine `src/components/achievements/AchievementsCarousel.jsx` so viewport-based pagination is easier to reason about and more stable during resize.
- Preserve the current carousel behavior and layout goals across desktop, tablet, and mobile.
- Make sure page index handling stays valid when the number of items per page changes.
- If a small custom hook or helper improves readability, use it.

Constraints:
- Do not redesign unrelated areas.
- Do not change achievement data shape or card styling beyond what is needed for responsive stability.
- Keep the refactor independently shippable and low risk.

Return:
- updated code
- brief summary
- verification covering resize behavior and pagination correctness
```

## Low Priority

### Remove Dead Or Legacy Frontend Compatibility Surfaces
**Why it matters**  
A few inactive helpers and compatibility files add noise without contributing to active frontend behavior.

**Affected files/components**  
`src/app/appStateHelpers.js`, `src/features/game/difficultyConfig.js`, `src/styles/_deprecated.css`, any imports that reference these surfaces

**Codex prompt**
```text
Remove or consolidate dead and legacy frontend compatibility surfaces.

Scope:
- Audit and clean up `readSelectedModeId()` in `src/app/appStateHelpers.js`, the re-export shim at `src/features/game/difficultyConfig.js`, and the inactive legacy stylesheet `src/styles/_deprecated.css`.
- Remove only what is truly unused or replace it with a cleaner equivalent.
- Preserve active behavior and imports.
- If a file should stay for intentional reasons, add a clear comment or simplify its role instead of deleting it blindly.

Constraints:
- Do not redesign unrelated areas.
- Do not remove anything that is still actively used.
- Keep the cleanup independently shippable and low risk.

Return:
- updated code
- brief summary
- verification describing what was removed, kept, or consolidated
```

### Standardize Repeated Inline Style Patterns
**Why it matters**  
Several UI areas rely on repeated inline style objects for widths and background images, which makes presentation logic harder to scan and reuse.

**Affected files/components**  
`src/components/MovingButton.jsx`, `src/features/shop/components/ShopItemCard.jsx`, `src/features/shop/components/ShopHeroHeader.jsx`, `src/pages/ProfilePage.jsx`, `src/features/game/components/roundOverlays/GameOverOverlay.jsx`

**Codex prompt**
```text
Audit and standardize repeated inline style patterns where a small helper or clearer presentation boundary would improve readability.

Scope:
- Review inline style usage in the main button, shop previews, profile progress, and game-over progress UI.
- Consolidate repeated style-object creation where it improves clarity.
- Keep inline styles where they are still the simplest correct choice, especially for dynamic widths or image URLs.
- Favor small helpers over broad styling rewrites.

Constraints:
- Do not redesign unrelated areas.
- Preserve current rendered behavior.
- Do not convert everything to classes if that adds unnecessary complexity.
- Keep the cleanup independently shippable and low risk.

Return:
- updated code
- brief summary
- verification describing which inline patterns were standardized and why
```

### Remove Placeholder Language And Non-Production UI Notes
**Why it matters**  
Visible placeholder language and implementation comments make the frontend feel less finished than the underlying UI quality.

**Affected files/components**  
`src/components/Navbar.jsx`, `src/pages/LeaderboardPage.jsx`, any nearby visible UI copy that is still placeholder-like

**Codex prompt**
```text
Tighten placeholder language and non-production implementation notes in the visible frontend UI.

Scope:
- Review `src/components/Navbar.jsx` and `src/pages/LeaderboardPage.jsx` for visible placeholder language, non-production comments, or temporary interaction messaging.
- Remove or replace these with intentional production-quality wording and behavior.
- Preserve the existing logo asset usage and overall navbar/leaderboard layout.

Constraints:
- Do not redesign unrelated areas.
- Do not add backend work or new routes.
- Keep the cleanup independently shippable and low risk.

Return:
- updated code
- brief summary
- verification listing the placeholder or temporary elements you cleaned up
```

### Extract Small Shared Presentational Patterns Where Useful
**Why it matters**  
A few repeated frontend presentation patterns could be slightly more consistent and easier to maintain if extracted carefully, but this should stay opportunistic and narrow.

**Affected files/components**  
Page intro/header blocks, stat-card formatting helpers, repeated section header/meta patterns across profile, help, shop, and leaderboard surfaces

**Codex prompt**
```text
Identify one or two small shared presentational patterns worth extracting, but only where the extraction clearly reduces duplication without causing churn.

Scope:
- Review repeated page intro/header blocks, stat-card formatting helpers, and section header/meta patterns across profile, help, shop, and leaderboard code.
- Extract only the patterns that are genuinely repeated and stable.
- Keep the result simple and easy to follow.
- Preserve current UI behavior and styling.

Constraints:
- Do not redesign unrelated areas.
- Do not introduce a broad design-system refactor.
- Limit the work to a small number of obvious shared patterns.
- Keep the change independently shippable and low risk.

Return:
- updated code
- brief summary
- verification describing which shared patterns were extracted and which were intentionally left alone
```
