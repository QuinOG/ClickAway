# FE2 TO-DO

Frontend audit backlog for the current React/Vite client. These items are intentionally smaller, easier to explain, and better suited for an entry-level development class while still keeping the current app behavior mostly the same.

## High Priority

### 1. Put Round Reward Math In One Small Helper
- Why it matters: Round reward numbers are calculated in more than one place. Putting that math in one helper makes the code easier to trust and easier to update.
- Affected files/components: `src/features/game/hooks/useGameScreenController.js`, `src/app/usePlayerProgressionUpdates.js`, `src/utils/roundRewards.js`
- Ready-to-paste Codex prompt:
```md
Create one small shared helper for round reward math and use it in the places that currently repeat the same calculation.

Constraints:
- Preserve the current XP, coin, and rank formulas.
- Do not rebalance the game.
- Keep the visible reward text the same.
- Keep the helper pure and easy to test.
```

### 2. Put Focus On The Main Button When Game Overlays Open
- Why it matters: When a dialog opens, keyboard users should land on something useful right away instead of having to guess where focus went.
- Affected files/components: `src/features/game/components/roundOverlays/ReadyOverlay.jsx`, `src/features/game/components/roundOverlays/GameOverOverlay.jsx`, `src/styles/components/game.css`
- Ready-to-paste Codex prompt:
```md
Improve the game overlays so keyboard focus moves to the main action button when an overlay opens.

Constraints:
- Preserve the current layout and animation feel.
- Do not change the game flow.
- Keep the change small and focused on keyboard behavior.
- Restore focus in a simple way when the overlay closes if needed.
```

### 3. Replace Clickable Leaderboard Rows With Real Controls
- Why it matters: Click handlers on table rows are harder to understand and less accessible than a real button or link.
- Affected files/components: `src/pages/LeaderboardPage.jsx`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Refactor the leaderboard so the interactive part uses a real button or link instead of making the whole table row clickable.

Constraints:
- Preserve the current sort behavior.
- Keep the current player action working.
- If other player profiles are not ready yet, show a disabled control instead of a console-only placeholder.
- Do not redesign the table.
```

### 4. Make Table Screens Safe On Mobile
- Why it matters: History, help, and leaderboard tables are hard to use when columns run off the screen.
- Affected files/components: `src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/features/help/components/HelpTableSection.jsx`, `src/styles/components/tables.css`
- Ready-to-paste Codex prompt:
```md
Add one simple shared mobile-table wrapper and use it on the History, Leaderboard, and Help screens.

Constraints:
- Preserve the current desktop layout.
- Do not change the table data.
- Keep the fix shared and small.
- Make sure the tables can still be read on narrow screens.
```

### 5. Replace Mock Fallbacks With Clear Empty Messages
- Why it matters: Showing fake data by default can confuse students who are trying to understand where the real app data comes from.
- Affected files/components: `src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/features/history/historyData.js`, `src/features/leaderboard/leaderboardData.js`
- Ready-to-paste Codex prompt:
```md
Remove the default mock-data fallback from the live History and Leaderboard pages and show clear empty messages instead.

Constraints:
- Preserve the current page structure.
- Do not add backend work.
- Keep real-data behavior the same.
- If demo data is still useful, keep it separated from the normal user flow.
```

## Medium Priority

### 6. Make Signup Help Text Match The Real Validation
- Why it matters: The signup screen is easier to trust when its on-screen hints match what the form actually checks.
- Affected files/components: `src/pages/SignupPage.jsx`, `src/pages/LoginPage.jsx`, `src/components/auth/AuthInputField.jsx`
- Ready-to-paste Codex prompt:
```md
Update the auth screens so the help text and validation rules match each other.

Constraints:
- Preserve the current visual design.
- Keep server error messages visible.
- If you enforce a rule, show that same rule in the UI.
- Keep the logic simple and easy to read.
```

### 7. Make Hover Cards Work On Click And Focus
- Why it matters: Hover-only UI is difficult to use on touch screens and less reliable for keyboard users.
- Affected files/components: `src/components/Navbar.jsx`, `src/components/PlayerHoverCard.jsx`, `src/pages/LeaderboardPage.jsx`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Update the quick-stat hover cards so they can also open with click and keyboard focus.

Constraints:
- Preserve the current desktop hover behavior.
- Do not add a large popover library.
- Keep the interaction simple enough for mobile users.
- Try to use one shared behavior pattern in both places.
```

### 8. Replace CSS-Only Profile Tooltips With A Simple Accessible Pattern
- Why it matters: Tooltip text that only exists in CSS is harder to use on touch devices and harder to understand in the code.
- Affected files/components: `src/pages/ProfilePage.jsx`, `src/styles/components/profile.css`
- Ready-to-paste Codex prompt:
```md
Replace the CSS-only profile tooltips with a simple pattern that works on hover, focus, and touch.

Constraints:
- Preserve the current profile card layout.
- Do not add a third-party tooltip package.
- Keep the extra help text lightweight.
- Favor a small inline or button-based pattern over a big redesign.
```

### 9. Move Small Progress-Sync Logic Out Of `App.jsx`
- Why it matters: `App.jsx` is easier to read when small pieces of data-shaping logic live in a named helper or hook.
- Affected files/components: `src/App.jsx`, `src/app/usePlayerProgressionUpdates.js`, `src/app/useAppPlayerState.js`
- Ready-to-paste Codex prompt:
```md
Move one small, clearly related piece of progress-sync logic out of `src/App.jsx` into a helper or hook.

Constraints:
- Preserve the current route behavior.
- Do not introduce a new state library.
- Keep the extraction narrow and beginner-friendly.
- Do not mix unrelated cleanup into the same change.
```

### 10. Break The Profile Page Into A Few Small Helpers
- Why it matters: The profile page is large enough that even a small extraction can make it easier for a student to read.
- Affected files/components: `src/pages/ProfilePage.jsx`, `src/components/achievements/AchievementsCarousel.jsx`
- Ready-to-paste Codex prompt:
```md
Extract one or two small helper functions or components from `src/pages/ProfilePage.jsx` to reduce repeated logic or markup.

Constraints:
- Preserve the current UI and text.
- Do not redesign the page.
- Keep the extraction small.
- Prefer pure helpers for derived data when possible.
```

### 11. Split One Page-Specific CSS Block Out Of A Shared File
- Why it matters: Shared style files are easier to work with when page-specific rules are not mixed together.
- Affected files/components: `src/styles/layout.css`, `src/styles/components/game.css`, `src/styles/app.css`
- Ready-to-paste Codex prompt:
```md
Move one clearly page-specific group of CSS rules out of a large shared stylesheet into a smaller focused file.

Constraints:
- Preserve the current rendered UI.
- Keep import order correct.
- Do not rename a lot of classes.
- Limit this task to one small CSS section, not a broad styling refactor.
```

## Low Priority

### 12. Remove Dead Frontend Helpers And Deprecated Style Archives
- Why it matters: Leftover helper exports and archived style files make it harder for beginners to know which code is actually active.
- Affected files/components: `src/app/appStateHelpers.js`, `src/styles/_deprecated.css`
- Ready-to-paste Codex prompt:
```md
Audit the listed frontend files and remove or simplify only the ones that are truly unused.

Constraints:
- Verify usage before deleting anything.
- Preserve the current build output.
- If a file should stay, add a small comment or simplify its purpose instead of deleting blindly.
- Keep the cleanup narrow.
```

### 13. Clean Up Placeholder And Typo Issues In Visible Copy
- Why it matters: Small wording problems are easy wins and make the app feel more finished.
- Affected files/components: `src/components/Navbar.jsx`, `src/constants/shopCatalog.js`
- Ready-to-paste Codex prompt:
```md
Fix obvious placeholder text, typos, and malformed punctuation in visible frontend copy.

Constraints:
- Preserve the playful tone of the app.
- Keep the cleanup targeted.
- Do not change ids or logic-coupled strings.
- Focus only on clearly broken or temporary wording.
```

### 14. Make Achievements Carousel Resize Logic Easier To Follow
- Why it matters: Resize code can be hard for new programmers to trace if too much logic is packed into one place.
- Affected files/components: `src/components/achievements/AchievementsCarousel.jsx`
- Ready-to-paste Codex prompt:
```md
Refactor the achievements carousel resize logic so it is easier to read and keeps the current page index valid.

Constraints:
- Preserve the current layout goals.
- Do not add a carousel library.
- Keep keyboard behavior working.
- Favor a small helper or cleaner effect logic over a big rewrite.
```

### 15. Replace The Fixed InfoStrip Height With A Content-Aware Expand Pattern
- Why it matters: Hard-coded heights are easy to break when text changes.
- Affected files/components: `src/components/InfoStrip.jsx`, `src/styles/layout.css`
- Ready-to-paste Codex prompt:
```md
Refactor `InfoStrip` so the expanded area does not depend on one hard-coded height value.

Constraints:
- Preserve the current look and compact size.
- Do not remove the expand/collapse behavior.
- Keep the solution lightweight.
- Avoid clipping longer content.
```
