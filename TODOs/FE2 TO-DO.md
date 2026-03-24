# FE2 TO-DO

Frontend audit backlog generated from the current React/Vite client. Items are intentionally incremental, implementation-ready, and scoped to preserve existing behavior unless noted otherwise.

## High Priority

### 1. Make Round Reward Calculations Single-Source-of-Truth
- Why it matters: Round rewards are calculated in both the game screen controller and the post-round progression updater. That duplication creates drift risk between what the overlay shows and what gets persisted.
- Affected files/components: `src/features/game/hooks/useGameScreenController.js`, `src/app/usePlayerProgressionUpdates.js`, `src/utils/progressionUtils.js`, `src/utils/rankUtils.js`, `src/utils/roundRewards.js`
- Ready-to-paste Codex prompt:
```md
Create a shared round reward helper that computes XP, coins, rank delta, and any related summary values from one round result payload. Update `src/features/game/hooks/useGameScreenController.js` and `src/app/usePlayerProgressionUpdates.js` to use that helper so the Game Over overlay and persisted progression cannot diverge.

Constraints:
- Preserve the current reward formulas and current UI text.
- Do not rebalance the game.
- Keep the public behavior of both hooks the same except for removing duplicated calculation logic.
- Add small unit-friendly pure helpers if needed, but do not introduce a state library.
```

### 2. Make Game Overlays Keyboard-Stable and Screen-Reader Friendly
- Why it matters: `ReadyOverlay` and `GameOverOverlay` are dialogs, but only one of them is initially focused and neither fully manages focus lifecycle. That makes keyboard navigation and assistive-tech behavior unreliable.
- Affected files/components: `src/features/game/components/roundOverlays/ReadyOverlay.jsx`, `src/features/game/components/roundOverlays/GameOverOverlay.jsx`, `src/features/game/components/roundOverlays/useOverlayMotion.js`, `src/styles/components/game.css`
- Ready-to-paste Codex prompt:
```md
Improve dialog accessibility for the game overlays. When `ReadyOverlay` or `GameOverOverlay` opens, move focus into the dialog, keep keyboard focus inside while it is open, support Escape handling where appropriate, and restore focus to the previously focused element when the dialog closes.

Constraints:
- Preserve the existing layout, animation feel, and game flow.
- Do not change gameplay timing or round state transitions.
- Keep `ReadyOverlay` close behavior optional through existing props.
- Do not add external libraries; implement this with small reusable React helpers.
```

### 3. Replace Clickable Leaderboard Rows With Real Interactive Controls
- Why it matters: `LeaderboardPage` currently attaches click and key handlers directly to table rows. That is semantically weak, hard to reason about, and misleading because non-self profile opens are not implemented.
- Affected files/components: `src/pages/LeaderboardPage.jsx`, `src/components/PlayerHoverCard.jsx`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Refactor `src/pages/LeaderboardPage.jsx` so profile navigation is triggered by a real interactive control instead of `onClick`/`onKeyDown` on `<tr>`. Keep sortable headers and current styling, but remove misleading row-wide interactivity.

Constraints:
- Preserve current sort behavior.
- Navigating to `/profile` for the current user should still work.
- If external player profiles are not implemented yet, render those rows as non-interactive or show a disabled affordance instead of logging to the console.
- Update styles in `src/styles/layout.css` only as needed to preserve the existing visual design.
```

### 4. Make Table-Heavy Screens Safe on Mobile
- Why it matters: History, leaderboard, and help all rely on wide tables, but the shared table styles do not provide a mobile-safe container pattern. On smaller screens, readability and overflow handling are brittle.
- Affected files/components: `src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/features/help/components/HelpTableSection.jsx`, `src/styles/components/tables.css`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Add a reusable responsive table wrapper pattern and apply it to the History, Leaderboard, and Help pages. On narrow screens, tables should remain readable, allow horizontal scrolling when necessary, and avoid breaking card/page layout.

Constraints:
- Preserve the current desktop table appearance.
- Do not change table data or column order.
- Prefer a shared wrapper/style solution over per-page hacks.
- Keep accessibility intact: table semantics must remain valid and scroll containers must be keyboard reachable if necessary.
```

### 5. Replace Misleading Mock Fallbacks With Explicit Empty or Demo States
- Why it matters: `HistoryPage` and `LeaderboardPage` quietly show mock data when real data is absent. That undermines trust because users cannot tell sample data from live account data.
- Affected files/components: `src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/features/history/historyData.js`, `src/features/leaderboard/leaderboardData.js`
- Ready-to-paste Codex prompt:
```md
Remove the default production-facing fallback to `MOCK_HISTORY` and `MOCK_LEADERBOARD`. Replace it with explicit empty states when no real data exists, and keep any sample data clearly isolated behind a labeled demo-only path if it is still needed for development.

Constraints:
- Preserve current page structure and existing cards/tables where real data exists.
- Do not invent backend APIs.
- Empty states should be clear, polished, and action-oriented, not generic placeholders.
- If you keep sample data utilities, make sure they are not shown automatically to authenticated users.
```

## Medium Priority

### 6. Align Signup Validation Rules With the On-Screen Guidance
- Why it matters: `SignupPage` tells the user that usernames should be at least 3 characters and passwords at least 8 characters, but submit-time validation only checks for non-empty values. That is inconsistent UX.
- Affected files/components: `src/pages/SignupPage.jsx`, `src/pages/LoginPage.jsx`, `src/components/auth/AuthInputField.jsx`
- Ready-to-paste Codex prompt:
```md
Centralize the auth validation rules used by the login/signup screens and make the validation copy match the actual submit behavior. In particular, resolve the mismatch in `SignupPage` where warning text implies minimum lengths that are not enforced during submit.

Constraints:
- Preserve the current visual design and server submission flow.
- If you enforce min lengths, do it consistently in field hints and final submit blocking.
- If you choose not to enforce those limits client-side, remove or rewrite the misleading warning copy.
- Keep server-returned error messages visible exactly as they are today.
```

### 7. Make Hover Cards Work for Keyboard and Touch Users
- Why it matters: The navbar quick stats card and leaderboard hover card rely on hover-first CSS. That excludes touch-first interaction patterns and makes keyboard discovery inconsistent.
- Affected files/components: `src/components/Navbar.jsx`, `src/components/PlayerHoverCard.jsx`, `src/pages/LeaderboardPage.jsx`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Upgrade the profile quick-stat popovers so they work on hover, keyboard focus, and touch/click. Users should be able to reveal the card intentionally, keep it open long enough to read, and dismiss it cleanly.

Constraints:
- Preserve the current desktop hover behavior and overall styling.
- Do not introduce a heavy popover library.
- Ensure the solution still behaves well on small screens.
- Favor one shared interaction pattern for navbar and leaderboard instead of two separate implementations.
```

### 8. Replace CSS-Only Profile Tooltips With an Accessible Pattern
- Why it matters: Profile stat card tooltips are generated through CSS pseudo-elements from `data-tooltip`. They are hard to use on touch devices and not robust as accessible descriptions.
- Affected files/components: `src/pages/ProfilePage.jsx`, `src/styles/components/profile.css`
- Ready-to-paste Codex prompt:
```md
Replace the CSS-only tooltip pattern used by profile stat cards with an accessible approach that works on keyboard and touch. Keep the visual feel subtle, but ensure the extra context is available without relying on `::before`/`::after` tooltip content.

Constraints:
- Preserve the existing stat card layout and tone styles.
- Do not add a third-party tooltip package.
- Prefer semantic descriptions or a small inline disclosure pattern over decorative-only hover text.
- Keep the cards lightweight; this should be a targeted accessibility fix, not a page redesign.
```

### 9. Move App-Level Progress Sync Logic Out of `App.jsx`
- Why it matters: `App.jsx` is currently responsible for routing, session state, progress snapshots, auth-aware persistence queueing, and page prop assembly. That makes it harder to extend safely.
- Affected files/components: `src/App.jsx`, `src/app/useAppPlayerState.js`, `src/app/useAuthSession.js`, `src/app/usePlayerProgressionUpdates.js`
- Ready-to-paste Codex prompt:
```md
Extract the progress snapshot + queued persistence logic from `src/App.jsx` into a dedicated hook or small app service hook. The goal is to slim `App.jsx` without changing route behavior or auth flow.

Constraints:
- Preserve current routing and page props.
- Preserve the existing sequential persistence behavior and auth-token safety checks.
- Do not introduce Context or a new global state library.
- Keep this refactor incremental: move logic, add naming clarity, and avoid changing user-visible behavior.
```

### 10. Break `ProfilePage.jsx` Into Reusable Profile-Domain Helpers
- Why it matters: `ProfilePage.jsx` owns profile metrics, ranked insights, player title/tagline rules, achievement filtering, and rendering. The file is large enough that small changes will get risky quickly.
- Affected files/components: `src/pages/ProfilePage.jsx`, `src/game/achievements/evaluateAchievements.js`, `src/components/achievements/AchievementsCarousel.jsx`
- Ready-to-paste Codex prompt:
```md
Refactor `src/pages/ProfilePage.jsx` by extracting the profile metrics builders, ranked insight helpers, and achievement category-selection logic into small pure helpers or page-scoped hooks. Preserve the rendered UI and existing prop contract.

Constraints:
- Do not redesign the page.
- Keep all current text and behavior unless a helper extraction requires a tiny naming cleanup.
- Favor pure utility functions for derived data and keep the page component focused on composition.
- Avoid moving unrelated styling work into this change.
```

### 11. Split Page-Specific CSS Out of the Large Shared Stylesheets
- Why it matters: `layout.css` and `game.css` have become catch-all files. That slows down frontend changes because unrelated page styles live together and selectors are harder to audit.
- Affected files/components: `src/styles/layout.css`, `src/styles/components/game.css`, `src/styles/app.css`
- Ready-to-paste Codex prompt:
```md
Refactor the CSS organization so page-specific rules are not buried inside the large shared stylesheets. Extract coherent chunks into focused files and import them from `src/styles/app.css` without changing the rendered UI.

Constraints:
- Preserve selector behavior and cascade order.
- Do not rename classes unless necessary.
- Keep this as a file-organization refactor only; no visual redesigns.
- Prefer splitting by feature/page boundary rather than by arbitrary size.
```

## Low Priority

### 12. Remove Dead Frontend Artifacts and Proxy Modules
- Why it matters: There are a few zero-value compatibility files and legacy artifacts that increase noise during code search and make it harder to know what the real source of truth is.
- Affected files/components: `src/config/shopCatalog.js`, `src/features/game/difficultyConfig.js`, `src/app/appStateHelpers.js`, `src/styles/_deprecated.css`
- Ready-to-paste Codex prompt:
```md
Audit and remove dead frontend artifacts that no longer provide value. Start with the proxy re-export files (`src/config/shopCatalog.js`, `src/features/game/difficultyConfig.js`), the unused `readSelectedModeId` helper, and the deprecated stylesheet if it is truly not part of the active app.

Constraints:
- Verify references before deleting anything.
- Preserve build output and imports that are still in use.
- If a deprecated file should remain for documentation, make that explicit and keep it out of runtime paths.
- Keep the change narrowly focused on dead code cleanup.
```

### 13. Clean Up Placeholder, Typo, and Encoding Issues in User-Facing Copy
- Why it matters: A few visible strings still read as placeholders or contain quality issues, which makes the frontend feel unfinished even when the functionality works.
- Affected files/components: `src/components/Navbar.jsx`, `src/constants/shopCatalog.js`
- Ready-to-paste Codex prompt:
```md
Do a copy-polish pass on user-facing frontend strings that are clearly unfinished or malformed. At minimum, remove the visible/logo placeholder wording in `src/components/Navbar.jsx`, fix obvious typos like `Buuble`, and correct encoding issues such as the malformed apostrophe in the shop catalog.

Constraints:
- Preserve the app's playful tone.
- Do not rewrite all copy; keep this targeted to clearly broken or placeholder text.
- Avoid changing item ids, route names, or any logic-coupled string constants.
```

### 14. Make the Achievements Carousel Less Dependent on Global Resize Events
- Why it matters: `AchievementsCarousel` uses a window resize listener to decide page size. It works, but it is more JS-heavy than necessary and not especially resilient if the carousel is ever embedded in a constrained container.
- Affected files/components: `src/components/achievements/AchievementsCarousel.jsx`, `src/styles/components/achievements.css`
- Ready-to-paste Codex prompt:
```md
Refine `AchievementsCarousel` so its pagination is less dependent on a global `window.resize` listener. Prefer a container-aware or CSS-assisted approach that keeps the current desktop/mobile card counts and existing visual behavior.

Constraints:
- Preserve current pagination, arrows, and general layout.
- Do not add a carousel library.
- Keep keyboard accessibility intact.
- Avoid a broad rewrite; this should be a focused resilience/performance cleanup.
```

### 15. Replace the Fixed-Height InfoStrip Collapse With a Content-Aware Pattern
- Why it matters: `InfoStrip` uses a hard-coded expanded max-height, which is fragile if more content gets added later. It also makes the collapse behavior harder to maintain.
- Affected files/components: `src/components/InfoStrip.jsx`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Refactor `InfoStrip` so the collapsible body no longer depends on a hard-coded expanded height. Use a content-aware pattern that keeps the existing look, supports reduced-motion users, and avoids clipping longer content.

Constraints:
- Preserve the current compact design and existing props.
- Do not remove the collapsible behavior.
- Keep the implementation lightweight; native HTML patterns are acceptable if the styling stays consistent.
```
