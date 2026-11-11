"""Rewrite the ClickawayRSI PR description as a live summary.

usage: python update_pr_body.py <latest round N> <scores.json> > body.json
scores.json: {"i0": [sol, terra, opus], ...}; use null for a judge who sat a round out
(Terra is null from i6 on).

Produces {"body": ...} with: the process blurb, the full score table, and a
Baseline (i0) vs Latest (iN) table for every captured screen, so the whole
transformation is visible without comparing intermediate rounds.
"""
import json
import os
import sys

REPO = "QuinOG/ClickAway"
BRANCH = os.environ.get("RSI_BRANCH", "game-feel-council")
SHOTS_DIR = "docs/ui-polish/game-feel"

n = int(sys.argv[1])
scores = json.load(open(sys.argv[2], encoding="utf-8"))
latest = f"i{n}"
blob = f"https://github.com/{REPO}/blob/{BRANCH}/{SHOTS_DIR}"
tree = blob.replace("/blob/", "/tree/")

shots = sorted(f for f in os.listdir(os.path.join(SHOTS_DIR, latest)) if f.endswith(".png"))
score_rows = "\n".join(
    f"| {r}{' (baseline)' if r == 'i0' else ''}{' **latest**' if r == latest else ''} | "
    + " | ".join("—" if v is None else str(v) for v in vals)
    + f" | **{sum(v for v in vals if v is not None) / len([v for v in vals if v is not None]):.2f}** |"
    for r, vals in scores.items()
)
shot_rows = "\n".join(
    f"| **{s.split('-', 1)[1][:-4]}** | ![]({blob}/i0/{s}?raw=true) | ![]({blob}/{latest}/{s}?raw=true) |"
    for s in shots
)

body = f"""Council-driven polish run (ClickawayRSI) to move ClickAway from a SaaS-dashboard feel to an indie-game feel across the whole app.

**Process:** each round, judges rate 12 full-app screenshots against `docs/ui-polish/standards/`. Rounds 0–5 used GPT-6.1 Sol, GPT-6.1 Terra and Claude Opus 5. From round 6 the council is Sol plus Opus 5 at low effort; Terra was dropped because it largely duplicated Sol. Claude implements the highest-value fixes, recaptures, and repeats until the stop bar is met (now Sol ≥ 9.4 and Opus ≥ 9) or 6 rounds have run. Each round is its own commit; each round's PR comment has its scores, changes and before/after vs the previous round.

## Scores
| Round | Sol | Terra | Opus 5 | Average |
|---|---|---|---|---|
{score_rows}

## Total change: baseline (i0) → latest ({latest})
_This table is regenerated on every round, so it always compares the original app with the current one._

| Screen | Baseline (i0) | Latest ({latest}) |
|---|---|---|
{shot_rows}

All shots: [i0]({tree}/i0) · [{latest}]({tree}/{latest}) · change notes in `{SHOTS_DIR}/iN-changes.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)"""

json.dump({"body": body}, sys.stdout)
