# Frontend Backlog

This backlog is a set of small, Codex-ready frontend tasks for the current React/Vite app. Each item is intentionally scoped to be simple enough for an entry-level class while still creating a clear, visible improvement.

## High Priority

### Replace Mock Data Fallbacks With Clear Empty States
**Why it matters**  
When the app quietly shows fake history or fake leaderboard rows, it is hard for a new programmer to tell what data is real and what data is only for testing.

**Affected files/components**  
`src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/features/history/historyData.js`, `src/features/leaderboard/leaderboardData.js`

**Codex prompt**
```text
Replace the automatic mock-data fallbacks on the History and Leaderboard pages with clear empty states.

Scope:
- Update `src/pages/HistoryPage.jsx` so it shows a simple "no games played yet" message when there is no real history.
- Update `src/pages/LeaderboardPage.jsx` so it does not quietly show mock leaderboard rows in the normal app flow.
- Keep the current page layout and styling as close as possible to what is already there.
- Preserve the existing behavior when real data exists.

Constraints:
- Do not redesign the pages.
- Do not add backend work.
- Keep the change small and easy to review.
- If mock data is still useful for development, keep it clearly separated from the live UI.

Return:
- updated code
- brief summary
- verification of the empty-state behavior on both pages
```

### Highlight The Current Player On The Leaderboard
**Why it matters**  
The leaderboard is easier to read when the current player can find their own row right away.

**Affected files/components**  
`src/pages/LeaderboardPage.jsx`, `src/styles/components/tables.css`, `src/styles/layout.css`

**Codex prompt**
```text
Make the current player's row easier to spot on the leaderboard.

Scope:
- Add a small visual cue such as a stronger row style, a badge, or a label like "You".
- Keep the existing sort behavior and overall table layout.
- Make sure the highlight only appears for the signed-in player's row.

Constraints:
- Do not redesign the leaderboard.
- Do not change the leaderboard data shape.
- Keep the styling simple and easy to understand.

Return:
- updated code
- brief summary
- verification that the current player's row is clearly highlighted
```

### Add Mobile-Friendly Scroll Wrappers For Wide Tables
**Why it matters**  
Tables can be hard to use on smaller screens when columns run off the page.

**Affected files/components**  
`src/styles/components/tables.css`, `src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/pages/HelpPage.jsx`

**Codex prompt**
```text
Add a simple shared wrapper pattern so wide tables stay usable on mobile screens.

Scope:
- Update `src/styles/components/tables.css` to support horizontal scrolling for wide tables.
- Add small wrapper markup in the History, Leaderboard, and Help pages if needed.
- Preserve the current desktop layout as much as possible.

Constraints:
- Do not redesign the tables.
- Do not change table data or column order.
- Keep the solution small and shared instead of making three separate fixes.

Return:
- updated code
- brief summary
- verification for small-screen table behavior
```

### Show Loading Feedback On Login And Signup Buttons
**Why it matters**  
When a form is submitting, students should be able to see that the app is working instead of wondering if the button click did anything.

**Affected files/components**  
`src/pages/LoginPage.jsx`, `src/pages/SignupPage.jsx`, `src/components/auth/AuthInputField.jsx`

**Codex prompt**
```text
Add a simple loading state to the login and signup submit buttons.

Scope:
- Disable the submit button while the request is in progress.
- Change the button text to something clear like "Signing in..." or "Creating account...".
- Keep the current server error handling and page layout.

Constraints:
- Do not redesign the auth pages.
- Do not change the auth API calls.
- Keep the behavior easy for a beginner to follow in the code.

Return:
- updated code
- brief summary
- verification that the submit buttons show loading feedback correctly
```

### Improve Navbar Active-Link Feedback
**Why it matters**  
The app is easier to navigate when the current page is clearly marked in the navbar.

**Affected files/components**  
`src/components/Navbar.jsx`, `src/styles/layout.css`

**Codex prompt**
```text
Make the active page link in the navbar easier to see.

Scope:
- Update `src/components/Navbar.jsx` so the current route has a stronger visual state.
- Adjust `src/styles/layout.css` only as needed.
- Keep the existing navbar structure and style direction.

Constraints:
- Do not redesign the whole navbar.
- Do not add new routes.
- Keep the active state obvious but simple.

Return:
- updated code
- brief summary
- verification that the active nav item is clearly visible
```

## Medium Priority

### Extract A Small Shared Auth Validation Helper
**Why it matters**  
The login and signup pages both do simple form checks. Putting that logic in one place makes it easier for beginners to read and update.

**Affected files/components**  
`src/pages/LoginPage.jsx`, `src/pages/SignupPage.jsx`, new helper file under `src/components/auth` or `src/utils`

**Codex prompt**
```text
Extract the small shared auth validation logic into one helper.

Scope:
- Move repeated checks like trimming values or checking for empty fields into a shared helper.
- Keep the current validation messages unless a tiny wording cleanup helps.
- Keep the page components easier to read after the change.

Constraints:
- Do not redesign the auth pages.
- Do not change the API requests.
- Keep the helper small and beginner-friendly.

Return:
- updated code
- brief summary
- verification that login and signup still validate correctly
```

### Add Password Match Feedback On Signup
**Why it matters**  
Showing a simple password-match message before submit helps new users catch mistakes earlier.

**Affected files/components**  
`src/pages/SignupPage.jsx`, `src/components/auth/AuthInputField.jsx`

**Codex prompt**
```text
Add simple inline feedback on the signup page when the password fields do not match.

Scope:
- Show a clear message before submit if the password and confirm-password fields are different.
- Keep the current page layout and overall style.
- Do not remove any existing server-side error messages.

Constraints:
- Do not redesign the form.
- Do not add a new validation library.
- Keep the code easy to follow for a beginner.

Return:
- updated code
- brief summary
- verification that password mismatch feedback appears at the right time
```

### Add Sort Direction Indicators To Leaderboard Headers
**Why it matters**  
If a column can be sorted, the page should make it obvious which direction is active.

**Affected files/components**  
`src/pages/LeaderboardPage.jsx`, `src/styles/components/tables.css`

**Codex prompt**
```text
Add a simple visual indicator to sortable leaderboard headers.

Scope:
- Show the current sort direction with a small arrow, label, or icon.
- Keep the existing sort behavior exactly the same.
- Make sure the indicator updates when the user changes the sort.

Constraints:
- Do not redesign the table.
- Do not add a big icon system just for this change.
- Keep the UI simple and readable.

Return:
- updated code
- brief summary
- verification that the active sort direction is always visible
```

### Break Repeated Profile Stat Cards Into A Small Component
**Why it matters**  
The profile page is easier to maintain when repeated card markup lives in one small reusable component.

**Affected files/components**  
`src/pages/ProfilePage.jsx`, new component file under `src/components` or `src/pages`

**Codex prompt**
```text
Extract one repeated profile stat-card pattern into a small reusable component.

Scope:
- Find a repeated stat-card block inside `src/pages/ProfilePage.jsx`.
- Move that markup into a small component with clear props.
- Preserve the current UI and text.

Constraints:
- Do not redesign the profile page.
- Do not do a large refactor.
- Keep the extracted component small and easy to understand.

Return:
- updated code
- brief summary
- verification that the profile page still renders the same content
```

### Move Repeated Number Formatting Into One Helper
**Why it matters**  
When the same number formatting logic is repeated in several places, it is easy for the app to become inconsistent.

**Affected files/components**  
`src/pages/LeaderboardPage.jsx`, `src/pages/ProfilePage.jsx`, `src/components/PlayerHoverCard.jsx`, `src/features/shop/components/ShopItemCard.jsx`, related utility files

**Codex prompt**
```text
Create one small shared helper for repeated number formatting used by the frontend.

Scope:
- Identify repeated formatting for coins, simple counts, or signed values.
- Move the shared logic into a utility file.
- Update the main call sites without changing the visible output.

Constraints:
- Do not build a large utility framework.
- Keep the helper names simple.
- Preserve the current formatting style unless there is an obvious bug.

Return:
- updated code
- brief summary
- verification that formatted values still look correct
```

## Low Priority

### Fix Visible Shop Catalog Typos
**Why it matters**  
Small typos make the app feel less polished, especially in a user-facing screen like the shop.

**Affected files/components**  
`src/constants/shopCatalog.js`

**Codex prompt**
```text
Clean up obvious typos and broken wording in the shop catalog copy.

Scope:
- Review `src/constants/shopCatalog.js` for visible spelling mistakes or awkward text.
- Fix only the clearly broken lines.
- Keep the playful tone of the existing catalog.

Constraints:
- Do not change item ids.
- Do not change prices or shop logic.
- Keep the cleanup small and targeted.

Return:
- updated code
- brief summary
- verification listing the copy issues that were fixed
```

### Replace Leaderboard Console Logging With A Clear UI State
**Why it matters**  
A console message is useful for debugging, but it does not help the person using the page.

**Affected files/components**  
`src/pages/LeaderboardPage.jsx`

**Codex prompt**
```text
Replace the leaderboard console log placeholder with a clearer user-facing behavior.

Scope:
- Remove the visible reliance on `console.log` for row/profile interaction.
- If non-self profile viewing is not ready yet, show a clear disabled state or a small "coming soon" message.
- Keep the current layout and sort behavior.

Constraints:
- Do not add backend profile work.
- Do not redesign the table.
- Keep the change small and intentional.

Return:
- updated code
- brief summary
- verification of the new non-placeholder behavior
```

### Standardize A Small Page Intro Pattern
**Why it matters**  
Several pages have a title and short intro text. A tiny shared pattern can make that code easier to read without adding much complexity.

**Affected files/components**  
`src/pages/HistoryPage.jsx`, `src/pages/LeaderboardPage.jsx`, `src/pages/HelpPage.jsx`, optional new small shared component

**Codex prompt**
```text
Extract a very small shared page-intro pattern for pages that already use a title and short description.

Scope:
- Identify one repeated title/intro layout used on at least two pages.
- Extract it into a simple shared component only if the result reduces duplication.
- Preserve the current text and styling.

Constraints:
- Do not force a design-system rewrite.
- Keep the component tiny.
- Leave one-off page layouts alone if they are not truly repeated.

Return:
- updated code
- brief summary
- verification describing where the shared pattern was used
```

### Tidy Repeated Inline Style Objects
**Why it matters**  
Repeated inline style objects can make JSX harder to scan, especially for newer programmers.

**Affected files/components**  
`src/features/shop/components/ShopItemCard.jsx`, `src/features/shop/components/ShopHeroHeader.jsx`, `src/pages/ProfilePage.jsx`

**Codex prompt**
```text
Clean up one or two repeated inline style patterns where a small helper or class would make the code easier to read.

Scope:
- Review the listed components for repeated inline style objects.
- Extract only the obvious repeated patterns.
- Preserve the current rendered output.

Constraints:
- Do not convert every inline style blindly.
- Do not redesign the pages.
- Keep the cleanup small and easy to explain.

Return:
- updated code
- brief summary
- verification of which repeated style patterns were cleaned up
```

### Add Better Labels To Small Icon Or Arrow Buttons
**Why it matters**  
Buttons that only show an icon or arrow can be confusing for screen readers and for anyone scanning the code later.

**Affected files/components**  
`src/components/achievements/AchievementsCarousel.jsx`, `src/components/InfoStrip.jsx`

**Codex prompt**
```text
Add clearer labels to small icon-only or arrow-style buttons in the frontend.

Scope:
- Review the achievements carousel and info-strip controls.
- Add `aria-label` or visible text where the button purpose is not already obvious.
- Preserve the current visual design as much as possible.

Constraints:
- Do not redesign the components.
- Do not add a new accessibility library.
- Keep the changes small and focused.

Return:
- updated code
- brief summary
- verification of which buttons received clearer labels
```
