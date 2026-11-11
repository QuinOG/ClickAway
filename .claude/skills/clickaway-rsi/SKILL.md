---
name: clickaway-rsi
description: ClickawayRSI — the recursive self-improvement loop for ClickAway's UI/UX. A council of three models rates full-app screenshots, Claude implements the highest-value fixes, recaptures, and repeats until every judge scores ≥ 9 or the round cap is hit; each round is committed with before/after shots and posted to a PR. Use when the user says "ClickawayRSI", "run the council", "RSI loop", or asks to keep polishing ClickAway's look and feel through rated rounds.
---

# ClickawayRSI

Recursive self-improvement loop for ClickAway's UI/UX. **The skill improves itself too:** the last step of every run is updating `## Lessons` and `- On Windows, `python open()` without `encoding='utf-8'` writes cp1252: always pass the encoding when editing JSX/CSS, or non-ASCII characters like `·` get corrupted and render as missing-glyph boxes.
- Bash heredocs choke on CSS that contains single-quoted data URIs. Write the block with the Write tool to the scratchpad, then `cat >>` it.
- Before overriding a component's `::before`/`::after`, grep for its existing pseudo rules: inherited `top`/`width`/`height`/`overflow:hidden` silently break the new art (the shop shelf took three tries).
- The world art in `.arenaWorldArt` sits behind a 0.34 opacity layer and a `path { fill: none }` rule. New filled shapes need CSS fills, not SVG attributes.
- A reusable `post_round.py` in the scratchpad builds the PR comment: `python post_round.py N "scores" iN-changes.md "consensus" shot1,shot2`.

- After ~3 rounds of chrome, the judges converge on **art**: stock or photo assets are the loudest "not a game" tell. The fix that works is a generated SVG set in one hand (`public/skins/`, generator `scratchpad/skins.py`: ink outline, top-left light, flat base, cel crescent, highlight). Render a contact sheet with Playwright and fix clipping before wiring it in.
- Class-name attribute selectors are case-sensitive: the history tone classes are `isRanked` / `isCasual` / `isPractice`, so `[class*="ranked"]` never matches.
- In `.arenaWorldArt`, CSS `fill:none` beats SVG fill attributes. Use JSX `style={{ fill }}` for per-shape colours.

## Run log` below.

Before starting, restate the task to the user in 3–4 lines: who's on the council, the stop rule, and what this run is focusing on.

## Defaults (override with whatever the user says)
- **Goal:** move ClickAway from a SaaS-dashboard feel to a shipped indie-game feel (illustrated icons, game menus, world, juice) across the whole app.
- **Council:** `delegate_task` ×3, all launched in one message, `role: "review"`:
  - Codex `gpt-6.1-sol`, `{reasoningEffort: "high"}`
  - Codex `gpt-6.1-terra`, `{reasoningEffort: "high"}`
  - Claude `claude-opus-5`, `{effort: "high"}` (it's not in the short list; `orchestrator_capabilities` with `search: "opus-5"` finds it)
- **Stop:** every judge ≥ 9.0, or 6 rounds. Count rounds per run.

## Files
- Capture spec: `tests/e2e/zz-app.spec.js` (12 shots: login, every route captured at full content height, settings sheet, live round, results). `.mainContent` is the scroll container, so the spec grows the viewport to fit the content.
- Judge brief: `docs/ui-polish/game-feel/brief.md` (scale, ≤350-word reply format).
- Reference bar: `docs/ui-polish/standards/standard-1..4.jpg`
- Shots: `docs/ui-polish/game-feel/iN/`, change notes `docs/ui-polish/game-feel/iN-changes.md`
- Main stylesheet for this work: `src/styles/game-feel.css` (imported last in `src/styles/app.css`). Shared frame/world SVGs live there as `--gf-frame` / `--gf-world` data URIs; `#` must be written as `%23`.

## Loop (one round)
1. **Capture:** `SHOT_DIR=docs/ui-polish/game-feel/iN npx playwright test tests/e2e/zz-app.spec.js --workers=1`. Before sending, open 2–3 of the shots yourself to catch broken captures (blurred, empty, cut off).
2. **Council:** launch all 3 judges with: `Follow <repo>/docs/ui-polish/game-feel/brief.md exactly. CURRENT_DIR = …/iN ; PREVIOUS_DIR = …/i(N-1) ; CHANGES_FILE = …/iN-changes.md . Standards: …/docs/ui-polish/standards/. Read-only; do not edit anything.` End your turn; completions wake you.
3. **Pick fixes:** when all 3 are in, take the consensus items with the biggest visual impact (things 2+ judges name first). Prefer structural changes (replace a table or form with a game composition) over decoration. Aim for 4–6 per round.
4. **Implement:** CSS in `game-feel.css`; JSX when structure has to change. Keep existing tests green.
5. **Verify:** `npm run build` (plus `npm run lint` and `npm run test` when JSX changed). Recapture into `i(N+1)` and view the screens you touched.
6. **Commit and publish:** write `i(N+1)-changes.md`, commit code and shots together (`Game feel rN: …`), push, then post a PR comment with the scores, the change list and a Before/After table (raw image URLs `https://github.com/QuinOG/ClickAway/blob/<branch>/docs/ui-polish/game-feel/iN/<file>?raw=true`). Update the score table in the PR body.
7. Go to step 2 with the new folder.

## GitHub without `gh`
`gh` isn't installed. Use a scratchpad helper:
```sh
T=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')
curl -s -X POST -H "Authorization: Bearer $T" -H "Accept: application/vnd.github+json" https://api.github.com/repos/QuinOG/ClickAway/issues/<PR>/comments --data-binary @body.json
```
Build JSON bodies with Python (`json.dump`) and never echo the token. Link the PR to the thread with `link_pull_request`.

## Lessons (append; never delete without reason)
- A page's "full-page" Playwright screenshot is only 900px tall because the app scrolls `.mainContent`, not the document. The capture spec resizes the viewport instead.
- Run the live round on a fresh browser context. Reusing the page after the settings sheet leaves the round blurred/paused and produces an empty results screen.
- Gold gradient titles need `-webkit-text-fill-color: transparent` **and** `text-shadow: none`, or older dark text-shadows show through the transparent fill. Use `filter: drop-shadow` for the outline.
- Judges punish structure more than paint: tables with column headers, axis charts, numbered form wizards, and formula text read as SaaS no matter how they're framed. A global CSS re-skin (r1) moved scores only ~+0.2; replacing compositions is what moves them.
- Opus 5 is the harshest judge (≈0.5 below Sol). Plan for its list.
- The user wants every round committed with before/after shots and visible in a PR. Open the PR in round 1, not at the end.

- On Windows, `python open()` without `encoding='utf-8'` writes cp1252: always pass the encoding when editing JSX/CSS, or non-ASCII characters like `·` get corrupted and render as missing-glyph boxes.
- Bash heredocs choke on CSS that contains single-quoted data URIs. Write the block with the Write tool to the scratchpad, then `cat >>` it.
- Before overriding a component's `::before`/`::after`, grep for its existing pseudo rules: inherited `top`/`width`/`height`/`overflow:hidden` silently break the new art (the shop shelf took three tries).
- The world art in `.arenaWorldArt` sits behind a 0.34 opacity layer and a `path { fill: none }` rule. New filled shapes need CSS fills, not SVG attributes.
- A reusable `post_round.py` in the scratchpad builds the PR comment: `python post_round.py N "scores" iN-changes.md "consensus" shot1,shot2`.

- After ~3 rounds of chrome, the judges converge on **art**: stock or photo assets are the loudest "not a game" tell. The fix that works is a generated SVG set in one hand (`public/skins/`, generator `scratchpad/skins.py`: ink outline, top-left light, flat base, cel crescent, highlight). Render a contact sheet with Playwright and fix clipping before wiring it in.
- Class-name attribute selectors are case-sensitive: the history tone classes are `isRanked` / `isCasual` / `isPractice`, so `[class*="ranked"]` never matches.
- In `.arenaWorldArt`, CSS `fill:none` beats SVG fill attributes. Use JSX `style={{ fill }}` for per-shape colours.

## Run log
- 2026-11-11 run 1 (branch `game-feel-council`, PR #12): i0 Sol 6.6 / Terra 6.8 / Opus 6.4 → i1 7.1 / 6.8 / 6.5 (global frames, world, titles, ladder plaques, console switches). i2 7.3 / 7.0 / 7.2 (login title screen, illustrated Help, results ceremony, history climb, duels VS, ladder tabs). i3 7.4 / 7.0 / 7.1 (shop storefront, profile trophy cabinet, settings console, arena crowd). r4: illustrated SVG item set, painted arena crowd, history match tickets, settings ribbon/gold apply, fewer brackets.
