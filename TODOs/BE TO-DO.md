# Backend Improvement Backlog

This backlog is based on the current backend in `server/` and is intentionally biased toward incremental, production-minded changes. Prompts are written to be pasted into Codex one item at a time.

## 1. Reserve the admin username in public signup

- **Priority:** High
- **Affected area/files:** `server/index.js`, `server/db.js`, `.env.example`, `README.md`
- **Issue / opportunity:** Admin privileges are currently tied to `ADMIN_USERNAME`, and public signup does not block that reserved username. That creates a direct privilege-escalation path if someone registers the configured admin name before the seeded admin account exists.
- **Prompt for Codex:**  
  `Block public signup of the configured admin username in the Express backend. Update the signup validation so requests using ADMIN_USERNAME are rejected with a clear 400/409 JSON error, keep the existing auth endpoints and response shapes unchanged, and update any backend setup docs/env comments that mention admin seeding. Do not redesign the auth system in this task.`

## 2. Stop inferring user roles from usernames

- **Priority:** High
- **Affected area/files:** `server/db.js`, `server/index.js`, `server/data/clickaway (3).sql`, `.env.example`
- **Issue / opportunity:** `mapUserRow()` derives `role` from the username matching `ADMIN_USERNAME`, and `createUser({ role })` currently ignores the `role` argument entirely. Role assignment should be persisted explicitly, not inferred from a mutable/env-driven username.
- **Prompt for Codex:**  
  `Refactor backend role handling so roles are stored explicitly instead of being inferred from the username. Add the minimal schema/query changes needed, preserve the existing admin seed flow, keep current player behavior intact, and avoid changing endpoint URLs or token usage beyond what is required to make role handling correct and safe.`

## 3. Add centralized JSON error handling for async routes

- **Priority:** High
- **Affected area/files:** `server/index.js`, `server/playerStateStore.js`, `server/db.js`
- **Issue / opportunity:** Route handlers mix inline `try/catch` with uncaught async DB calls. In Express 5, rejected async handlers can fall through to the default error handler, which produces inconsistent non-JSON error responses. Database errors like duplicate keys are also not translated into stable API errors.
- **Prompt for Codex:**  
  `Introduce centralized backend error handling for the Express API. Add JSON-only error middleware, make async route failures flow through it consistently, and translate known MySQL/application errors (for example duplicate username conflicts and validation-style failures) into stable HTTP status codes with { error } responses. Preserve current endpoint paths and success payloads.`

## 4. Validate request payloads before touching the database

- **Priority:** High
- **Affected area/files:** `server/index.js`, `server/playerStateStore.js`, `server/db.js`
- **Issue / opportunity:** Input validation is uneven. Auth requests validate only basic strings, shop routes trust `itemId` shape, and `/api/progress` accepts complex payloads with almost no application-level validation. Invalid modes, malformed history entries, or oversized arrays currently rely on DB constraints or normalization side effects.
- **Prompt for Codex:**  
  `Add explicit request validation for /api/auth/signup, /api/auth/login, /api/shop/purchase, /api/shop/equip, and /api/progress. Validate types, enums, and array/object shapes before any DB write, return JSON 400 errors for invalid input, and keep accepted payload fields backward-compatible unless a field is already effectively broken. Do not change endpoint URLs or introduce a large framework rewrite.`

## 5. Replace repeated user lookups with a current-user middleware

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, optionally a new middleware/helper file under `server/`
- **Issue / opportunity:** After `requireAuth`, nearly every protected route repeats the same `findUserById()` lookup and `401 "Session is no longer valid."` branch. The duplication makes the route file longer and increases the chance of inconsistent auth behavior.
- **Prompt for Codex:**  
  `Extract a reusable middleware that loads the authenticated user after JWT verification and attaches it to the request. Refactor protected routes to use that shared current-user middleware, preserve the existing 401 behavior/message for invalid sessions, and do not change the public API contract.`

## 6. Break up `server/index.js` into focused route modules

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, new route/controller files under `server/`
- **Issue / opportunity:** The entire backend entrypoint currently owns bootstrapping, config reads, validation helpers, auth middleware, and all route definitions. The file is still manageable today, but it is already mixing unrelated concerns and is the main reason the backend lacks clean boundaries.
- **Prompt for Codex:**  
  `Refactor the backend entrypoint into small route-focused modules (for example auth, progress, and shop) plus shared middleware/helpers. Keep the same endpoint URLs, request/response shapes, and startup behavior. This is a structural cleanup only; do not change product behavior unless required to preserve existing functionality during the refactor.`

## 7. Move purchase/equip SQL out of the state store and into a repository/service boundary

- **Priority:** Medium
- **Affected area/files:** `server/playerStateStore.js`, `server/db.js`, any new backend service/repository files
- **Issue / opportunity:** `playerStateStore.js` currently mixes business rules, direct SQL, and response shaping, while `db.js` already acts like a repository for other flows. That split is inconsistent and makes future transaction changes harder to reason about.
- **Prompt for Codex:**  
  `Refactor shop purchase/equip backend logic so direct SQL lives behind repository-style functions instead of inside playerStateStore.js. Keep the same transactional behavior, endpoint behavior, and response payloads, and avoid introducing a broad architecture rewrite beyond the purchase/equip flow.`

## 8. Stop rewriting whole collections/history tables on every progress save

- **Priority:** High
- **Affected area/files:** `server/db.js`, `server/index.js`
- **Issue / opportunity:** `saveUserProgress()` deletes and recreates `user_collection`, `round_history`, and `user_achievement_progress` for the user on each progress update. That is expensive, makes writes scale poorly as history grows, and increases race-condition risk if multiple saves overlap.
- **Prompt for Codex:**  
  `Optimize backend progress persistence so /api/progress no longer deletes and reinserts the user's entire collection, round history, and unlocked achievements on every save. Preserve current functionality and returned progress data, but switch to incremental or diff-based writes where possible. Keep the change scoped to persistence behavior; do not redesign the frontend sync model in this task.`

## 9. Tighten the `/api/progress` contract and remove ghost fields

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`, `src/App.jsx`, `src/app/useAppPlayerState.js`
- **Issue / opportunity:** The backend accepts `selectedModeId` in progress payloads but does not persist it, and history responses expose overlapping fields like `modeId` and `difficultyId`. The route contract is partly historical and partly dead, which makes future maintenance error-prone.
- **Prompt for Codex:**  
  `Audit the /api/progress contract and clean up fields that are accepted but not truly persisted or required. Either persist selectedModeId end-to-end or remove it from the backend contract safely, document/standardize any duplicated history fields, and preserve current frontend behavior. Do not broaden the API surface beyond what is needed for contract clarity.`

## 10. Decouple backend catalog mapping from frontend-only module paths

- **Priority:** Medium
- **Affected area/files:** `server/shopItemMap.js`, `src/constants/shopCatalog.js`, potentially a new shared module
- **Issue / opportunity:** The backend imports cosmetic catalog data from `src/constants/shopCatalog.js`. That couples server behavior to frontend folder structure and makes backend-only changes riskier than they need to be.
- **Prompt for Codex:**  
  `Decouple the backend shop/item mapping from frontend-only source paths by extracting the shared catalog data into a module that can be imported cleanly by both server and client. Preserve existing item ids, prices, built-in flags, and API behavior. Do not rename public item ids or reorganize unrelated frontend code.`

## 11. Centralize environment/config parsing and startup validation

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`, `.env.example`, `README.md`
- **Issue / opportunity:** Environment reads and defaults are spread across multiple files. Some required values fail fast (`JWT_SECRET`), while others silently fall back. The current setup works locally, but it is easy to misconfigure and hard to audit.
- **Prompt for Codex:**  
  `Create a centralized backend config module that reads and validates environment variables at startup. Move scattered process.env access into that module, keep local development defaults only where they are intentional, and preserve the current server behavior unless the existing behavior is clearly unsafe or misleading. Update backend env docs as needed.`

## 12. Add basic auth hardening around brute-force attempts

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `package.json`
- **Issue / opportunity:** The backend exposes login/signup endpoints with password hashing but no rate limiting or simple abuse controls. That is a practical security gap for any public-facing auth API.
- **Prompt for Codex:**  
  `Add a minimal, backend-only hardening pass for the auth routes by introducing request rate limiting (or an equivalent lightweight abuse-control mechanism) for signup and login. Keep the existing auth flow and response format intact, scope the change to the Express backend, and avoid adding heavyweight infrastructure or a full auth redesign.`

## 13. Improve backend logging and request traceability

- **Priority:** Medium
- **Affected area/files:** `server/index.js`, `server/db.js`, `server/playerStateStore.js`
- **Issue / opportunity:** The server currently relies on a few `console.log`/`console.error` calls. There is no request-level context, which makes production debugging and support work harder than necessary.
- **Prompt for Codex:**  
  `Add lightweight request-aware logging to the Express backend. Include enough context to trace failed auth, shop, and progress requests without logging secrets or full auth tokens, and keep the implementation simple and local to this codebase. Do not introduce a large observability stack.`

## 14. Clean up unused backend code paths and dependencies

- **Priority:** Low
- **Affected area/files:** `server/index.js`, `server/db.js`, `server/playerStateStore.js`, `server/shopItemMap.js`, `package.json`
- **Issue / opportunity:** There are several signs of leftover or unused backend pieces, including `createDefaultUserProgress()`, `syncCoins()`, the unused `/api/player/state` route on the current client, and the `better-sqlite3` dependency even though the backend is MySQL-based.
- **Prompt for Codex:**  
  `Do a backend cleanup pass for obviously unused code and dependencies. Remove or isolate dead helpers/routes/deps only where usage can be verified locally, preserve any behavior still exercised by the current frontend, and do not delete code that is merely unfamiliar without confirming it is unused first.`

## 15. Add smoke tests for the main backend flows

- **Priority:** Medium
- **Affected area/files:** `server/`, `package.json`, any new test files
- **Issue / opportunity:** The backend currently has no visible automated coverage for signup, login, auth session checks, progress saves, or shop actions. That makes even small refactors risky.
- **Prompt for Codex:**  
  `Add a small backend test suite that covers the highest-value API flows: signup, login, auth/me, invalid token handling, progress update validation, and at least one shop purchase/equip path. Keep the tests pragmatic and lightweight, and avoid forcing a major architecture change just to make testing possible.`
