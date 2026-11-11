---
name: clickaway-rsi
description: ClickawayRSI — the recursive self-improvement loop for ClickAway's UI/UX. A council of three models rates full-app screenshots, Claude implements the highest-value fixes, recaptures, and repeats until every judge scores ≥ 9 or the round cap is hit; each round is committed with before/after shots and posted to a PR. Use when the user says "ClickawayRSI", "run the council", "RSI loop", or asks to keep polishing ClickAway's look and feel through rated rounds.
---

# ClickawayRSI

Recursive self-improvement loop for ClickAway's UI/UX. **The skill improves itself too:** the last step of every run is updating `## Lessons` and `## Run log` below.

Before starting, restate the task to the user in 3–4 lines: who's on the council, the stop rule, and what this run is focusing on.

## Defaults (override with whatever the user says)
- **Goal:** move ClickAway from a SaaS-dashboard feel to a shipped indie-game feel (illustrated icons, game menus, world, juice) across the whole app.
- **Council:** `delegate_task` ×2, both launched in one message, `role: "review"`:
  - Codex `gpt-6.1-sol`, `{reasoningEffort: "high"}`
  - Claude `claude-opus-5`, `{effort: "low"}` (it's not in the short list; `orchestrator_capabilities` with `search: "opus-5"` finds it)
  - Terra was dropped after r5 at the user's request: it repeated 5 of Sol's 6 requests and scored a steady ~0.4 below Sol. Runs 1–5 used three judges (Sol, Terra, Opus at high effort).
- **Stop:** Sol ≥ 9.4 and Opus ≥ 9.0, or 6 rounds. Sol's bar is raised 0.4 to stand in for Terra, which was the harshest judge. Count rounds per run.

## Files
- Capture spec: `tests/e2e/zz-app.spec.js` (12 shots: login, every route captured at full content height, settings sheet, live round, results). `.mainContent` is the scroll container, so the spec grows the viewport to fit the content.
- Judge brief: `docs/ui-polish/game-feel/brief.md` (scale, ≤350-word reply format).
- Reference bar: `docs/ui-polish/standards/standard-1..4.jpg`
- Shots: `docs/ui-polish/game-feel/iN/`, change notes `docs/ui-polish/game-feel/iN-changes.md`
- Run `npx playwright test tests/e2e/release-matrix.spec.js` when JSX changed. As of r5, three Armory tests fail on the pre-round code too (laptop clipped actions, armory a11y, armory install); don't chase them as regressions.
- Main stylesheet for this work: `src/styles/game-feel.css` (imported last in `src/styles/app.css`). Shared frame/world SVGs live there as `--gf-frame` / `--gf-world` data URIs; `#` must be written as `%23`.

## Loop (one round)
1. **Capture:** `SHOT_DIR=docs/ui-polish/game-feel/iN npx playwright test tests/e2e/zz-app.spec.js --workers=1`. Before sending, open 2–3 of the shots yourself to catch broken captures (blurred, empty, cut off).
2. **Council:** launch both judges with: `Follow <repo>/docs/ui-polish/game-feel/brief.md exactly. CURRENT_DIR = …/iN ; PREVIOUS_DIR = …/i(N-1) ; CHANGES_FILE = …/iN-changes.md . Standards: …/docs/ui-polish/standards/. Read-only; do not edit anything.` End your turn; completions wake you.
3. **Pick fixes (weighted, see "Decision model" below):** when both replies are in, build `docs/ui-polish/game-feel/i(N+1)-decisions.md` with the value table, picks, skips and predicted gains, then implement the picks.
4. **Implement:** CSS in `game-feel.css`; JSX when structure has to change. Keep existing tests green.
5. **Verify and guard:** `npm run build` (plus `npm run lint` and `npm run test` when JSX changed). Recapture into `i(N+1)`, view every screen you touched **and every PROTECT item** next to the previous round, and fix any regression before submitting. The change notes must be factual and measurable ("12px wood plank under each card row"): judges compare claims to pixels and mark down overclaiming.
6. **Commit and publish:** write `i(N+1)-changes.md`, commit code and shots together (`Game feel rN: …`), and push. Then, when the council's scores for that round are in:
   - add the scores to `docs/ui-polish/game-feel/scores.json`
   - post the **round comment** (previous round vs this round, for the shots you changed):
     `python .claude/skills/clickaway-rsi/post_round.py N "Sol x · Terra y · Opus z (prev: …)" docs/ui-polish/game-feel/iN-changes.md "<consensus for next round>" 04-shop.png,06-ladder.png > comment.json` then `sh .claude/skills/clickaway-rsi/gh.sh POST /issues/<PR>/comments comment.json`
   - rewrite the **PR description**, the always-current summary: the score table plus **baseline i0 vs latest iN for all 12 screens**:
     `python .claude/skills/clickaway-rsi/update_pr_body.py N docs/ui-polish/game-feel/scores.json > body.json` then `sh .claude/skills/clickaway-rsi/gh.sh PATCH /pulls/<PR> body.json`
   Put the json files in the scratchpad, not the repo. The user wants both views: the PR description shows the total transformation at a glance, and each round's commit and comment shows the step.
7. Go to step 2 with the new folder.

## Decision model
Judges reply with OVERALL, MOVE THE NEEDLE (each item `[est +0.X, confidence]`), DON'T BOTHER, PROTECT and REGRESSIONS (see `brief.md`).

1. **Cluster** all items from the three judges by screen + theme.
2. **Score each cluster:**
   `value = Σ(est × conf × judgeWeight) × consensus − Σ(0.15 × judgeWeight for each judge listing it in DON'T BOTHER)`
   - conf: high 1.0, med 0.7, low 0.4 (adjust per judge from calibration; see Lessons)
   - judgeWeight: the judge furthest below its stop bar ×1.2, the other ×1.0 (that judge is the bottleneck). With three judges it was ×1.3 / ×1.1 / ×1.0.
   - consensus: ×1 one judge, ×1.4 both (with three judges: ×1 / ×1.3 / ×1.6)
   - realism: after r5 the judges' own estimates over-predicted ~3–10× (predicted +0.8 to +1.1, got +0.1 to +0.3). Use estimates to rank, not to forecast. When writing predicted gains, multiply the summed estimate by 0.3.
3. **Divide by cost** (S=1, M=2, L=3), rank, and take ~4–6 items.
4. **Rules:** veto anything both judges put in DON'T BOTHER; one judge's DON'T BOTHER only applies the penalty. Each judge's #1 is always done unless vetoed. PROTECT items are frozen (bug fixes only). Last round's REGRESSIONS come first.
5. **Calibrate** after scores arrive: in `iN-decisions.md`, record predicted vs actual gain per judge. A judge whose estimates keep missing gets a lower confidence multiplier, written into Lessons.
6. The round's PR comment includes a short "picked / skipped / predicted gain" line.

## GitHub without `gh`
`gh` isn't installed. Use `.claude/skills/clickaway-rsi/gh.sh METHOD /path [json-file]`; it takes the token from git's credential manager and never prints it. Equivalent by hand:
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
- Opus 5 is the harshest judge (≈0.5 below Sol). Terra is the slowest to move (flat r1→r3).
- Round 3 stalled (Opus −0.1, Terra flat) because the picks were mid-list for two judges, one change regressed (a brown APPLY that read as disabled), and the change notes overclaimed. That's why the decision model, the PROTECT/REGRESSIONS guard and factual notes exist.
- The user wants every round committed with before/after shots and visible in a PR. Open the PR in round 1, not at the end.

- On Windows, `python open()` without `encoding='utf-8'` writes cp1252: always pass the encoding when editing JSX/CSS, or non-ASCII characters like `·` get corrupted and render as missing-glyph boxes.
- Bash heredocs choke on CSS that contains single-quoted data URIs. Write the block with the Write tool to the scratchpad, then `cat >>` it.
- Before overriding a component's `::before`/`::after`, grep for its existing pseudo rules: inherited `top`/`width`/`height`/`overflow:hidden` silently break the new art (the shop shelf took three tries).
- The world art in `.arenaWorldArt` sits behind a 0.34 opacity layer and a `path { fill: none }` rule. New filled shapes need CSS fills, not SVG attributes.
- Edit this file with the Edit tool, not a script. The words "## Run log" also appear in the intro sentence, and a script matching them corrupted the header twice.
- Keep helper scripts in the skill folder (`gh.sh`, `post_round.py`, `update_pr_body.py`, `skins.py`), not the scratchpad: the scratchpad is wiped between sessions.

- After ~3 rounds of chrome, the judges converge on **art**: stock or photo assets are the loudest "not a game" tell. The fix that works is a generated SVG set in one hand (`public/skins/`, generator `.claude/skills/clickaway-rsi/skins.py`: ink outline, top-left light, flat base, cel crescent, highlight). Render a contact sheet with Playwright and fix clipping before wiring it in.
- Class-name attribute selectors are case-sensitive: the history tone classes are `isRanked` / `isCasual` / `isPractice`, so `[class*="ranked"]` never matches.
- In `.arenaWorldArt`, CSS `fill:none` beats SVG fill attributes. Use JSX `style={{ fill }}` for per-shape colours.

- Scores climb ~+0.2 per round once past 7.5, no matter how big the round is. Breadth beats depth after that point: judges average over all 12 screens, so one screen getting great moves the score less than the weakest 3 screens getting decent.
- Trimming sizes to fix a "too tall" regression can cost presence (Duels r6). Cut padding before cutting the hero elements.
- Check catalog scale before redrawing an asset: the "lost translucency" bubble was `shopImageScale: 250` cropping its rim, not the art.
- In the arena, `.arenaFloor` is a perspective plane: at rotateX(62deg) it collapses into a strip at the bottom. Use ~35deg with `top: 20%` so painted floor art is visible.
- `font: 800 11px var(--x, inherit)` is invalid (inherit can't sit inside a shorthand), so the whole declaration is dropped. Use separate font-weight/font-size.


## Run log
- 2026-11-11 run 1 (branch `game-feel-council`, PR #12): i0 Sol 6.6 / Terra 6.8 / Opus 6.4 → i1 7.1 / 6.8 / 6.5 (global frames, world, titles, ladder plaques, console switches). i2 7.3 / 7.0 / 7.2 (login title screen, illustrated Help, results ceremony, history climb, duels VS, ladder tabs). i3 7.4 / 7.0 / 7.1 (shop storefront, profile trophy cabinet, settings console, arena crowd). i4 7.7 / 7.2 / 7.5 (illustrated SVG item set, painted arena crowd, history tickets, settings ribbon/gold apply, fewer brackets).
  - Decision model added after i4. **Re-ran the council on i4 with the new brief** (DON'T BOTHER / PROTECT / estimates) before round 5. Build `i5-decisions.md` from those replies; it supersedes the plan below.
  - r5 (`07a487f`): painted arena stadium, Help 4-panel round strip and chapters, Duels fight card, Ladder metal plates, plus fixes for the bubble scale and the ticket notch. i5 Sol 7.8 / Terra 7.4 / Opus 8.0 (predicted 8.8 / 7.9 / 8.9).
  - Council changed after r5: Terra dropped, Opus to low effort, stop bar Sol ≥ 9.4 / Opus ≥ 9.
  - r6 (`dc3100a`): hardwood court in the arena and lobby, Profile character sheet, stadium theme previews in the Shop, Help ch.4–5 cards. i6 Sol 8.0 / Opus 8.0 (predicted ~8.1 / ~8.2). **Run 1 ended at the 6-round cap.** Total: i0 avg 6.6 → i6 avg 8.0.
  - **NEXT RUN (start here):** both judges' consensus is the shared shell: "the world stops at the court edge".
    1. Ladder and History on a physical substrate (banner wall or bracket board; a pinned ticket ledger), plus a podium with depth.
    2. A stadium control rail and nav plates instead of nested navy frames and the utility capsule.
    3. A characterful display face for titles and numerals.
    4. Shop: a large inspection stage for the equipped item, with compact shelves.
    5. Restrain the court's seams and stagger the joints (Sol).
    6. Restore Duels portrait presence, and add a trend cue to the Profile form coins.
    Opus asked for the Armory right rail as workbench parts, but Sol protects the Armory trade-offs: do it only as a material change and keep the trade-off readout.
  - Earlier plan (superseded): **NEXT = round 5 (2 rounds left in run 1).** Consensus plan: (1) Help → illustrated field manual: side chapter tabs, paper/metal pages, FAQ as pages, fewer small cards — biggest drag per Opus; (2) Ladder → dimensional winners' podium (stepped platforms, big portraits, tier crests) + rank plaques of varying weight, own row distinct, drop header row; (3) Arena → paint floor/rails/trusses (no cyan wireframe), add foreground element + haze; (4) Shop → featured legendary on a big pedestal above compact trays, rarity-specific card presentation; (5) Global display numeral face for hero numbers + condensed micro-label face (self-host via @fontsource; check package availability offline first); (6) Duels confrontation layout if time. Capture to i5, PREVIOUS_DIR=i4.
