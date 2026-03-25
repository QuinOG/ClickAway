# Backend Improvement Backlog

This backlog is based on the current backend in `server/` and is intentionally focused on smaller, easier-to-understand improvements. Prompts are written to be pasted into Codex one item at a time.

## 1. Reserve the admin username in public signup

- **Priority:** High
- **Affected area/files:** `server/index.js`, `server/db.js`, `.env.example`, `README.md`
- **Issue / opportunity:** Admin access is tied to `ADMIN_USERNAME`, so public signup should not allow that reserved name. This is a small fix with a clear security benefit.
- **Prompt for Codex:**  
  `Block public signup of the configured admin username in the Express backend. Reject requests that use ADMIN_USERNAME with a clear JSON error, keep the current auth routes the same, and update any setup docs that mention the admin account.`

## 2. Return a clear JSON error when the username is already taken

- **Priority:** High
- **Affected area/files:** `server/index.js`, `server/db.js`
- **Issue / opportunity:** Duplicate username errors are easier for the frontend and for students to handle when the backend always returns one clear error shape.
- **Prompt for Codex:**  
  `Handle duplicate-username signup errors in one clear way. Translate the database conflict into a stable JSON response such as a 409 with { error }, keep successful signup behavior unchanged, and avoid a larger error-handling rewrite in this task.`

## 3. Add one small helper for auth request validation

- **Priority:** High
- **Affected area/files:** `server/index.js`
- **Issue / opportunity:** Signup and login both need simple checks for required fields. A small shared helper would make the route code easier to read.
- **Prompt for Codex:**  
  `Create a small helper for validating the basic signup and login request body fields. Use it in the auth routes, keep the current endpoint URLs the same, and return clear JSON 400 errors for missing or invalid values.`

## 4. Validate shop request payloads before touching the database

- **Priority:** High
- **Affected area/files:** `server/index.js`, `server/playerStateStore.js`
- **Issue / opportunity:** The shop routes are easier to trust when they check simple things like item ids before they run backend logic.
- **Prompt for Codex:**  
  `Add small request validation for the shop purchase and equip routes. Check that the required fields exist and have the expected type before any backend work runs, return JSON 400 errors for bad input, and keep the current success responses unchanged.`

## 5. Replace repeated user lookups with a current-user middleware

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, optionally a new middleware/helper file under `server/`
- **Issue / opportunity:** Protected routes repeat the same "find user by id" work. Moving that to one middleware would reduce copy-and-paste code.
- **Prompt for Codex:**  
  `Extract a reusable middleware that loads the authenticated user after JWT verification and attaches it to the request. Refactor protected routes to use it, preserve the current 401 behavior for invalid sessions, and keep the public API unchanged.`

## 6. Break auth routes out of `server/index.js`

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, new route/helper file under `server/`
- **Issue / opportunity:** `server/index.js` is easier to teach from when auth logic is grouped in a smaller, focused module.
- **Prompt for Codex:**  
  `Move the signup, login, and auth/me route code out of server/index.js into a small auth-focused module. Keep the same route URLs and response shapes, and make this a structure-only cleanup without changing behavior.`

## 7. Move shop response shaping into a helper

- **Priority:** Medium
- **Affected area/files:** `server/playerStateStore.js`, optionally a new helper file under `server/`
- **Issue / opportunity:** If response-shaping code lives in one helper, the shop flow is easier to scan and easier to reuse.
- **Prompt for Codex:**  
  `Extract the repeated shop response-shaping logic into a small helper so purchase and equip code paths are easier to read. Preserve the current payload shape and keep the refactor limited to the shop flow.`

## 8. Add a small normalizer for `/api/progress` input

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`
- **Issue / opportunity:** The progress payload is easier to work with when one helper is responsible for basic defaults and shape cleanup.
- **Prompt for Codex:**  
  `Create a small helper that normalizes the /api/progress request body before it is saved. Keep the accepted payload fields backward-compatible, preserve the current response shape, and keep this as a simple cleanup rather than a full contract redesign.`

## 9. Make `selectedModeId` consistent in backend responses

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`, `src/App.jsx`, `src/app/useAppPlayerState.js`
- **Issue / opportunity:** The code is easier to understand when a field either truly matters and round-trips correctly or is removed from the contract.
- **Prompt for Codex:**  
  `Audit selectedModeId in the backend player and progress flow and make it consistent. Either persist it end-to-end or remove it safely from the backend contract while preserving current frontend behavior. Keep the change small and explicit.`

## 10. Decouple backend catalog mapping from frontend-only module paths

- **Priority:** Medium
- **Affected area/files:** `server/shopItemMap.js`, `src/constants/shopCatalog.js`, potentially a new shared module
- **Issue / opportunity:** The backend is easier to reason about when it does not depend directly on a frontend-only path inside `src/`.
- **Prompt for Codex:**  
  `Move shared shop catalog data into a cleaner shared module that both the server and client can import. Preserve current item ids, prices, and API behavior, and keep the refactor focused on the catalog path dependency only.`

## 11. Centralize environment/config parsing

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`, `.env.example`, `README.md`
- **Issue / opportunity:** It is easier for students to set up the project when environment values are read in one obvious place.
- **Prompt for Codex:**  
  `Create a small backend config module that reads the main environment variables in one place. Replace scattered process.env reads with that module, keep current defaults where they are still useful, and update the setup docs if needed.`

## 12. Add basic login and signup rate limiting

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `package.json`
- **Issue / opportunity:** A light rate limit is a practical beginner-friendly example of backend hardening without changing the auth system.
- **Prompt for Codex:**  
  `Add a simple rate-limit or cooldown strategy for the login and signup routes. Keep the current auth flow and response format as close as possible to what exists today, and avoid adding heavyweight infrastructure.`

## 13. Improve backend logging and request traceability

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`, `server/playerStateStore.js`
- **Issue / opportunity:** A few clearer logs can make debugging much easier without introducing a full logging stack.
- **Prompt for Codex:**  
  `Add lightweight request-aware logging to the backend so failed auth, shop, and progress requests are easier to trace. Include useful context such as route name or username when safe, but do not log passwords or tokens. Keep the implementation simple.`

## 14. Clean up unused backend code and dependencies

- **Priority:** Low
- **Affected area/files:** `server/index.js`, `server/db.js`, `server/playerStateStore.js`, `server/shopItemMap.js`, `package.json`
- **Issue / opportunity:** A smaller backend is easier for new programmers to search and understand.
- **Prompt for Codex:**  
  `Do a backend cleanup pass for clearly unused helpers, routes, or dependencies. Verify local usage before removing anything, preserve behavior that the current frontend still needs, and keep the cleanup narrow and easy to review.`

## 15. Add smoke tests for the main backend flows

- **Priority:** Medium
- **Affected area/files:** `server/`, `package.json`, any new test files
- **Issue / opportunity:** A few small tests can make backend changes safer for students without requiring a large test framework setup.
- **Prompt for Codex:**  
  `Add a small backend smoke-test setup that covers signup, login, auth/me, one invalid-token case, and one basic shop or progress request. Keep the tests pragmatic and lightweight, and avoid a major architecture rewrite just to support testing.`
