"""Rewrite the ClickawayRSI PR description as a live summary.

usage: python update_pr_body.py <latest round N> <scores.json> > body.json
scores.json: {"i0": [sol, terra, opus, gemini, qwen], ...} (shorter lists are padded); use null for a judge who sat a round out
(Terra is null from i6 on).

Produces {"body": ...} with: the process blurb, the full score table, and a
Baseline (i0) vs Latest (iN) table for every captured screen, so the whole
transformation is visible without comparing intermediate rounds.
"""
import json
import os
import subprocess
import sys

REPO = "QuinOG/ClickAway"
BRANCH = os.environ.get("RSI_BRANCH") or subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
SHOTS_DIR = "docs/ui-polish/game-feel"

n = int(sys.argv[1])
scores = json.load(open(sys.argv[2], encoding="utf-8"))
latest = f"i{n}"
blob = f"https://github.com/{REPO}/blob/{BRANCH}/{SHOTS_DIR}"
tree = blob.replace("/blob/", "/tree/")

shots = sorted(f for f in os.listdir(os.path.join(SHOTS_DIR, latest)) if f.endswith(".png"))
JUDGES = ["Sol", "Terra", "Opus 5", "Gemini 4 Argon", "Qwen3.8 Max", "Grok 4.7"]  # scores.json lists follow this order
score_rows = "\n".join(
    f"| {r}{' (baseline)' if r == 'i0' else ''}{' **latest**' if r == latest else ''} | "
    + " | ".join("—" if v is None else str(v) for v in (vals + [None] * len(JUDGES))[:len(JUDGES)])
    + f" | **{sum(v for v in vals if v is not None) / len([v for v in vals if v is not None]):.2f}** |"
    for r, vals in scores.items()
)
def baseline_cell(s):
    # Screens added after i0 (e.g. 14-20 from i13) show their first capture as the baseline, used as the baseline.
    rounds = sorted((d for d in os.listdir(SHOTS_DIR) if d[:1] == "i" and d[1:].isdigit()), key=lambda d: int(d[1:]))
    first = next((r for r in rounds if os.path.exists(os.path.join(SHOTS_DIR, r, s))), None)
    if first is None:
        return "_not captured_"
    return f"![]({blob}/{first}/{s}?raw=true)"


shot_rows = "\n".join(
    f"| **{s.split('-', 1)[1][:-4]}** | " + baseline_cell(s) + f" | ![]({blob}/{latest}/{s}?raw=true) |"
    for s in shots
)

body = f"""Council-driven polish run (ClickawayRSI) to move ClickAway from a SaaS-dashboard feel to an indie-game feel across the whole app.

**Process:** each round, judges rate 12 full-app screenshots against `docs/ui-polish/standards/`. Rounds 0–5 used GPT-6.1 Sol, GPT-6.1 Terra and Claude Opus 5. Round 6 used Sol plus Opus 5 (low effort). From run 2 the council is Sol, Opus 5, Gemini 4 Argon and Qwen3.8 Max, all at medium reasoning. Claude implements the highest-value fixes, recaptures, and repeats until the stop bar is met (every judge ≥ 9, Sol ≥ 9.4) or 6 rounds have run. Each round is its own commit; each round's PR comment has its scores, changes and before/after vs the previous round.

## Scores
| Round | {" | ".join(JUDGES)} | Average |
|---|{"---|" * len(JUDGES)}---|
{score_rows}

## Total change: baseline (i0) → latest ({latest})
_This table is regenerated on every round, so it always compares the original app with the current one._

| Screen | Baseline (i0) | Latest ({latest}) |
|---|---|---|
{shot_rows}

All shots: [i0]({tree}/i0) · [{latest}]({tree}/{latest}) · change notes in `{SHOTS_DIR}/iN-changes.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)"""

json.dump({"body": body}, sys.stdout)
