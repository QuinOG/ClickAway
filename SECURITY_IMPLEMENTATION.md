# Security Interpretation And Realization For ClickAway

## Scope
This document interprets the required secure-programming topics for the ClickAway project and connects them to the current React + Express + Supabase Postgres implementation. The goal is not only to name the security ideas, but to show how they should be realized in this codebase.

## Security Requirements
For this project, the main security requirements are:

1. Only authenticated users should access protected gameplay and player-state features.
2. User input must be validated before it affects state, storage, or authorization decisions.
3. Server-side data must not trust client-side values without verification.
4. Errors should help developers debug without leaking sensitive details to users.
5. Player data updates should be safe, consistent, and resistant to tampering.
6. Security checks should be part of normal development, testing, and review work.

## Interpretation And Realization

### Principles of Secure Programming
Interpretation:
Write code so that the default behavior is safe, inputs are constrained, trust boundaries are explicit, and failures degrade cleanly.

Realization in this project:
- Treat the browser as untrusted and enforce checks in the server, even if the client already validates fields.
- Keep authentication, authorization, validation, and persistence logic on the backend.
- Normalize data before it is saved, returned, or reused.
- Prefer small, pure utility functions because they are easier to test and harder to misuse.

Current examples:
- [server/index.js](server/index.js) validates usernames and passwords before account creation.
- [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js) normalizes progress input and falls back to default values in `normalizeProgressInput`.
- [server/playerStateStore.js](server/playerStateStore.js) checks item ownership and coin balance before purchase/equip actions.

Recommended next realization steps:
- Add schema-level validation for the remaining request bodies, especially challenge and round-completion payloads.
- Cap numeric ranges such as coins, XP, MMR, and history lengths to prevent unrealistic or malicious payloads.

### Robust Programming
Interpretation:
The program should continue behaving predictably when given invalid, missing, extreme, or unexpected input.

Realization in this project:
- Use safe defaults when persisted data is absent or malformed.
- Clamp values to valid ranges.
- Make route handlers return controlled responses instead of crashing the process.

Current examples:
- `toNonNegativeNumber` and `normalizeProgressInput` in [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js) coerce missing or malformed numeric progress fields to safe defaults.
- `normalizeOwnedItemIds` and `resolveEquippedItemId` in [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js) discard unknown or unowned cosmetic ids and fall back to the defaults.
- `normalizeProgressPayload` and `clampProgressBounds` in [server/index.js](server/index.js) limit `PUT /api/progress` to client-controlled fields and clamp coins, XP, and MMR.

Gap:
- `PUT /api/progress` accepts only the fields listed in `normalizeProgressPayload` (equipped cosmetic ids, `activeLoadoutId`, `savedLoadouts`, `selectedModeId`, `buildWalkthrough`, and `seenUnlockPartIds`); any other body keys are dropped. Request coins, XP, MMR, and history are not taken from the client: they are merged onto the stored progress and kept from it (then clamped by `clampProgressBounds`). Unlocked achievements are the one server-owned field that is recomputed, via `resolveUnlockedAchievementIds`. `selectedModeId` is accepted by the endpoint but never persisted, and no catalog check applies to it: `saveUserProgress` does not write it, and reads return `DEFAULT_PROGRESS.selectedModeId` (`"normal"`), so the submitted value is silently ignored. The other client-controlled identifiers are checked against their catalogs during persistence, but invalid values are replaced or filtered rather than rejected with an error: the equipped cosmetic ids are resolved through the shop catalog, type-checked, and (for non-built-in items) ownership-checked by `resolveEquippedItemId`, falling back to the default for the type; `activeLoadoutId` must match a fixed loadout slot id (`loadout_1`–`loadout_3`) or it falls back to `loadout_1`; `savedLoadouts` is rebuilt from the fixed slot list with module and powerup ids filtered against the build catalogs and unlock levels; `seenUnlockPartIds` keeps only ids from the unlock-wall catalog; and `buildWalkthrough` keeps only known statuses, falling back to `dismissed`.

### Defensive Programming
Interpretation:
Assume callers can be wrong, data can be malformed, and system boundaries can fail.

Realization in this project:
- Reject unknown item identifiers.
- Re-check ownership and balance on the server before mutating shop state.
- Require authentication before protected routes execute.
- Keep database writes behind controlled helper functions.

Current examples:
- `resolveMappedItemOrThrow` in [server/playerStateStore.js](server/playerStateStore.js) rejects invalid item IDs.
- `requireAuth` in [server/index.js](server/index.js) blocks unauthenticated access.
- Purchase and equip flows use transactions through the mysql2-compatible Postgres shim in [server/playerStateStore.js](server/playerStateStore.js).

## Security Best Practices

### Parameter validation and type checking for a function
Interpretation:
Every externally influenced function should validate both structure and acceptable values.

Realization:
- Validate route inputs such as `username`, `password`, `itemId`, and progress fields.
- Convert input values explicitly using `String(...)` and `Number(...)`.
- Reject values outside allowed ranges rather than silently accepting everything.

Current examples:
- `validateUsername` and `validatePassword` in [server/validation.js](server/validation.js).
- `normalizeProgressInput` and `saveUserProgress` in [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js).

Recommended improvement:
- Cosmetic, loadout, module, powerup, unlock-wall, and walkthrough identifiers are already checked against their catalogs during persistence, and invalid values fall back to defaults or are filtered out rather than saved. `selectedModeId` is the remaining identifier without a catalog check: it is never persisted, the endpoint accepts it and silently ignores it, and reads always return the default. It should either be validated against the mode catalog and persisted or dropped from the allowlist. The endpoint also has no explicit rejection path for structurally invalid progress bodies (for example, a non-array `savedLoadouts` or a number-valued `buildWalkthrough`); consider returning `400` for those instead of silently substituting defaults.

### Cover all cases - use defaults to handle cases not explicitly covered
Interpretation:
Unexpected cases should fall back to safe defaults instead of producing undefined behavior.

Realization:
- Use default player progress and default equipped items.
- Handle missing auth headers, missing records, and invalid JSON cleanly.

Current examples:
- `DEFAULT_PROGRESS` in [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js).
- Default equipped ids and catalog-backed state in [server/serverShopCatalogIdMappings.js](server/serverShopCatalogIdMappings.js).
- Fallback API messages in [src/services/clickAwayHttpApiClient.js](src/services/clickAwayHttpApiClient.js).

### Catch and handle exceptions at the lowest level possible
Interpretation:
Errors should be caught where useful recovery or classification is still possible.

Realization:
- Parse failures should be handled inside parsing helpers.
- Route-level business errors should be converted into safe HTTP responses.
- Unexpected errors should be logged server-side and returned as generic failures.

Current examples:
- `normalizeProgressInput` in [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js) defaults malformed numeric and list fields instead of throwing.
- `handleRouteError` in [server/index.js](server/index.js) maps known errors to safe responses.
- API wrappers in [src/services/clickAwayHttpApiClient.js](src/services/clickAwayHttpApiClient.js) convert transport errors into user-facing messages.

### Avoidance of risky coding constructs
Interpretation:
Do not use language or framework features that make injection, hidden side effects, or unsafe execution easier.

Realization:
- Avoid `eval`, dynamic code execution, direct HTML injection, and string-built SQL with user input.
- Prefer parameterized SQL queries and controlled data mapping.

Current examples:
- Database access uses parameterized Postgres queries through the pool shim in [server/db/pgPool.js](server/db/pgPool.js).
- The frontend does not use `dangerouslySetInnerHTML` in the main app flow.

### Avoid information leakage through error messages
Interpretation:
Users should not see stack traces, SQL details, JWT secrets, or internal security rules.

Realization:
- Return concise messages like "Invalid username or password."
- Log internal detail on the server, but keep responses generic.

Current examples:
- Login returns the same error for bad username and bad password in [server/index.js](server/index.js).
- `handleRouteError` returns `Unexpected server error.` for unknown failures.

Recommended improvement:
- Review all client-side error displays so backend messages never expose internals such as schema details or provider configuration.

### Apply security practices to classes
Interpretation:
Classes should enforce invariants, avoid leaking mutable internal state, and clearly encode safe failure modes.

Realization:
- Use dedicated error classes for controlled failures.
- Keep class/object construction narrow and explicit.

Current examples:
- `PlayerStateError` in [server/playerStateStore.js](server/playerStateStore.js) standardizes safe status/message handling.

### Don't allow external interfaces data changes by reference
Interpretation:
External callers should not receive a mutable reference to internal state that they can change later.

Realization:
- Return normalized copies of arrays and objects instead of reusing caller-owned references.
- Clone arrays when saving or deriving state.

Current examples:
- [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js) deduplicates and filters owned item ids with `normalizeStringList` and `normalizeOwnedItemIds`, and serializes JSON columns with `JSON.stringify` before persistence.
- [server/playerStateStore.js](server/playerStateStore.js) builds response objects from database reads instead of reusing request-body references.

Recommended improvement:
- Continue avoiding direct mutation of request bodies and shared state objects.

### Use context to determine data access
Interpretation:
Authorization should depend on authenticated user context, not on client-supplied identity fields.

Realization:
- Use the JWT-derived `request.auth.userId` and `request.auth.username` to resolve data ownership.
- Never let the client choose which user record to update.

Current examples:
- `requireAuth` in [server/index.js](server/index.js) sets the trusted auth context.
- Protected routes fetch user state using `request.auth.userId`.

### Support data updates verification
Interpretation:
Before and after state changes, verify that the update is valid, complete, and consistent.

Realization:
- Check ownership before equip.
- Check coin balance before purchase.
- Use transactions where concurrent writes could create inconsistent results.

Current examples:
- Purchase and equip verification in [server/playerStateStore.js](server/playerStateStore.js).
- Postgres transactions around shop mutations in [server/playerStateStore.js](server/playerStateStore.js), using `beginTransaction()` backed by `BEGIN`/`COMMIT` in [server/db/pgPool.js](server/db/pgPool.js).

Recommended improvement:
- Keep the `/api/progress` allowlist narrow and validate the one remaining unchecked identifier (`selectedModeId`) against the mode catalog or drop it from the allowlist.

### Authenticate
Interpretation:
The system must confirm user identity before granting access to protected resources.

Realization:
- Hash passwords before storage.
- Issue signed JWTs after successful login/signup.
- Verify tokens on each protected request.

Current examples:
- `bcrypt.hash` and `bcrypt.compare` in [server/index.js](server/index.js).
- JWT signing and verification in [server/auth.js](server/auth.js).
- Protected frontend routes in [src/components/routing/ProtectedRoute.jsx](src/components/routing/ProtectedRoute.jsx).

## Programming Flaws
Interpretation:
Programming flaws are mistakes that create security weaknesses even when the program still appears to work.

Project-relevant examples:
- Trusting client-submitted progress too much.
- Forgetting to bound numeric values.
- Returning detailed backend errors to the UI.
- Failing to test invalid and adversarial inputs.
- Inconsistent validation between the round-completion and progress-update paths.

## Buffer Overflows
Interpretation:
Classic memory buffer overflows are less common in JavaScript because the runtime manages memory, but the concept still matters as input-size abuse and unsafe native boundaries.

Realization in this project:
- Bound input lengths such as usernames, passwords, and history payload sizes.
- Be careful with large JSON request bodies and database-backed arrays.
- Treat native modules and dependencies such as the `pg` client as trusted code that still requires cautious input handling.

Practical note:
- In this codebase, "buffer overflow" risk is more about oversized payloads and dependency/native-module risk than manual memory writes.

## Integer Errors
Interpretation:
Integer errors include underflow, overflow, truncation, wraparound, and incorrect assumptions about numeric ranges.

Realization in this project:
- Clamp values to non-negative numbers.
- Define upper bounds for coins, XP, MMR, streaks, and round counters.
- Reject `NaN`, `Infinity`, and nonsensical values.

Current examples:
- `toNonNegativeNumber` in [server/playerMysqlDatabase.js](server/playerMysqlDatabase.js).
- `Math.max(0, ...)` coin, XP, and MMR clamping in [server/index.js](server/index.js).

Gap:
- The server now clamps coins, XP, and MMR to fixed ceilings. Client-controlled cosmetic, loadout, module, powerup, unlock-wall, and walkthrough identifiers are checked against their catalogs during persistence and replaced or filtered when invalid; `selectedModeId` is the remaining unchecked identifier, accepted by the endpoint but never persisted.

## Static Analysis
Interpretation:
Static analysis finds likely defects and insecure patterns without executing the program.

Realization in this project:
- Use ESLint on both frontend and backend code.
- Treat lint failures as blockers in pull requests.
- Add security-focused rules and optionally a dedicated scanner later.

Current examples:
- [eslint.config.js](eslint.config.js) enforces baseline code-quality checks.

Recommended workflow:
- Run `npm run lint` on every branch before merge.
- Add test and lint checks to CI when available.

## Data Obfuscation
Interpretation:
Obfuscation hides data structure or meaning from casual observers, but it is not a substitute for real security.

Realization in this project:
- Do not rely on obfuscation to protect secrets or authorization.
- It is acceptable to obscure non-sensitive client-side display data, but not to protect credentials or player authority.

Practical rule:
- JWT secrets, passwords, and server-only rules must stay on the server; client obfuscation is not sufficient.

## Data Protection
Interpretation:
Sensitive data should be protected in transit, at rest, and in logs.

Realization in this project:
- Passwords are hashed, not stored in plain text.
- Secrets are read from environment variables.
- Database writes should avoid storing unnecessary sensitive information.

Current examples:
- Password hashing in [server/index.js](server/index.js).
- `JWT_SECRET` and admin credentials are read from environment variables in [server/index.js](server/index.js).

Recommended improvement:
- Prefer HTTPS in deployment (the session cookie is only marked `Secure` when `CLIENT_ORIGIN` is `https://` or `NODE_ENV=production`, so HTTPS is required for that protection to actually apply).
- Avoid logging tokens, passwords, or raw secret-bearing request bodies.

Update: the session token now lives in an httpOnly, `SameSite=Lax` cookie (`server/index.js`, `server/auth.js`) instead of `localStorage` plus a manually-attached `Authorization` header. Page JavaScript can no longer read or exfiltrate the token, and `SameSite=Lax` means the browser won't attach it to cross-site fetch/XHR requests, which covers CSRF for this JSON-only API without needing a separate CSRF token scheme.

## Secure Programming Paradigms

### Test-Driven Development
Interpretation:
Write the failing security/behavior test first, then implement the code to satisfy it.

How to realize it here:
- Start with tests for invalid usernames, invalid passwords, missing tokens, unknown item IDs, insufficient coins, and malformed progress payloads.
- Add regression tests whenever a bug or security issue is fixed.
- Focus early tests on `server/index.js`, `server/playerStateStore.js`, and pure utilities in `src/utils`.

Security value:
- TDD forces the team to define expected behavior for both valid and invalid cases before implementation.

### Pair Programming
Interpretation:
Two developers work together on the same change so one can continuously challenge assumptions and spot security mistakes.

How to realize it here:
- Use pair programming on auth flows, persistence code, and progress update validation.
- One developer drives implementation while the other checks threat assumptions, error handling, and edge cases.
- Rotate pairs so security knowledge spreads across the team.

Security value:
- Pairing is especially useful for finding missing validation, authorization mistakes, and inconsistent error handling.

### Informal Code Reviews
Interpretation:
Every meaningful change should be read by another developer before it is considered complete, even if the review process is lightweight.

How to realize it here:
- Require at least one teammate review for auth, shop, persistence, and route changes.
- Review checklist:
  - Are all external inputs validated?
  - Is the client being trusted too much?
  - Are error messages safe?
  - Are updates verified before commit?
  - Are tests covering success and failure cases?

Security value:
- Informal reviews catch logic flaws that static tools miss.

## Recommended Project Security Checklist
Before submission, the team should verify:

1. Protected routes require valid authentication.
2. Signup/login reject invalid input safely.
3. Shop purchase/equip rejects invalid or unauthorized actions.
4. Progress updates validate structure and value ranges.
5. No error response leaks stack traces, SQL, secrets, or internal configuration.
6. Lint passes and security-relevant edge cases are covered by tests.
7. Team documentation records who implemented, tested, and reviewed each security-sensitive area.

## Conclusion
In ClickAway, secure programming means more than adding authentication. It requires validating all external input, keeping authorization on the server, normalizing persisted state, returning safe error messages, and making TDD, pair programming, and code review part of the normal workflow. The project already includes good foundations such as password hashing, JWT authentication, normalized defaults, parameterized queries, and transactional updates in Postgres. The main remaining security focus should be stricter validation and verification of client-submitted progress data.
