# Free RSI learning ledger

Read routing and active lessons each run. Update only from reviewed evidence. This ledger measures worker fit and review burden, not product quality scores.

## Current routing

Default worker: `opencode/deepseek-v4.1-flash-free`, variant `high`.

| Task class | Route | Basis |
| --- | --- | --- |
| Bounded backend documentation/source audits | Bounded trial | One static comparison favored DeepSeek; no implementation batch reviewed yet. |
| Test-coverage mapping | Bounded trial | Useful distinction between mocked and backend coverage in the initial comparison. |
| Pure backend regression tests | Bounded trial | Implementation quality has not been evaluated. |
| Small non-UI bug fixes | Bounded trial | Implementation quality has not been evaluated. |
| UI work or sensitive logic | Excluded | User's concurrent-work and risk boundaries; not performance routing. |

No measured token savings, implementation acceptance rate, or reviewer-time baseline exists yet. Do not calculate savings from the static comparison.

## Active lessons

### L1 - Verify absence and compatibility wrappers (provisional)
- Evidence: initial model comparison on 2026-11-12. GLM incorrectly reported no transactions; direct inspection found purchase/equip `beginTransaction()` calls in `server/playerStateStore.js`, backed by BEGIN/COMMIT in `server/db/pgPool.js`. DeepSeek got this right.
- Applies: negative claims in docs/source audits, especially historical names and wrappers.
- Instruction: inspect likely implementations, aliases, and callers before reporting absence. Already in the worker brief.
- Next check: independently verify negative claims in the next matching report; no unsupported absence claims. This is a cross-model caution, not a DeepSeek failure or repeated success.
- Comparable validation successes: 0.

### L2 - Count adoption from actual imports (provisional)
- Evidence: initial comparison. DeepSeek said only four production files used the UI kit, overlooking `Navbar.jsx` and `FeedbackSettingsSheet.jsx`; source search confirmed both imports. It also compared an old test count to a current test-file count.
- Applies: inventory/count claims, including test coverage maps. UI adoption itself remains out of implementation scope.
- Instruction: state the search scope and unit being counted; inspect direct subpath imports as well as barrel imports. Avoid exact counts unless useful and verified. Inject for matching tasks; test/file distinction is in the worker brief.
- Next check: reproduce any material reported inventory/count from source without discrepancies.
- Comparable validation successes: 0.

## Initial comparison - context only

2026-11-12: DeepSeek and GLM each received the same three read-only tasks: roadmap UI-01 through UI-05, auth coverage F-A01 through F-A10, and database documentation corrections. Parent source inspection preferred DeepSeek for correctly identifying transactions, more complete mocked auth coverage, and more careful roadmap acceptance checks. DeepSeek still missed UI imports and mixed counting units. No implementation was performed; source checks were selective, not exhaustive. Both models' token counts and reviewer times are unknown. This is one comparison, not a benchmark or completed maintenance run.

## Maintenance run records

No maintenance batch has been run with this skill yet.

For each completed batch, append a short record containing:
- Run/date, model/variant, base and final commits, skill/brief version (commit or diff reference).
- Each task's class and acceptance condition; accepted/unverified/rejected/blocked outcome.
- Checks and evidence links; concrete reviewer corrections; repair attempts.
- Light/moderate/substantial review burden and why; measured usage/time or unknown.
- Root cause for substantial guidance; exact next-run intervention and applicability.
- Lesson status changes, expected observable result, and next comparable validation.
- Separate process/skill changes from product changes. If no supported change is needed, record that.

Never count an unverified task as accepted, an infrastructure outage as model incompetence, or a lesson's creation as evidence that it works.
