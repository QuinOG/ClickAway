---
name: clickaway-rsi
description: ClickawayRSI — the recursive self-improvement loop for ClickAway's UI/UX. A council of three models rates full-app screenshots, Claude implements the highest-value fixes, recaptures, and repeats until every judge scores ≥ 9 or the round cap is hit; each round is committed with before/after shots and posted to a PR. Use when the user says "ClickawayRSI", "run the council", "RSI loop", or asks to keep polishing ClickAway's look and feel through rated rounds.
---

# ClickawayRSI

Recursive self-improvement loop for ClickAway's UI/UX. **The skill improves itself too:** the last step of every run is updating `## Lessons` and `## Run log` below.

Before starting, restate the task to the user in 3–4 lines: who's on the council, the stop rule, and what this run is focusing on.

## Defaults (override with whatever the user says)
- **Goal:** move ClickAway from a SaaS-dashboard feel to a shipped indie-game feel (illustrated icons, game menus, world, juice) across the whole app.
- **Council (from run 2):** `delegate_task` ×4, all launched in one message, `role: "review"`, **all at medium reasoning** (user's rule):
  - Codex `gpt-6.1-sol`, `{reasoningEffort: "medium"}`
  - Claude `claude-opus-5`, `{effort: "low"}`. This is the one exception to medium, at the user's request, because Claude session usage is limited. (Not in the short list; `orchestrator_capabilities` with `search: "opus-5"` finds it)
  - OpenCode `opencode-go/gemini-4-argon`, `{variant: "medium"}` (providerInstanceId `opencode`)
  - OpenCode `opencode-go/qwen3.8-max`, `{variant: "medium"}`
  - Gemini and Qwen stay at **medium** (user, 2026-11-11): the image trim below is enough, since they are only slightly over pace.
  - Token budget (user, 2026-11-11): Gemini and Qwen were burning tokens fast, mostly on images (13 current + 13 previous PNGs, some 4600px tall). For them, add to the prompt: "Open all 13 CURRENT_DIR images, but open PREVIOUS_DIR images only for the screens named in CHANGES_FILE." Sol and Opus keep the full set.
  - Judges must read PNGs, so only image-input models qualify. Check `models.dev/api.json` → `modalities.input`.
  - Reserve: `opencode-go/grok-4.7` `{variant: "medium"}`. It takes images and supports medium, but has no public vision or design results yet.
  - Excluded because they lack a medium variant: Kimi K3.1 Pro (low/high/max) and Hy4 (none/high).
  - Text-only models (GLM 5.x, DeepSeek V4, LongCat, Big Pickle, Beam) can't judge screenshots.
  - History:
    - Run 1 rounds 0–5 used Sol, Terra and Opus at high effort.
    - Terra was dropped after r5: it repeated 5 of Sol's 6 requests and scored a steady ~0.4 below Sol.
    - Round 6 used Sol (high) and Opus (low).
- **Stop:** every judge ≥ 9.0 and Sol ≥ 9.4 (Sol runs ~0.4 above harsher judges), or 6 rounds. Run 2's first council read is the baseline for the new judges: re-check after it whether Gemini or Qwen needs its own offset. Count rounds per run.

## Files
- Capture spec: `tests/e2e/zz-app.spec.js` (13 shots: login, every route captured at full content height, settings sheet, live round, results, rank-up). `.mainContent` is the scroll container, so the spec grows the viewport to fit the content.
- Judge brief: `docs/ui-polish/game-feel/brief.md` (v2 from run 3: 13 screen scores, an anchor to the judge's previous scores, items as `screen now → after` plus ACCEPT, written to REPLY_FILE).
- Scoring tools: `council.py` (parses replies into tables and the next round's anchor), `ab_gate.py` (blind before/after gate), `docs/ui-polish/game-feel/calibration.json` (per-judge realism factor). Replies are saved in `docs/ui-polish/game-feel/replies/iN/`.
- Reference bar: `docs/ui-polish/standards/standard-1..4.jpg`
- Shots: `docs/ui-polish/game-feel/iN/`, change notes `docs/ui-polish/game-feel/iN-changes.md`
- Run `npx playwright test tests/e2e/release-matrix.spec.js` when JSX changed. As of r5, three Armory tests fail on the pre-round code too (laptop clipped actions, armory a11y, armory install); don't chase them as regressions.
- Main stylesheet for this work: `src/styles/game-feel.css` (imported last in `src/styles/app.css`). Shared frame/world SVGs live there as `--gf-frame` / `--gf-world` data URIs; `#` must be written as `%23`.

## Loop (one round)
1. **Capture:** `SHOT_DIR=docs/ui-polish/game-feel/iN npx playwright test tests/e2e/zz-app.spec.js --workers=1`. Before sending, open 2–3 of the shots yourself to catch broken captures (blurred, empty, cut off).
2. **Council:** launch all judges with: `Follow <repo>/docs/ui-polish/game-feel/brief.md exactly. CURRENT_DIR = …/iN ; PREVIOUS_DIR = …/i(N-1) ; CHANGES_FILE = …/iN-changes.md . Standards: …/docs/ui-polish/standards/. Read-only; do not edit anything.` End your turn; completions wake you.
3. **Pick fixes (weighted, see "Decision model" below):** when all replies are in, build `docs/ui-polish/game-feel/i(N+1)-decisions.md` with the value table, picks, skips and predicted gains, then implement the picks.
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

## Scoring v2 (from run 3; replaces the loop's steps 2, 3 and 5 where they differ)
Why: in run 2 every round landed between −0.17 and +0.25 on average, and Sol never left 8.0–8.2. Three causes:
- **Noise:** each fresh judge re-scored all 13 screens from scratch, so round-to-round drift (about ±0.2) was as big as the real gains.
- **Unattributable scores:** one overall number can't say which screen moved it.
- **Overclaims:** claims a judge couldn't see in a 100% crop cost up to 0.4 (Opus in r9 and r11).

The mechanics that answer each:
1. **Per-screen scores with an anchor.** `brief.md` v2 makes each judge score all 13 screens, and OVERALL is their mean. Unchanged screens keep last round's score unless the judge names a missed defect. That removes the drift, so a gain on a changed screen shows up as a gain.
   - Prompt each judge with: `Follow <repo>/docs/ui-polish/game-feel/brief.md exactly. JUDGE = <sol|opus|gemini|qwen> ; CURRENT_DIR = …/iN ; PREVIOUS_DIR = …/i(N-1) ; CHANGES_FILE = …/iN-changes.md ; PREVIOUS_SCORES = …/i(N-1)-screens.json ; REPLY_FILE = …/replies/iN/<judge>.md . Standards: …/standards/.`
   - Add the Opus and Gemini/Qwen extras from Council.
   - Each judge writes its reply to REPLY_FILE and returns only the OVERALL line, which keeps four long replies out of the session context.
   - The first council of a run has no PREVIOUS_SCORES. It is the anchor read.
2. **Arithmetic, not vibes.** `python .claude/skills/clickaway-rsi/council.py N` parses the replies and writes `iN-screens.json`, which becomes the next round's PREVIOUS_SCORES. It prints:
   - the judge × screen table, with changes since last round;
   - every MOVE item ranked by expected overall gain: `(after − now) / 13 × conf × calibration[judge] × bottleneck weight`;
   - the screens that several judges asked about.

   **Rule of thumb:** a whole-point rise on one screen is only +0.08 overall. A round that should gain +0.15 needs about 2 screen-points per judge before calibration, or about 4 after. That means 3–4 screens each rising roughly a point, not 6 screens each nudged.
3. **Pick to a target.** Choose items until the predicted gain is at least +0.15 for every judge and at least +0.15 for the bottleneck judge (prediction = Σ of that judge's own item gains on the picked screens). Prefer:
   - (a) a screen that 3–4 judges asked about;
   - (b) each judge's #1;
   - (c) items whose ACCEPT line can be met fully.

   If the target can't be reached with S/M work, take an L item rather than padding with small ones.
4. **ACCEPT checklist.** Copy every picked item's ACCEPT line into `iN-decisions.md`. Before writing the change notes, check each one against a 100% crop and mark it pass or fail. Change notes claim **only** the items that pass, and they state each one in the judge's own ACCEPT wording.
5. **Blind A/B gate (before committing and before the council).**
   - `python .claude/skills/clickaway-rsi/ab_gate.py make …/i(N-1) …/iN <scratchpad>/abN/pairs <changed screens>` copies each changed screen's before and after shots in a random X/Y order.
   - Then send one `delegate_task` to the gate judge (Opus, low): "For each <screen> in <pairs dir>, open <screen>-X.png and <screen>-Y.png. Which looks more like a shipped indie game (not a web app), and by how many points on a 10-point scale for that screen? Write one line per screen to <reply file>: `<screen>: X|Y|same | <margin> | <the deciding difference, ≤15 words>`. Read-only otherwise."
   - Run `ab_gate.py score`. Any screen judged SAME or OLD gets fixed or reverted before the council runs. This is the guard against a backwards round, and it costs about 10 images instead of about 80.
6. **Ratchet.** After the council, a changed screen whose mean dropped, or that 2+ judges scored lower, is reverted to the previous round's CSS for that screen at the start of the next round. Undo that screen's section in the round's CSS block, unless the next round rebuilds it anyway. Keep per-round CSS grouped by screen to make this cheap.
7. **Calibration file.** `docs/ui-polish/game-feel/calibration.json` holds `{judge: factor}`, which is the realized share of that judge's own claimed screen gains (start every judge at 0.5). After each round, set it to the running mean of (actual screen Δ ÷ claimed screen Δ) over the screens that were changed.

## Decision model (run 1–2; the cluster and veto rules still apply under v2)
Judges reply with OVERALL, MOVE THE NEEDLE (each item `[est +0.X, confidence]`), DON'T BOTHER, PROTECT and REGRESSIONS (see `brief.md`).

1. **Cluster** all items from the three judges by screen + theme.
2. **Score each cluster:**
   `value = Σ(est × conf × judgeWeight) × consensus − Σ(0.15 × judgeWeight for each judge listing it in DON'T BOTHER)`
   - conf: high 1.0, med 0.7, low 0.4 (adjust per judge from calibration; see Lessons)
   - judgeWeight: rank the judges by distance below their stop bar. The furthest gets ×1.3, the next ×1.15, the rest ×1.0 (the bottleneck judge counts most).
   - consensus: ×1 one judge, ×1.2 two, ×1.4 three, ×1.6 all four
   - Veto: anything that 2+ judges put in DON'T BOTHER.
   - realism: after r5 the judges' own estimates over-predicted ~3–10× (predicted +0.8 to +1.1, got +0.1 to +0.3). Use estimates to rank, not to forecast. When writing predicted gains, multiply the summed estimate by 0.3.
3. **Divide by cost** (S=1, M=2, L=3), rank, and take ~4–6 items.
4. **Rules:** veto anything 2+ judges put in DON'T BOTHER; a single judge's DON'T BOTHER only applies the penalty. Each judge's #1 is always done unless vetoed. PROTECT items are frozen (bug fixes only). Last round's REGRESSIONS come first.
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
- **Never `git worktree remove --force` a worktree that holds a `node_modules` junction.** Git followed the junction and deleted files in the main repo's `node_modules`, including `.bin`. Delete the junction first with PowerShell `[System.IO.Directory]::Delete(path, $false)`, then remove the worktree. To repair, stop stray `vite`/`esbuild` processes, then run `npm ci`.
- `gh.sh` already prefixes `/repos/QuinOG/ClickAway`. Pass `/issues/12/comments` and `/pulls/12`; a full `/repos/...` path returns 404.
- Adding a row of gauges to a fixed-height panel (the Armory rail) pushes content off the fold, and all four judges catch it. Put new gauges inline beside labels and trim padding by the same amount.
- Read the capture before writing the change notes. In r8, `.readyCard.arenaLobby` turned out to be the whole lobby rather than the side panel, and padding on the mode cards collided with their absolutely positioned emblems.
- Judges reading downscaled images misread pixel sizes (Opus read a 170px item as 125px). Tell Opus to measure against the 1440px original.
- Calibration after r7: the ×0.3 realism factor fits Sol (it stays flat after big structural rounds). Opus, Gemini and Qwen realize about ×0.5 of their estimates.
- Past 8.3, the judges grade what sits below the fold. A strong hero on top of a scrolling card grid still reads as "a dashboard attached to a game." Restyle the repeated grid items (Shop boxes, Help paper) rather than adding more hero detail.
- Flipping a dark page to paper hides any light-on-light text inside it, such as tier labels or FAQ answers. Crop every section of the page before writing the change notes.
- CSS effects under about 15% opacity, or rotations under about 4°, don't register at capture scale, and claiming them costs credibility (Opus −0.3 in r9). Verify each claim in a 100% crop before writing it in the change notes.
- `ERR_NETWORK_IO_SUSPENDED` and 30s timeouts in the release matrix mean the machine was busy or asleep. Re-run those tests alone before calling them regressions.
- The capture spec caps full-page height (now 4600px). If a judge says a section "disappeared," check the cap before blaming the layout.
- To capture old code (for example re-shooting an i0 screen), use a detached worktree at `392a05a^` and **change its Playwright port** (4173 → 4174). `reuseExistingServer` otherwise silently serves the main repo's dev server, which means current code.
- The settings-sheet shot needs the dialog to be visible plus ~2.5s, or it captures mid-fade (the i0 shot was blurred and was re-shot after run 1).
- Capture has 13 shots: `13-rankup` (added in run 2) starts a ranked round at `rankMmr: 798` (2 RR under Gold III) and clicks "Reveal Rank". i0 has no rank-up shot; the PR table shows "not captured".
- Check catalog scale before redrawing an asset: the "lost translucency" bubble was `shopImageScale: 250` cropping its rim, not the art.
- In the arena, `.arenaFloor` is a perspective plane: at rotateX(62deg) it collapses into a strip at the bottom. Use ~35deg with `top: 20%` so painted floor art is visible.
- `font: 800 11px var(--x, inherit)` is invalid (inherit can't sit inside a shorthand), so the whole declaration is dropped. Use separate font-weight/font-size.


## Run log
- 2026-11-11 run 1 (branch `game-feel-council`, PR #12): i0 Sol 6.6 / Terra 6.8 / Opus 6.4 → i1 7.1 / 6.8 / 6.5 (global frames, world, titles, ladder plaques, console switches). i2 7.3 / 7.0 / 7.2 (login title screen, illustrated Help, results ceremony, history climb, duels VS, ladder tabs). i3 7.4 / 7.0 / 7.1 (shop storefront, profile trophy cabinet, settings console, arena crowd). i4 7.7 / 7.2 / 7.5 (illustrated SVG item set, painted arena crowd, history tickets, settings ribbon/gold apply, fewer brackets).
  - Decision model added after i4. **Re-ran the council on i4 with the new brief** (DON'T BOTHER / PROTECT / estimates) before round 5. Build `i5-decisions.md` from those replies; it supersedes the plan below.
  - r5 (`07a487f`): painted arena stadium, Help 4-panel round strip and chapters, Duels fight card, Ladder metal plates, plus fixes for the bubble scale and the ticket notch. i5 Sol 7.8 / Terra 7.4 / Opus 8.0 (predicted 8.8 / 7.9 / 8.9).
  - Council changed after r5: Terra dropped, Opus to low effort, stop bar Sol ≥ 9.4 / Opus ≥ 9.
  - r6 (`dc3100a`): hardwood court in the arena and lobby, Profile character sheet, stadium theme previews in the Shop, Help ch.4–5 cards. i6 Sol 8.0 / Opus 8.0 (predicted ~8.1 / ~8.2). **Run 1 ended at the 6-round cap.** Total: i0 avg 6.6 → i6 avg 8.0.
- 2026-11-11 run 2 (same branch and PR #12): council is Sol (med), Opus 5 (low), Gemini 4 Argon (med) and Qwen3.8 Max (med). It starts with a baseline read of i6 (no PREVIOUS_DIR); rounds continue as i7, i8, …, up to 6 rounds (i12).
  - Baseline read of i6: Sol 8.0, Opus 7.8 (low), Gemini 8.3, Qwen 8.2. Gemini and Qwen both described real on-screen details, so they are reading the images. i7 decisions in `i7-decisions.md`.
  - r7 (`6a6f418`): stepped Ladder podium + standing rank plate, nav as framed bar (gold plaque tabs, labeled medallions, riveted player plate), Shop inspection stage + folder tabs + cabinet shelves, Armory 10-segment gauges, framed icon-cap inputs. i0/13-rankup copied from i6 (unchanged screen, per user). i7: Sol 8.0, Opus 8.1, Gemini 8.7, Qwen 8.5 (avg 8.33). All four judges flagged that the Armory gauges clipped the bottom cards.
  - r8 (`411f8ce`): fixed the Armory clipping; rank-up gets the real tier medal, a ribbon and medal sockets on the ladder; Shop booth (awning, counter, brighter stadium, wooden pedestal); History LED scoreboard; lobby mode cartridges; Help binder pages; podium side faces. i8: Sol 8.1, Opus 8.2, Gemini 8.8, Qwen 8.5 (avg 8.40). Every judge moved about +0.1; the remaining gap is below-the-fold grids.
  - r9 (`ae89232`): Shop items as boxed products (rarity-material frame, lid band, cellophane window, paper price tag); Help on paper with ink type; Login with the stadium behind and a competitor pass; Duels fight ticket; Profile trophy path; History placard and fixes. The capture cap was raised to 4600px. i9: Sol 8.2, Opus 7.9 (−0.3, because several effects were too faint to see), Gemini 8.8, Qwen 8.6 (avg 8.38).
  - r10 (`77c1912`, comment for i9 posted): Settings hardware console (rockers, faders, key caps, speaker-grille test button); Profile 4-dial gauge plates and a SCOUTING REPORT housing; Shop boxes with a printed rarity body, a 9px side face and stronger glare; Duels ticket print and wooden counter; History brass plaques; Help contents page on paper with mounted plates; fixed the S1 stamp clip, the double price and the locked-trophy bars. i10: Sol 8.2, Opus 8.3, Gemini **9.1** (first judge over its bar), Qwen 8.5 (avg 8.53). The comment is posted and the PR body updated.
  - r11 (`a6d501d`): Login seal on the pass header; Armory green instrument readout and cartridge cards; Ladder single control rail and brushed nameplates; Duels turbulence-grain wood counter; History plotted trend line and bevelled brass plaques; Profile stretched scouting report and continuous trophy shelf. i11: Sol 8.1, Opus 7.9 (−0.4; it could not see the lamp pool, token shadows or trophy spotlights, and the shelf sits ~170px below the trophies), Gemini 9.0, Qwen 8.4 (avg 8.35, down from 8.53). Predicted 8.35/8.5/9.2/8.7.
  - Lesson from r11: SVG turbulence "wood" at baseFrequency 0.0035×0.11 reads as smeared motion blur to 3 of 4 judges. Illustrated planks with joints beat procedural noise. Stretching a container to fill a dead zone only moves the empty space inside it.
  - r12 (`a8a5960`): Profile form column chart and screwed sub-plaques, with the trophies on the shelf; Duels illustrated SVG planks and lamp pool; Ladder engraved stat and rating recesses with grain-free nameplates; History full-width chart bezel (placard and switches in the header, a three-label score axis); Play mode plaques with medallions and an LED record. i12: Sol 8.0, Opus 8.4 (+0.5), Gemini 9.1, Qwen 8.6 (avg 8.53, back to the i10 high). Predicted 8.3/8.3/9.1/8.6. **Run 2 ended at the 6-round cap; the stop rule was not met.** Run 2 total: baseline avg 8.08 → i12 avg 8.53.
  - Lesson from r12: replacing a dead zone with real content (a chart) recovered all the r11 losses. Effects judged "faint" again: radial lamp pools, soft directional drop-shadows, contact-shadow ellipses and 1–2px engraving bevels. A small SVG tile (440px) repeats visibly, so use a tile wider than the surface. Sol plateaus around 8.0–8.2 on surface treatment; its asks are now structural: a hero target apparatus, distinct competitor art, and fewer nested frames.
  - Next-run candidates (from the i12 replies): Armory right column as a physical bench (Opus +0.5); Shop storefront structure (Opus +0.4); Play target apparatus (Sol +0.3); distinct competitor illustrations (Sol +0.3); display typeface (Opus +0.3); bolted chassis for the Play loadout bar, Duels filters and Ladder controls (Gemini); a filled Achievement Constellation band (Qwen).
  - **Run 2 analysis** (user asked, 2026-11-11, that no round go backwards or sideways: each should gain +0.1 to +0.2).
    - The average by round was 8.08 → 8.33 → 8.40 → 8.38 → 8.53 → 8.35 → 8.53.
    - **Rounds that gained:**
      - r7 (+0.25): nav bar on every screen, Ladder podium, Shop stage.
      - r10 (+0.15): the Settings console rebuilt end to end, the #1 for three judges.
      - r12 (+0.18): a dead zone replaced with a real chart.
      - Each one was a **whole-composition rebuild, or a change visible on every screen**.
    - **Rounds that lost:**
      - r9 (−0.03): overclaims, and the S1 stamp clipped.
      - r11 (−0.17): turbulence wood read as a smear, and a stretched empty panel.
      - Each one shipped **one visible regression plus overclaims**.
    - Predictions ran 0.1–0.3 high every round, because nothing tied an estimate to a screen.
    - Sol's score drifted ±0.1 with no relation to the work done.
    - Scoring v2 (above) is the response: anchored per-screen scores, arithmetic picks to a +0.15 target, an ACCEPT checklist, a blind A/B gate and a per-screen ratchet.
  - **Gap map from i12 (where the judges overlap; use it to seed run 3's picks after the anchor read):**
    - **Duels (all four):**
      - Sol: a counter in perspective with a back edge and a lamp fixture.
      - Opus: the incoming challenge as a ticket pinned on that counter.
      - Gemini: the filter pills in a recessed track, and "1 INCOMING" as a lamp.
      - Qwen: no visible tiling (one tile wider than the counter) and a real falloff to dark.
      - All four are one rebuild of the screen as a single tabletop scene.
    - **Profile (three):**
      - Sol: fewer nested frames, and distinct trophy silhouettes and materials.
      - Opus: fold the four gauges into the competitor card so the page is one object.
      - Qwen: fill or shrink the dead Achievement Constellation band, and thicker form bars.
      - All three are one "competitor dossier" rebuild.
    - **Play (two, both a #1):**
      - Sol: an illustrated target apparatus with a stand, mounting and floor shadow, replacing the floating ring.
      - Gemini: a bolted chassis for the loadout bar.
      - Sol is the bottleneck, so this is the first pick.
    - **Armory (three):**
      - Opus #1: the right column as a physical bench.
      - Gemini: the Unlock Wall and Workshop help as a hatch and tab.
      - Qwen: a real bug, "No runs yet" colliding with Compare in bays 2/3. Fix it regardless.
    - **Asks across both runs that were never fully built:**
      - a display typeface (Opus, every run);
      - distinct illustrated competitors (Sol);
      - the Shop storefront (Opus).
      - Sol only ever moved on **new illustration**: r4's SVG item set gave +0.3. Use the `skins.py` approach for competitor portraits and the target apparatus, not CSS effects.
  - **NEXT = run 3.** Start with an anchor read of i12 under brief v2 (no PREVIOUS_SCORES), then round 13 from that anchor, using the gap map above.
  - Earlier plan, done in r12: **NEXT = round 12, the final round (cap).** Gemini and Qwen stay at medium but open trimmed images (see Council). Picks by consensus:
    - (1) Profile: rebuild the scouting report as a tight instrument panel (recessed tray for the form coins, framed sub-plaques for Top Build and Nearest Achievement) at natural height, and fill the column another way; trophies stand on the shelf with contact shadows (all four).
    - (2) Duels: replace the turbulence wood with illustrated planks (joints, restrained grain), a visible lamp falloff and directional token shadows (Sol, Opus, Qwen).
    - (3) Ladder: engrave the four stat cells and the rating into the row plate; quieter nameplate grain for legibility (Sol, Opus, Qwen, Gemini).
    - (4) History: integrate the trajectory placard and mode filters into the chart bezel, add score-axis labels; quieter plaque grain behind small text (all four).
    - (5) Play right panel: mode cards as illustrated plaques and the record as a scoreboard (Opus +0.4).
    - Optional: Armory cartridges with larger part art and casing depth (Sol); Armory bays and toolbar as physical tabs (Gemini).
  - Plan carried over from run 1 (merge it with the baseline read): both judges' consensus is the shared shell: "the world stops at the court edge".
    1. Ladder and History on a physical substrate (banner wall or bracket board; a pinned ticket ledger), plus a podium with depth.
    2. A stadium control rail and nav plates instead of nested navy frames and the utility capsule.
    3. A characterful display face for titles and numerals.
    4. Shop: a large inspection stage for the equipped item, with compact shelves.
    5. Restrain the court's seams and stagger the joints (Sol).
    6. Restore Duels portrait presence, and add a trend cue to the Profile form coins.
    Opus asked for the Armory right rail as workbench parts, but Sol protects the Armory trade-offs: do it only as a material change and keep the trade-off readout.
  - Earlier plan (superseded): **NEXT = round 5 (2 rounds left in run 1).** Consensus plan: (1) Help → illustrated field manual: side chapter tabs, paper/metal pages, FAQ as pages, fewer small cards — biggest drag per Opus; (2) Ladder → dimensional winners' podium (stepped platforms, big portraits, tier crests) + rank plaques of varying weight, own row distinct, drop header row; (3) Arena → paint floor/rails/trusses (no cyan wireframe), add foreground element + haze; (4) Shop → featured legendary on a big pedestal above compact trays, rarity-specific card presentation; (5) Global display numeral face for hero numbers + condensed micro-label face (self-host via @fontsource; check package availability offline first); (6) Duels confrontation layout if time. Capture to i5, PREVIOUS_DIR=i4.
